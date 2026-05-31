import React, { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Lead } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  MessageSquare, 
  HelpCircle, 
  User, 
  Volume1, 
  Repeat, 
  Loader2 
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function SalesCopilot({ leads = [] }: { leads?: Lead[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for external toggle event from header nav
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('hunter-toggle-copilot', handleToggle);
    window.addEventListener('hunter-open-copilot', handleOpen);
    return () => {
      window.removeEventListener('hunter-toggle-copilot', handleToggle);
      window.removeEventListener('hunter-open-copilot', handleOpen);
    };
  }, []);
  // Persisted chat messages — timestamps revive from ISO strings on load
  const [rawMessages, setMessages] = useLocalStorage<ChatMessage[]>('hunter_copilot_messages', [
    {
      id: 'init',
      role: 'assistant',
      content: "Yo, I'm Bishop. Welcome to my workspace. I'm a developer and system architect behind projects like **AscendSME**, **Lumi**, **Hone**, and **AI Client Finder**. This Hub demonstrates how a platform can self-coordinate using a five-agent mesh to find, score, analyze, and convert local business leads. Ask me anything about my tools, USSD platforms, West African telecom APIs, or how the site memory works.",
      timestamp: new Date()
    }
  ]);
  // Ensure timestamps are Date objects (JSON.parse returns strings)
  const messages = rawMessages.map(m => ({ ...m, timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp }));
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice & Speech options
  const [isListening, setIsListening] = useState(false);
  const [isReadAloud, setIsReadAloud] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechUttRef = useRef<SpeechSynthesisUtterance | null>(null);

  // --- Virtualization/Windowing Helpers for Long Conversations ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  // Update container height when dimensions change (robust responsive scaling)
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Handle manual/programmatic scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Estimate dynamic heights of messages based on character/line metrics
  const getEstimatedHeight = (m: ChatMessage) => {
    const lines = m.content.split('\n').length;
    if (m.role === 'user') {
      return Math.max(56, 40 + lines * 18 + Math.min(80, m.content.length * 0.15));
    } else {
      // AI assistant responses typically include paragraph segments and inline action links/icons
      return Math.max(88, 56 + lines * 21 + Math.min(380, m.content.length * 0.28));
    }
  };

  // Compute heights & offsets memoized
  const itemHeights = React.useMemo(() => {
    return messages.map(m => getEstimatedHeight(m));
  }, [messages]);

  const { topPadding, bottomPadding, itemsToRender } = React.useMemo(() => {
    let currentTop = 0;
    const offsets: number[] = [];
    const itemHeightMap = itemHeights;
    
    for (let i = 0; i < messages.length; i++) {
      offsets.push(currentTop);
      currentTop += itemHeightMap[i] + 16; // 16px reflects space-y-4 gap
    }

    // Set buffer space (e.g. 500px above and below target viewport)
    const buffer = 500;
    const renderMin = Math.max(0, scrollTop - buffer);
    const renderMax = scrollTop + containerHeight + buffer;

    const visibleItems = [];
    let topPad = 0;
    let bottomPad = 0;

    for (let i = 0; i < messages.length; i++) {
      const itemTop = offsets[i];
      const itemHeight = itemHeightMap[i];
      const itemBottom = itemTop + itemHeight;

      if (itemBottom >= renderMin && itemTop <= renderMax) {
        visibleItems.push({
          message: messages[i],
          index: i,
          top: itemTop,
          height: itemHeight
        });
      } else if (itemTop < renderMin) {
        topPad += itemHeight + 16;
      } else {
        bottomPad += itemHeight + 16;
      }
    }

    return {
      topPadding: topPad,
      bottomPadding: bottomPad,
      itemsToRender: visibleItems
    };
  }, [messages, itemHeights, scrollTop, containerHeight]);
  // ---------------------------------------------------------------

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        triggerToastNotification("Listening... Speak directly into your microphone.", "info");
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (resultText) {
          setInputText((prev) => (prev ? `${prev} ${resultText}` : resultText));
          triggerToastNotification(`Captured vocal input: "${resultText}"`, "success");
        }
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          triggerToastNotification("Microphone access denied. Enable permissions in the address bar.", "error");
        } else {
          triggerToastNotification("Voice recognition ended or had lookup congestion.", "info");
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Trigger Toast helper by dispatching CustomEvent matching App.tsx listener
  const triggerToastNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    window.dispatchEvent(
      new CustomEvent('hunter-toast', {
        detail: { message, type }
      })
    );
  };

  // Speaks text aloud using SpeechSynthesis
  const speakText = (text: string) => {
    if (!window.speechSynthesis) {
      triggerToastNotification("Speech readout is not supported on this browser version.", "error");
      return;
    }

    // Stop current speaking
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Filter markdown chars for cleaner voice playback
    const cleanText = text
      .replace(/\*\*+/g, '')
      .replace(/\*+/g, '')
      .replace(/###+/g, '')
      .replace(/##+/g, '')
      .replace(/#+/g, '')
      .replace(/-\s+/g, '')
      .replace(/`+/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';

    // Try to find a warm, natural female/male voice if available
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => 
      v.name.includes("Google") || 
      v.name.includes("Natural") || 
      v.name.includes("Samantha")
    );
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechUttRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      triggerToastNotification("Web Speech API is not supported in this browser version or current container framing.", "error");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Stop anything currently speaking first
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Speech start failed", err);
        recognitionRef.current.stop();
      }
    }
  };

  // Stop current active readout
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Submits the query to Bishop's agent execution endpoint (real agentic pipeline)
  const handleSendMessage = async (textToSend?: string) => {
    const rawQuery = textToSend !== undefined ? textToSend : inputText;
    const query = rawQuery.trim();
    if (!query) return;

    if (textToSend === undefined) {
      setInputText('');
    }

    // Cancel any active SpeechSynthesis before submit
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const newUserMessage: ChatMessage = {
      id: `m-${Date.now()}-u`,
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    // Add a thinking message to show Bishop is working
    const thinkingId = `m-${Date.now()}-thinking`;
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: 'assistant',
      content: '🧠 **Bishop is analyzing your request and planning the workflow...**\n\n_Agent activity will appear in the Agent Log panel in real-time._',
      timestamp: new Date()
    }]);

    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: query, leads })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Bishop's agent execution failed.");
      }

      const data = await res.json();
      
      // Remove the thinking message
      setMessages(prev => prev.filter(m => m.id !== thinkingId));

      // Build response with tool call info and steps
      let assistantReply = data.response || "I completed the analysis but have no specific findings to report.";

      if (data.toolCalls > 0 || (data.steps && data.steps.length > 0)) {
        assistantReply += '\n\n';
        
        if (data.steps && data.steps.length > 0) {
          assistantReply += '📋 **Steps executed:**\n';
          data.steps.forEach((step: string) => {
            assistantReply += `\n${step}`;
          });
          assistantReply += '\n';
        }

        assistantReply += `\n⚡ **${data.toolCalls} tool calls** across the agent pipeline.`;
      }

      const newAssistantMessage: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newAssistantMessage]);

      // If speak responses toggled, read it out loud automatically
      if (isReadAloud) {
        speakText(assistantReply);
      }

      triggerToastNotification(`Bishop completed with ${data.toolCalls || 0} tool calls`, 'success');

    } catch (err: any) {
      console.error(err);
      
      // Remove thinking message on error
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
      
      triggerToastNotification(err.message || "An error occurred with Bishop's agent execution.", "error");
      
      setMessages(prev => [...prev, {
        id: `m-${Date.now()}-err`,
        role: 'assistant',
        content: "🚨 **Bishop encountered an error**: " + (err.message || "Agent execution failed. Please try again."),
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick prompt triggers — now agentic actions for Bishop
  const quickSearches = [
    { title: '🚀 Project Portfolio', prompt: 'Tell me about the projects you have worked on — AscendSME, Lumi, Hone, and AI Client Finder.' },
    { title: '🔍 Find Leads', prompt: 'Search for 5 dentists in Accra without websites and score them.' },
    { title: '📊 CRM Stats', prompt: 'Get me the current CRM statistics and tell me which leads are the highest priority.' },
    { title: '🏆 Top Leads', prompt: 'List my top 3 highest-opportunity leads and generate pitches for them.' },
    { title: '📈 Run Audit', prompt: 'Run a full pipeline audit on all leads and give me a quality report.' }
  ];

  return (
    <>
      {/* Slide-Up Collapsible AI Panel — opened via nav 'Ask Bishop' button */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="sales-copilot-chatbox"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 right-0 left-0 sm:bottom-24 sm:right-6 sm:left-auto z-50 w-full sm:w-[420px] sm:max-w-[420px] h-[85vh] sm:h-[580px] bg-[#0d0d10] border-t sm:border border-zinc-800/80 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-slide-up"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">BISHOP'S WORKSPACE</h3>
                  <p className="text-[9px] text-zinc-400 font-mono leading-none">Developer & System Architect</p>
                </div>
              </div>

              {/* Speech read-aloud controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsReadAloud(!isReadAloud);
                    if (isReadAloud) stopSpeaking();
                    triggerToastNotification(
                      !isReadAloud 
                        ? "Vocal Read Aloud activated. Responses will play dynamically." 
                        : "Vocal Read Aloud deactivated.", 
                      "success"
                    );
                  }}
                  title={isReadAloud ? "Mute automatic read-aloud" : "Turn on automatic read-aloud"}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isReadAloud 
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                      : 'bg-zinc-800 border-zinc-700/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  {isReadAloud ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" />
                  )}
                </button>

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="p-1.5 rounded-lg bg-rose-600/20 border border-rose-500/50 text-rose-400 hover:bg-rose-600/30 font-mono text-[9px] px-2 font-bold cursor-pointer"
                  >
                    STOP VOICE
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    stopSpeaking();
                  }}
                  className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Conversation Core Body with Windowed Virtualization */}
            <div 
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 scroll-smooth overscroll-y-contain"
              style={{ overscrollBehaviorY: 'contain' }}
            >
              <div style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }} className="space-y-4">
                {itemsToRender.map(({ message: m }) => (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role !== 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-[10px] font-mono">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl p-3 border text-xs leading-relaxed overflow-x-auto relative group ${
                        m.role === 'user'
                          ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tl-none'
                      }`}
                    >
                      {/* Render standard paragraph structures with bold highlights simply */}
                      <div className="space-y-1.5 whitespace-pre-wrap select-text selection:bg-indigo-400/30">
                        {m.content.split('\n').map((line, idx) => {
                          // Check for bullet lines
                          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim());
                          // Simple parser for bold **text**
                          let contentToRender = line;
                          const boldRegex = /\*\*(.*?)\*\*/g;
                          const parts = [];
                          let lastIdx = 0;
                          let match;

                          while ((match = boldRegex.exec(line)) !== null) {
                            if (match.index > lastIdx) {
                              parts.push(contentToRender.substring(lastIdx, match.index));
                            }
                            parts.push(
                              <strong key={match.index} className="text-yellow-200 font-bold">
                                {match[1]}
                              </strong>
                            );
                            lastIdx = boldRegex.lastIndex;
                          }
                          if (lastIdx < line.length) {
                            parts.push(contentToRender.substring(lastIdx));
                          }

                          return (
                            <p 
                              key={idx} 
                              className={`${isBullet ? 'pl-3.5 relative' : ''} ${line.startsWith('###') ? 'text-sm font-bold text-indigo-300 mt-2 border-b border-zinc-850 pb-0.5' : ''}`}
                            >
                              {isBullet && <span className="absolute left-0 text-indigo-400 font-bold">•</span>}
                              {parts.length > 0 ? parts : line}
                            </p>
                          );
                        })}
                      </div>

                      {m.role === 'assistant' && (
                        <div className="absolute right-2 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                          <button
                            onClick={() => speakText(m.content)}
                            title="Read this specific reply aloud"
                            className="p-1 rounded bg-[#18181b] border border-zinc-800 text-zinc-400 hover:text-indigo-400 text-[10px]"
                          >
                            <Volume1 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Simulated Loading Indicator */}
              {isLoading && (
                <div className="flex gap-2.5 justify-start mt-4">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center shrink-0">
                    <Loader2 className="h-4.5 w-4.5 text-indigo-400 animate-spin" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-zinc-400 flex items-center gap-2 max-w-[80%]">
                    <span>AI Copilot is formulating outreach blueprint...</span>
                  </div>
                </div>
              )}

              {/* Initial Quick Suggestion Prompt Chips */}
              {messages.length === 1 && !isLoading && (
                <div className="space-y-2 pt-3 border-t border-zinc-900 mt-4">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono flex items-center gap-1">
                    <HelpCircle className="h-3 w-3 text-indigo-400" /> Quick Queries — Projects & Platform:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {quickSearches.map((qs, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(qs.prompt)}
                        className="p-2 text-left bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-xl transition-all cursor-pointer"
                      >
                        <p className="text-[10px] font-bold text-zinc-300 truncate font-mono">{qs.title}</p>
                        <p className="text-[8px] text-zinc-500 mt-0.5 truncate">Send instant outreach template</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Mic and Text Composer Box */}
            <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 p-4 space-y-2">
              {/* Mic action indicator sound bars while recording */}
              {isListening && (
                <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/40 p-2 rounded-xl text-xs text-blue-300">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wide">Recording Voice... Speak clearly</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="w-1 h-3 bg-blue-400 animate-[bounce_0.6s_infinite_100ms]" />
                    <div className="w-1 h-4 bg-blue-400 animate-[bounce_0.6s_infinite_200ms]" />
                    <div className="w-1 h-2 bg-blue-400 animate-[bounce_0.6s_infinite_300ms]" />
                    <div className="w-1 h-5 bg-blue-400 animate-[bounce_0.6s_infinite_400ms]" />
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Input Trigger Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Stop vocal listening" : "Speak text via microphone"}
                  className={`p-3.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                    isListening
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-zinc-800 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500'
                  }`}
                >
                  {isListening ? (
                    <Mic className="h-4.5 w-4.5" />
                  ) : (
                    <Mic className="h-4.5 w-4.5 text-indigo-400" />
                  )}
                </button>

                {/* Direct Text Composition field */}
                <input
                  type="text"
                  placeholder={isListening ? "Listening silently..." : "Message Bishop..."}
                  value={inputText}
                  disabled={isListening}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 text-xs px-3 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80 select-text font-sans"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-3.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100 transition-all cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <div className="flex justify-between items-center px-1 text-[8px] text-zinc-600 font-mono">
                <span>Supports natural voice speech inputs</span>
                <span>Powered by Gemini • Realtime</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
