import { useState, useEffect } from 'react';
import Header from './components/Header';
import DiscoveryEngine from './components/DiscoveryEngine';
import CrmPipeline from './components/CrmPipeline';
import AnalyticsPanel from './components/AnalyticsPanel';
import AgentDashboard from './components/AgentDashboard';
import LeadSidePanel from './components/LeadSidePanel';
import LaunchVideoPlayer from './components/LaunchVideo';
import ProductLanding from './components/ProductLanding';
import NeuralFlowHero from './components/NeuralFlowHero';
import AgentProcessFlow from './components/AgentProcessFlow';
import AgentLogPanel from './components/AgentLogPanel';
import SalesCopilot from './components/SalesCopilot';
import { useAuth as useClerkAuth, SignInButton, SignUpButton } from '@clerk/react';
import { hasClerk } from './clerkConfig';
import { Lead } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWebSocket } from './hooks/useWebSocket';
import { Sparkles, CalendarRange, Target, AlertCircle, CheckCircle2, Info, X, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useLocalStorage<'guide' | 'discovery' | 'crm' | 'analytics' | 'agents'>('hunter_active_tab', 'guide');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error'; id: number } | null>(null);

  // Initialize real-time WebSocket connection for agent log streaming
  const wsEvents = useWebSocket();

  // Set up real-time toast notifications listener
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: 'success' | 'info' | 'error' }>;
      if (customEvent.detail) {
        setToast({
          message: customEvent.detail.message,
          type: customEvent.detail.type || 'info',
          id: Date.now()
        });
      }
    };
    window.addEventListener('hunter-toast', handleToast);
    return () => window.removeEventListener('hunter-toast', handleToast);
  }, []);

  // Listen for 'hunter-open-dashboard' event from pipeline auditor
  useEffect(() => {
    const handler = () => setActiveTab('agents');
    window.addEventListener('hunter-open-dashboard', handler);
    return () => window.removeEventListener('hunter-open-dashboard', handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type, id: Date.now() });
  };
  
  // Clerk auth state (drives sign-in gating). Per-user data is handled on the
  // server via the Clerk session token; the client always uses the Express API.
  const { isSignedIn, isLoaded } = useClerkAuth();

  // Local CRM leads loaded from offline server database (persisted in localStorage)
  const [localLeads, setLocalLeads] = useLocalStorage<Lead[]>('hunter_local_leads', []);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Compute active leads list (server is the source of truth, per-user via Clerk token)
  const crmLeads = localLeads;

  // Funnel gating: the in-app workspace requires sign-in; Home/Discover stay open.
  const requiresAuth = hasClerk && isLoaded && !isSignedIn &&
    (activeTab === 'crm' || activeTab === 'analytics' || activeTab === 'agents');
  
  // Refresh local CRM list from database
  const loadCrmLeads = async () => {
    try {
      const response = await fetch('/api/crm/leads');
      if (response.ok) {
        const data = await response.json();
        setLocalLeads(data || []);
      } else {
        throw new Error("Could not retrieve CRM leads list.");
      }
    } catch (err: any) {
      setGlobalError(err.message || "Endpoint error connecting to backend service.");
    }
  };

  useEffect(() => {
    loadCrmLeads();
  }, []);


  // Set up real-time WebSocket syncing for pipeline state changes across devices/sessions
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: any;
    let isMounted = true;

    const connect = () => {
      // Formulate a dynamic WebSocket URL matching current browser location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      console.log('Establishing CRM real-time WebSocket connection to:', wsUrl);
      
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('CRM real-time event received:', message);

          if (!isMounted) return;

          switch (message.type) {
            case 'lead_created':
              setLocalLeads((prev) => {
                // Idempotent guard: avoid double appending if already in list
                if (prev.some(l => l.id === message.lead.id)) {
                  return prev;
                }
                return [...prev, message.lead];
              });
              break;

            case 'lead_updated':
              setLocalLeads((prev) => prev.map((item) => (item.id === message.lead.id ? message.lead : item)));
              // Sync active drawer dynamically if the user is looking at this exact lead
              setSelectedLead((curr) => {
                if (curr && curr.id === message.lead.id) {
                  return message.lead;
                }
                return curr;
              });
              break;

            case 'lead_deleted':
              setLocalLeads((prev) => prev.filter((item) => item.id !== message.id));
              // Close active drawer dynamically if the user is looking at the deleted lead
              setSelectedLead((curr) => {
                if (curr && curr.id === message.id) {
                  return null;
                }
                return curr;
              });
              break;

            case 'leads_updated':
              // An agent run (Bishop) mutated the pipeline server-side — refresh from source.
              loadCrmLeads();
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket real-time frame:', err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        console.warn('CRM real-time WebSocket connection closed. Relinking in 5 seconds...');
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('CRM real-time WebSocket encountered an error:', error);
      };
    };

    connect();

    // Send gentle ping frames to keep standard Cloud Run / reverse-proxy connections from idling out
    const pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null; // Prevent reconnect loops on unmount
        ws.close();
      }
    };
  }, []);

  // Save new prospect to CRM database
  const saveLeadToCrm = async (newLead: Lead): Promise<boolean> => {
    // Funnel: require sign-in to persist to a private pipeline.
    if (hasClerk && isLoaded && !isSignedIn) {
      triggerToast('Sign in to save leads to your pipeline.', 'info');
      (window as any).Clerk?.openSignIn?.();
      return false;
    }

    try {
      const response = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to commit prospect card.");
      }
      
      const addedLead = await response.json();
      setLocalLeads((prev) => [...prev, addedLead]);
      triggerToast(`${newLead.name} successfully saved to client pipeline.`, 'success');
      return true;
    } catch (err: any) {
      triggerToast(err.message || "An error occurred while saving the lead.", 'error');
      return false;
    }
  };

  // Update CRM lead details (notes, tags, analysis, statuses)
  const handleUpdateCrmLead = async (updatedLead: Lead) => {
    // Maintain opened state drawer sync
    if (selectedLead && selectedLead.id === updatedLead.id) {
      setSelectedLead(updatedLead);
    }

    // Persist via the Express API (per-user on the server via the Clerk token).
    setLocalLeads((prev) => prev.map((item) => (item.id === updatedLead.id ? updatedLead : item)));
    try {
      await fetch(`/api/crm/leads/${updatedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead),
      });
    } catch (error) {
      console.error("Failed to sync updated lead state on Express database:", error);
    }
  };

  // Modify Pipeline column state quickly
  const handleUpdateLeadStatus = async (id: string, nextStatus: Lead['status']) => {
    const lead = crmLeads.find(l => l.id === id);
    if (!lead) return;

    const updated = { ...lead, status: nextStatus };

    // Persist via the Express API (per-user on the server via the Clerk token).
    setLocalLeads((prev) => prev.map((item) => (item.id === id ? updated : item)));
    try {
      await fetch(`/api/crm/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (error) {
      console.error("Failed to persist lead status transition:", error);
    }
  };

  // Delete lead
  const handleDeleteCrmLead = async (id: string) => {
    try {
      const response = await fetch(`/api/crm/leads/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setLocalLeads((prev) => prev.filter((item) => item.id !== id));
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead(null);
        }
      }
    } catch (err) {
      console.error("Delete call failed:", err);
    }
  };

  // Track savedNames to block duplicates in user search listings
  const savedLeadNames = crmLeads.map((item) => item.name);

  return (
    <div id="hunter-app-viewport" className="min-h-screen cine-shell font-sans text-zinc-200 antialiased selection:bg-blue-600/30 selection:text-blue-100">
      
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        crmCount={crmLeads.length}
        onOpenChat={() => window.dispatchEvent(new CustomEvent('hunter-toggle-copilot'))}
      />

      {activeTab === 'guide' ? (
        <div className="relative z-10">
          {/* Full-screen cinematic hero — scroll down to explore */}
          <NeuralFlowHero onScrollDown={() => {
            document.getElementById('agent-process-flow')?.scrollIntoView({ behavior: 'smooth' });
          }} />
          {/* Animated 5-agent workflow infographic */}
          <AgentProcessFlow onNavigate={(tab) => setActiveTab(tab)} />
          {/* Interactive product demo, simulator, pricing */}
          <ProductLanding
            onStartApp={() => setActiveTab('discovery')}
            isFirebaseConfigured={false}
            onConnectDatabase={() => {
              if (hasClerk) (window as any).Clerk?.openSignIn?.();
            }}
          />
        </div>
      ) : (
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 dark-scrollbar">

          {globalError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-950/30 border border-amber-500/25 p-4 text-xs text-amber-200 backdrop-blur-sm">
              <AlertCircle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">System Analytics Status</p>
                <p className="mt-0.5 text-amber-200/70">{globalError}</p>
              </div>
            </div>
          )}

          {/* Tab Layout Switching content */}
          <div id="saas-main-section">
            {requiresAuth ? (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                <div className="glass-card rounded-2xl p-8 max-w-sm">
                  <h2 className="text-xl font-bold font-display text-white">Sign in to continue</h2>
                  <p className="text-sm text-zinc-400 mt-2 mb-5">Your pipeline, analytics, and agents are private to your account. Sign in or create a free account to access them.</p>
                  <div className="flex items-center justify-center gap-2.5">
                    <SignInButton mode="modal">
                      <button className="rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 cursor-pointer">Sign In</button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 cursor-pointer shadow-lg shadow-blue-600/20">Create Account</button>
                    </SignUpButton>
                  </div>
                </div>
              </div>
            ) : (
            <>
            {activeTab === 'discovery' && (
              <DiscoveryEngine
                onSaveLead={saveLeadToCrm}
                savedLeadNames={savedLeadNames}
                onInspectLead={setSelectedLead}
                crmLeads={crmLeads}
                activeLeadId={selectedLead?.id}
              />
            )}

            {activeTab === 'crm' && (
              <CrmPipeline
                leads={crmLeads}
                onUpdateStatus={handleUpdateLeadStatus}
                onSelectLead={setSelectedLead}
                onDeleteLead={handleDeleteCrmLead}
                onAddLead={saveLeadToCrm}
                onUpdateLead={handleUpdateCrmLead}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsPanel
                leads={crmLeads}
              />
            )}

            {activeTab === 'agents' && (
              <AgentDashboard
                crmLeads={crmLeads}
                onNavigate={(tab) => setActiveTab(tab as 'guide' | 'discovery' | 'crm' | 'analytics' | 'agents')}
              />
            )}
            </>
            )}
          </div>

          {/* 💌 Integrated Compact Attribution Footer */}
          <footer className="mt-16 py-8 border-t border-white/10 text-center">
            <p className="text-zinc-300 text-[10.5px] font-bold tracking-widest uppercase font-sans">
              Built with ❤️ by <span className="neon-text font-extrabold hover:underline">Bamidele Tewogbade</span>
            </p>
            <div className="flex justify-center items-center gap-3.5 mt-2.5 text-[10px] font-semibold text-zinc-500 font-sans">
              <a href="mailto:bishoptewogbade@gmail.com" className="hover:text-blue-400 transition-colors">bishoptewogbade@gmail.com</a>
              <span className="text-zinc-700">•</span>
              <a href="https://twitter.com/btewogbade" target="_blank" rel="noreferrer" className="hover:text-sky-400 transition-colors">Twitter</a>
              <span className="text-zinc-700">•</span>
              <a href="https://linkedin.com/in/btewogbade" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors">LinkedIn</a>
            </div>
          </footer>
        </main>
      )}

      {/* Agent Log Panel floating overlay */}
      <AgentLogPanel />

      {/* Side drawer detail overlays */}
      {selectedLead && (
        <>
          {/* Overlay clicking backdrop triggers close */}
          <div
            onClick={() => setSelectedLead(null)}
            className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm touch-none"
          />
          <LeadSidePanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdateLead={handleUpdateCrmLead}
            onDeleteLead={crmLeads.some(l => l.id === selectedLead.id) ? handleDeleteCrmLead : undefined}
          />
          {/* Mobile swipe indicator for side panel */}
          {selectedLead && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:hidden flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full px-3 py-1.5 shadow-lg pointer-events-none">
              <div className="w-6 h-0.5 bg-zinc-600 rounded-full" />
              <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Swipe to close</span>
              <div className="w-6 h-0.5 bg-zinc-600 rounded-full" />
            </div>
          )}
        </>
      )}

      {/* Absolute Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-4 right-4 left-4 sm:top-6 sm:right-6 sm:left-auto z-50 max-w-sm w-auto sm:w-full p-4 rounded-xl border shadow-2xl bg-[#0c0c0e] border-zinc-800 flex items-start gap-3 text-white"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="h-4.5 w-4.5 text-rose-400" />
              ) : (
                <Info className="h-4.5 w-4.5 text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest leading-none">
                {toast.type === 'success' ? 'SYSTEM SUCCESS' : toast.type === 'error' ? 'CRITICAL ERROR' : 'SYSTEM NOTICE'}
              </p>
              <p className="text-[11px] text-zinc-200 mt-1.5 leading-normal">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded bg-[#18181B] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Floating AI Sales Copilot Agent widget */}
      {/* Also toggled via Header 'Ask Bishop' button */}
      <SalesCopilot />

      {/* Remotion-Powered Video Launch Tour Overlay */}
      <LaunchVideoPlayer
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </div>
  );
}
