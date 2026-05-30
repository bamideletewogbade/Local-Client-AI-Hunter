import React, { useRef, useState, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from 'remotion';
import { 
  Sparkles, CalendarRange, Search, Download, Play, Pause, RotateCcw, 
  Settings, Check, Compass, ArrowRight, ArrowLeft, Filter, RefreshCw,
  MapPin, Target as TargetIcon, Send
} from 'lucide-react';

// ==========================================================
// REMOTION SUB-COMPONENTS & SCENES FOR THE LAUNCH VIDEO
// ==========================================================

// 1. Beautiful drawn pointer arrow with a pulsing hotspot bubble
function FeaturePointerArrow({ 
  startFrame, 
  arrowPath = "M 10,105 C 50,45 130,15 220,50", 
  label = "New Feature Highlighted!", 
  badgeColor = "text-yellow-450 border-yellow-500/30 bg-yellow-950/20"
}: { 
  startFrame: number; 
  arrowPath?: string; 
  label: string; 
  badgeColor?: string;
}) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps: config.fps,
    config: { damping: 14 }
  });

  const arrowOpacity = interpolate(frame - startFrame, [0, 8, 40, 50], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  if (frame < startFrame || frame > startFrame + 50) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30" style={{ opacity: arrowOpacity }}>
      {/* Curved pointing SVG line */}
      <svg className="absolute w-full h-full inset-0 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
        <path
          d={arrowPath}
          fill="none"
          stroke="#eab308"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="250"
          strokeDashoffset={250 * (1 - progress)}
        />
        {/* Draw arrowhead */}
        {progress > 0.85 && (
          <path
            d="M 220,50 L 205,42 M 220,50 L 210,65"
            fill="none"
            stroke="#eab308"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Pulsing Highlight Circle at arrowhead destination */}
      {progress > 0.7 && (
        <div 
          className="absolute h-8 w-8 rounded-full border border-yellow-400 bg-yellow-500/20 animate-ping"
          style={{
            left: '215px',
            top: '40px',
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}

      {/* Floating Info Badge pointing here */}
      <div 
        className={`absolute rounded-xl border px-3 py-2 text-[10px] font-mono leading-relaxed font-bold shadow-2xl flex items-center gap-2 ${badgeColor}`}
        style={{
          left: '12px',
          top: '120px',
          transform: `scale(${progress})`
        }}
      >
        <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse shrink-0" />
        <span>{label}</span>
      </div>
    </div>
  );
}

// 2. Scene: Title and Introduction Card
function SceneTitle() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps: config.fps,
    config: { damping: 12, stiffness: 100 }
  });

  const subTitleSpring = spring({
    frame: frame - 15,
    fps: config.fps,
    config: { damping: 14 }
  });

  const neonRingScale = interpolate(frame, [0, 120], [0.8, 1.25], {
    extrapolateRight: 'clamp'
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#09090B] relative overflow-hidden font-sans">
      {/* Background Animated Atmosphere */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[130px]"
        style={{ transform: `scale(${neonRingScale})` }}
      />
      
      {/* Floating Ring Decors */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <div className="border border-zinc-800 rounded-full w-[450px] h-[450px] animate-spin" style={{ animationDuration: '30s' }} />
        <div className="border border-dashed border-zinc-700 rounded-full w-[650px] h-[650px] absolute animate-spin" style={{ animationDuration: '60s', animationDirection: 'reverse' }} />
      </div>

      {/* Master Title */}
      <div className="text-center space-y-4 z-10 px-6">
        <div 
          className="h-12 w-12 rounded-xl bg-blue-600 shadow-xl shadow-blue-600/20 flex items-center justify-center mx-auto mb-5 border border-blue-400/30"
          style={{ transform: `scale(${titleSpring}) rotate(${interpolate(frame, [0, 60], [-10, 0])}deg)` }}
        >
          <Compass className="h-6 w-6 text-white" />
        </div>

        <h1 
          className="text-4xl font-black text-white tracking-widest font-sans uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400 select-none"
          style={{ transform: `scale(${titleSpring})` }}
        >
          ASCENDSME · LUMI · HONE · AI CLIENT FINDER
        </h1>

        <p 
          className="text-sm text-zinc-400 font-mono tracking-wider max-w-md mx-auto uppercase font-bold"
          style={{ opacity: subTitleSpring, transform: `translateY(${interpolate(frame - 15, [0, 30], [20, 0], { extrapolateLeft: 'clamp' })}px)` }}
        >
          Multi-Project Portfolio — Lead Intelligence & Automation
        </p>

        <div className="pt-8 flex justify-center gap-3">              <span className="text-[9px] font-mono rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 font-bold uppercase tracking-widest">
                🤖 AI Sales Agent Kit
              </span>
          <span className="text-[9px] font-mono rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1 font-bold uppercase tracking-widest">
            ⚡ Vite + Remotion
          </span>
        </div>
      </div>
    </div>
  );
}

// 3. Scene: Step 1 - Scanner Agent (Google Maps Discovery)
function SceneScanner() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const mapScale = spring({
    frame,
    fps: config.fps,
    config: { damping: 15 }
  });

  const cardsY = interpolate(frame, [15, 60], [100, 0], { extrapolateLeft: 'clamp' });

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#09090B] p-6 relative font-sans overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3 z-10">
        <div>
          <span className="text-[8.5px] font-mono text-emerald-400 uppercase tracking-widest font-bold">STEP 1 OF 5</span>
          <h2 className="text-sm font-black uppercase text-white tracking-wider">Scanner Agent — Find Leads</h2>
        </div>
        <div className="flex items-center gap-2 bg-[#0C0C0E] px-2.5 py-1 rounded border border-zinc-800">
          <Search className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono text-zinc-400 uppercase font-black">Scanning Google Maps...</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center mt-2">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
          {/* Left: Input form */}
          <div 
            className="flex-1 bg-[#0C0C0E] border border-zinc-800 rounded-xl p-4 space-y-3"
            style={{ transform: `scale(${mapScale})` }}
          >
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-zinc-500 uppercase font-bold tracking-widest">Enter City</label>
              <div className="flex items-center gap-1.5 bg-[#09090B] border border-zinc-800 rounded-lg px-2.5 py-2">
                <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
                <span className="text-[10px] text-white font-bold font-mono">London</span>
                <span className="text-[8px] text-zinc-500 ml-auto font-mono">UK</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-zinc-500 uppercase font-bold tracking-widest">Business Niche</label>
              <div className="flex items-center gap-1.5 bg-[#09090B] border border-zinc-800 rounded-lg px-2.5 py-2">
                <TargetIcon className="h-3 w-3 text-zinc-500 shrink-0" />
                <span className="text-[10px] text-white font-bold font-mono">Dentist</span>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
              <span className="text-[9px] font-mono text-emerald-400 font-bold">Scanning 127 businesses...</span>
            </div>
          </div>

          {/* Right: Results preview */}
          <div 
            className="flex-1 space-y-2 w-full"
            style={{ transform: `translateY(${cardsY}px)` }}
          >
            <div className="bg-[#0C0C0E] border border-zinc-800 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[10px] font-bold text-white">Harley Dental Center</h4>
                  <p className="text-[7px] text-zinc-500 font-mono">Cosmetic Dentistry</p>
                </div>
                <span className="text-[7px] bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded px-1 font-bold font-mono">NO WEBSITE</span>
              </div>
              <div className="flex items-center gap-2 text-[7px] text-zinc-500">
                <MapPin className="h-2.5 w-2.5" />
                <span>Oxford St, London</span>
                <span className="ml-auto">★ 4.2</span>
              </div>
            </div>
            <div className="bg-[#0C0C0E] border border-zinc-800 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[10px] font-bold text-white">Elite Dental Clinic</h4>
                  <p className="text-[7px] text-zinc-500 font-mono">Orthodontic Group</p>
                </div>
                <span className="text-[7px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1 font-bold font-mono">HAS WEBSITE</span>
              </div>
              <div className="flex items-center gap-2 text-[7px] text-zinc-500">
                <MapPin className="h-2.5 w-2.5" />
                <span>West End, London</span>
                <span className="ml-auto">★ 4.5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeaturePointerArrow 
        startFrame={40} 
        arrowPath="M 120,180 C 130,130 180,95 240,110" 
        label="Scanner scrapes Google Maps in real-time!" 
      />
    </div>
  );
}

// 4. Scene: Step 2 - Analyzer Agent (Digital Presence Audit)
function SceneAnalyzer() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const fadeIn = spring({
    frame: frame - 10,
    fps: config.fps,
    config: { damping: 14 }
  });

  const scoreSpring = spring({
    frame: frame - 30,
    fps: config.fps,
    config: { damping: 12 }
  });

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#09090B] p-6 relative font-sans overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3 z-10">
        <div>
          <span className="text-[8.5px] font-mono text-blue-400 uppercase tracking-widest font-bold">STEP 2 OF 5</span>
          <h2 className="text-sm font-black uppercase text-white tracking-wider">Analyzer Agent — Audit Digital Presence</h2>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      </div>

      <div className="flex-1 flex items-center justify-center mt-2" style={{ opacity: fadeIn }}>
        <div className="grid grid-cols-2 gap-3 max-w-md w-full">
          {/* Score gauge */}
          <div className="bg-[#0C0C0E] border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1f2937" strokeWidth="4" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#3b82f6" strokeWidth="4" 
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - 0.35 * scoreSpring)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <span className="text-lg font-bold font-mono text-white">{Math.round(35 * scoreSpring)}%</span>
            </div>
            <p className="text-[8px] text-zinc-500 font-mono mt-2 uppercase font-bold">Digital Score</p>
            <span className="text-[7px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded font-bold mt-1">CRITICAL</span>
          </div>

          {/* Audit findings */}
          <div className="bg-[#0C0C0E] border border-zinc-800 rounded-xl p-3 space-y-2" style={{ opacity: scoreSpring }}>
            <h4 className="text-[9px] font-bold text-white uppercase tracking-wider">Findings</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[8px]">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-zinc-300">No SSL certificate</span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px]">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-zinc-300">Not mobile optimized</span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px]">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-zinc-300">No Google Maps listing</span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-zinc-300">Active social media</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. Scene: Step 3 - Pitcher Agent (AI Pitch Generation)
function ScenePitcher() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const modalScale = spring({
    frame: frame - 20,
    fps: config.fps,
    config: { damping: 14 }
  });

  const textOpacity = interpolate(frame, [30, 75], [0, 1], { extrapolateLeft: 'clamp' });

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#09090B] p-6 relative font-sans overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
        <div>
          <span className="text-[8.5px] font-mono text-violet-400 uppercase tracking-widest font-bold">STEP 3 OF 5</span>
          <h2 className="text-sm font-black uppercase text-white tracking-wider">Pitcher Agent — AI Pitch Generation</h2>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center mt-2 relative">
        {/* Background card */}
        <div className="blur-[1px] opacity-30 bg-[#0C0C0E] border border-zinc-800 rounded-xl p-4 w-60 space-y-2 text-[9px]">
          <h5 className="font-bold text-white">Harley Dental</h5>
          <p className="text-zinc-500 font-mono leading-relaxed">Needs website redesign, mobile optimization, and local SEO.</p>
        </div>

        {/* AI pitch modal */}
        {frame >= 20 && (
          <div 
            className="absolute rounded-xl border border-violet-900/40 bg-[#0C0C0E] shadow-[0_0_35px_rgba(0,0,0,0.8)] max-w-sm w-10/12 overflow-hidden"
            style={{ transform: `scale(${modalScale})`, filter: 'drop-shadow(0 0 15px rgba(139,92,246,0.15))' }}
          >
            <div className="flex items-center justify-between bg-zinc-950 border-b border-zinc-850 px-3.5 py-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-violet-400 animate-pulse" />
                <span className="text-[9.5px] font-mono text-zinc-100 uppercase tracking-wider font-black">AI Pitch Generated</span>
              </div>
              <span className="text-[7.5px] bg-violet-500/10 text-violet-400 px-1.5 rounded uppercase font-bold border border-violet-500/20 font-mono scale-90">PERSONALIZED</span>
            </div>

            <div className="p-3.5 space-y-2.5" style={{ opacity: textOpacity }}>
              <div className="text-[9px] text-zinc-200 leading-relaxed font-sans space-y-2 border-l-2 border-violet-500/30 pl-2">
                <p><em>"Hi there, I noticed Harley Dental Center doesn't have a website yet. In today's digital world, 78% of patients search online before booking. We can build you a modern, mobile-friendly site with appointment booking starting at $0 down. Would you be open to a quick chat?"</em></p>
              </div>
              <div className="flex items-center gap-2 pt-1 text-[8px] text-zinc-500 font-mono">
                <span className="bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/20">WhatsApp</span>
                <span>Channel: Auto-selected</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <FeaturePointerArrow 
        startFrame={22} 
        arrowPath="M 235,135 C 210,135 150,115 150,125" 
        label="AI crafts personalized outreach messages!" 
        badgeColor="text-violet-400 border-violet-500/30 bg-violet-950/20"
      />
    </div>
  );
}

// 6. Scene: Step 4 - Converter Agent (CRM Pipeline)
function SceneConverter() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const slideFactor = spring({
    frame,
    fps: config.fps,
    config: { damping: 15 }
  });

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#09090B] p-6 relative font-sans overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3 z-10">
        <div>
          <span className="text-[8.5px] font-mono text-amber-400 uppercase tracking-widest font-bold">STEP 4 OF 5</span>
          <h2 className="text-sm font-black uppercase text-white tracking-wider">Converter Agent — CRM Pipeline</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1 mt-3 items-stretch relative">
        {/* Column 1 - New */}
        <div className="bg-[#0C0C0E]/50 border border-zinc-850 rounded-xl p-2 flex flex-col" style={{ transform: `scale(${slideFactor})` }}>
          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <span className="text-[7px] font-mono uppercase font-black text-white">🆕 New</span>
            <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 h-3.5 px-1 rounded flex items-center text-[7px]">2</span>
          </div>
          <div className="mt-1 bg-[#09090B] border border-zinc-850 rounded p-1.5 text-[7px]">
            <div className="text-white font-bold leading-none">Harley Dental</div>
            <p className="text-[6px] text-zinc-500 font-mono mt-0.5">No website</p>
          </div>
        </div>

        {/* Column 2 - Contacted */}
        <div className="bg-[#0C0C0E]/50 border border-zinc-850 rounded-xl p-2 flex flex-col" style={{ transform: `scale(${slideFactor})` }}>
          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <span className="text-[7px] font-mono uppercase font-black text-amber-400">🔄 Contacted</span>
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 h-3.5 px-1 rounded flex items-center text-[7px]">1</span>
          </div>
          <div className="mt-1 bg-[#09090B] border border-zinc-800 rounded p-1.5 text-[7px]">
            <div className="text-white font-bold leading-none flex items-center justify-between">
              <span>Elite Dental</span>
              <span className="text-[6px] bg-emerald-500/10 text-emerald-400 px-0.5 rounded">Sent</span>
            </div>
            <p className="text-[6px] text-zinc-500 font-mono mt-0.5">WhatsApp DM sent</p>
          </div>
        </div>

        {/* Column 3 - Interested / Won */}
        <div className="bg-[#0C0C0E]/50 border border-zinc-850 rounded-xl p-2 flex flex-col" style={{ transform: `scale(${slideFactor})` }}>
          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <span className="text-[7px] font-mono uppercase font-black text-emerald-400">🔥 Won</span>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 h-3.5 px-1 rounded flex items-center text-[7px]">1</span>
          </div>
          <div className="mt-1 bg-[#09090B] border border-zinc-800 rounded p-1.5 text-[7px]">
            <div className="text-white font-bold leading-none">Global Tech</div>
            <p className="text-[6px] text-zinc-500 font-mono mt-0.5">Contract signed: $3,400</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-2 flex items-center justify-between bg-[#0C0C0E] border border-zinc-800 rounded-lg px-3 py-1.5 text-[7px] font-mono">
        <span className="text-zinc-500">Pipeline Value:</span>
        <span className="text-emerald-400 font-bold">$8,900 projected</span>
        <span className="text-zinc-600">|</span>
        <span className="text-blue-400 font-bold">4 active deals</span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-500">25% conversion</span>
      </div>

      <FeaturePointerArrow 
        startFrame={20} 
        arrowPath="M 280,120 C 280,100 260,80 240,85" 
        label="Drag leads across stages to update status!" 
        badgeColor="text-amber-400 border-amber-500/30 bg-amber-950/20"
      />
    </div>
  );
}

// 7. Scene: Step 5 - Campaign & Outreach Automation
function SceneCampaign() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const compileProgress = spring({
    frame,
    fps: config.fps,
    config: { damping: 15 }
  });

  const checkScale = spring({
    frame: frame - 40,
    fps: config.fps,
    config: { damping: 10 }
  });

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#09090B] p-6 relative font-sans overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
        <div>
          <span className="text-[8.5px] font-mono text-emerald-400 uppercase tracking-widest font-bold">STEP 5 OF 5</span>
          <h2 className="text-sm font-black uppercase text-white tracking-wider">Automated Campaign Delivery</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-950/25 px-2.5 py-1 rounded border border-emerald-900/30">
          <Send className="h-3 w-3 text-emerald-400 animate-bounce" />
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">Auto-Send</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center space-y-3 relative">
        <div className="text-center font-mono space-y-1">
          <span className="text-[8px] text-zinc-500 tracking-wider">MULTI-CHANNEL CAMPAIGN PROGRESS</span>
          <div className="text-[10px] text-white font-bold font-mono">
            {compileProgress < 0.95 
              ? `Processing outreach queue: ${Math.round(compileProgress * 100)}%` 
              : 'ALL MESSAGES QUEUED & SCHEDULED'}
          </div>
        </div>

        <div className="w-[85%] border border-zinc-800 bg-[#0C0C0E] rounded-xl overflow-hidden p-2 shadow-2xl space-y-1">
          <div className="grid grid-cols-4 gap-2 bg-zinc-950 border-b border-zinc-850 p-1.5 rounded-lg text-[7px] font-mono text-zinc-500 font-bold uppercase">
            <span>Lead</span>
            <span>Channel</span>
            <span>Status</span>
            <span>Send On</span>
          </div>

          <div className="grid grid-cols-4 gap-2 p-1.5 rounded text-[7px] font-mono text-zinc-300 border border-zinc-900" style={{ opacity: compileProgress > 0.2 ? 1 : 0.15 }}>
            <span className="text-white font-bold">Harley Dental</span>
            <span className="text-emerald-400">WhatsApp</span>
            <span className="text-amber-400">Queued</span>
            <span className="text-zinc-400">Today 3pm</span>
          </div>

          <div className="grid grid-cols-4 gap-2 p-1.5 rounded text-[7px] font-mono text-zinc-300 border border-zinc-900" style={{ opacity: compileProgress > 0.45 ? 1 : 0.15 }}>
            <span className="text-white font-bold">Elite Dental</span>
            <span className="text-blue-400">Email</span>
            <span className="text-zinc-500">Scheduled</span>
            <span className="text-zinc-400">Tomorrow 10am</span>
          </div>

          <div className="grid grid-cols-4 gap-2 p-1.5 rounded text-[7px] font-mono text-zinc-300 border border-zinc-900" style={{ opacity: compileProgress > 0.7 ? 1 : 0.15 }}>
            <span className="text-white font-bold">Global Tech</span>
            <span className="text-violet-400">LinkedIn</span>
            <span className="text-emerald-400">✓ Sent</span>
            <span className="text-zinc-400">Complete</span>
          </div>

          {frame >= 40 && (
            <div 
              className="mt-2 p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-[8px] leading-relaxed text-emerald-400 flex items-center justify-between"
              style={{ transform: `scale(${checkScale})` }}
            >
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span>Campaign <strong>Q4 Outreach</strong> — 12 leads, 3 channels</span>
              </div>
              <span className="text-[7px] border border-emerald-500/25 px-1 py-0.5 rounded font-mono font-bold uppercase shrink-0">ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      <FeaturePointerArrow 
        startFrame={15} 
        arrowPath="M 230,140 C 270,140 290,120 290,90" 
        label="Set & forget — automated multi-channel sequences!" 
      />
    </div>
  );
}

// 8. Scene: Outro sleek branding card
function SceneOutro() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const outroSpring = spring({
    frame,
    fps: config.fps,
    config: { damping: 15 }
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#09090B] via-[#0C0C0E] to-[#050507] relative overflow-hidden font-sans text-center px-10">
      <div 
        className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]"
        style={{ transform: `scale(${interpolate(frame, [0, 100], [0.9, 1.3])})` }}
      />

      <div className="space-y-4 z-10 max-w-sm">
        <div 
          className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 border border-blue-400/20 shadow-lg shadow-blue-500/15"
          style={{ transform: `scale(${outroSpring})` }}
        >
          <Compass className="h-5 w-5 text-white" />
        </div>

        <h3 className="text-xl font-black uppercase tracking-wider text-white">READY TO SCALE YOUR LEADS?</h3>
        
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          Uncover prospects, review digital presence vulnerabilities, send outreach logs, and coordinate pipeline deals seamlessly.
        </p>

        <div className="pt-6 border-t border-zinc-850/60 mt-4 text-[9px] font-mono text-zinc-500 uppercase font-black tracking-wide">
          BUILD • ADAPT • OPTIMIZE
        </div>
      </div>
    </div>
  );
}

// THE CENTRAL REMOTION VIDEO COMPOSITION (600 frames = 20 seconds @ 30fps)
export function LaunchVideoComposition() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill className="bg-[#09090B] text-white overflow-hidden">
      {/* 0s - 4s (Frames 0 - 120): Intro */}
      {frame >= 0 && frame < 120 && <SceneTitle />}

      {/* 4s - 8s (Frames 120 - 240): Scanner Agent — Google Maps Discovery */}
      {frame >= 120 && frame < 240 && <SceneScanner />}

      {/* 8s - 12s (Frames 240 - 360): Analyzer Agent — Digital Presence Audit */}
      {frame >= 240 && frame < 360 && <SceneAnalyzer />}

      {/* 12s - 16s (Frames 360 - 480): Pitcher Agent — AI Pitch Generation */}
      {frame >= 360 && frame < 480 && <ScenePitcher />}

      {/* 16s - 20s (Frames 480 - 600): Converter + Campaign & Outro */}
      {frame >= 480 && frame <= 600 && (
        <>
          {frame < 540 ? <SceneConverter /> : frame < 570 ? <SceneCampaign /> : <SceneOutro />}
        </>
      )}
    </AbsoluteFill>
  );
}


// ==========================================================
// THE LAUNCH VIDEO PLAYER PANEL MODAL WINDOW (PRO PREVIEWER)
// ==========================================================

interface LaunchVideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAPTERS = [
  { id: 'intro', label: '01. Intro & Overview', startFrame: 0, description: 'Welcome to the project portfolio — AI prospecting toolkit' },
  { id: 'scanner', label: '02. Scanner Agent', startFrame: 120, description: 'Google Maps lead discovery & extraction' },
  { id: 'analyzer', label: '03. Analyzer Agent', startFrame: 240, description: 'Digital presence scoring & audit' },
  { id: 'pitcher', label: '04. Pitcher Agent', startFrame: 360, description: 'AI-powered personalized pitch generation' },
  { id: 'converter', label: '05. Converter + Campaigns', startFrame: 480, description: 'CRM pipeline & automated outreach' }
];

export default function LaunchVideoPlayer({ isOpen, onClose }: LaunchVideoPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Sync isplaying state changes with ref play loops
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        if (typeof frame === 'number') {
          setCurrentFrame(frame);
        }
        setIsPlaying(playerRef.current.isPlaying());
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlayToggle = () => {
    if (playerRef.current) {
      if (playerRef.current.isPlaying()) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleReset = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleJumpToChapter = (startFrame: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(startFrame);
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Identify current subtitle or Chapter stage text based on currentFrame position
  const getActiveChapterInfo = () => {
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (currentFrame >= CHAPTERS[i].startFrame) {
        return CHAPTERS[i];
      }
    }
    return CHAPTERS[0];
  };

  const activeChap = getActiveChapterInfo();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-[#09090B] shadow-[0_0_65px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col my-8 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar branding */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 bg-[#0C0C0E]/75">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center border border-blue-500/20 shadow-md">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-sans font-black text-white uppercase tracking-wider block">Remotion Production Canvas</span>
              <p className="text-[9px] font-mono text-zinc-500 uppercase font-black">20-Second Dynamic Product Launch Video Code</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[8.5px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest scale-95">
              Vite Pre-Rendered
            </span>
            <button
              id="remotion-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-all text-xs"
              title="Close Player"
            >
              Close Live Tour
            </button>
          </div>
        </div>

        {/* Dynamic Dual columns layout: Player on left, chapter indicators on right */}
        <div className="grid grid-cols-1 md:grid-cols-12 border-b border-zinc-850 bg-[#060608]">
          
          {/* Remotion Canvas Video player box */}
          <div className="col-span-1 md:col-span-8 p-6 flex flex-col justify-center items-center relative border-r border-zinc-900">
            {/* Cinematic simulated Monitor border frame */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-zinc-800 bg-zinc-950 shadow-2xl">
              <Player
                ref={playerRef}
                component={LaunchVideoComposition}
                durationInFrames={600}
                fps={30}
                compositionWidth={1280}
                compositionHeight={720}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls={false}
                loop={true}
              />

              {/* Glowing Overlay Indicator */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-[#0C0C0E]/90 px-2 py-1 rounded-md border border-zinc-850 text-[10px] font-mono select-none pointer-events-none text-zinc-300">
                <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-zinc-500'}`} />
                <span>FPS: 30</span>
                <span className="text-zinc-500">|</span>
                <span>Frame: {currentFrame}/600</span>
              </div>
            </div>

            {/* Custom Interactive Player Status Tool Bar */}
            <div className="w-full flex items-center justify-between mt-4 bg-[#0C0C0E]/95 border border-zinc-850 rounded-xl p-3 shadow-md gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayToggle}
                  className={`p-2 rounded-lg transition-all cursor-pointer border flex items-center justify-center ${isPlaying ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white' : 'bg-blue-600 border-blue-500/20 hover:bg-blue-500 text-white shadow-md'}`}
                  title={isPlaying ? "Pause Preview" : "Play Tour Composition"}
                >
                  {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-white stroke-none" />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  title="Restart video"
                >
                  <RotateCcw className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Progress track slider timeline */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[9.5px] font-mono text-zinc-500">0:{(Math.floor(currentFrame / 30)).toString().padStart(2, '0')}</span>
                <div 
                  className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-850/50 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = clickX / rect.width;
                    const targetFrame = Math.round(percent * 600);
                    if (playerRef.current) {
                      playerRef.current.seekTo(targetFrame);
                    }
                  }}
                >
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-blue-500 transition-all duration-100" 
                    style={{ width: `${(currentFrame / 600) * 100}%` }}
                  />
                </div>
                <span className="text-[9.5px] font-mono text-zinc-400 font-bold">0:20</span>
              </div>
            </div>
          </div>

          {"/* Dynamic Interactive Chapter Sidebar */"}
          <div className="col-span-1 md:col-span-4 p-5 flex flex-col justify-between bg-[#08080A]">
            <div className="space-y-4">
              <span className="text-[10px] font-sans font-black text-zinc-500 uppercase tracking-widest block border-b border-zinc-850 pb-2">
                Launch Chapter Guide
              </span>
              
              <div className="space-y-2">
                {CHAPTERS.map((chap) => {
                  const isActive = activeChap.id === chap.id;
                  return (
                    <button
                      key={chap.id}
                      onClick={() => handleJumpToChapter(chap.startFrame)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isActive 
                          ? 'bg-blue-950/20 text-blue-400 border-blue-900/60 shadow-lg' 
                          : 'bg-zinc-950/40 text-zinc-400 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-sans font-bold leading-none ${isActive ? 'text-blue-400' : 'text-zinc-300'}`}>
                          {chap.label}
                        </span>
                        {isActive && (
                          <span className="h-3.5 w-3.5 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[10px] scale-90 text-blue-400 font-bold animate-pulse">
                            ●
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-500 font-mono italic truncate">
                        {chap.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated Active Output text details */}
            <div className="mt-6 p-4 rounded-xl border border-zinc-850 bg-zinc-950/50 space-y-1.5">
              <span className="text-[8.5px] font-mono text-zinc-600 uppercase font-black tracking-widest block">ACTIVE FEATURE PREVIEW</span>
              <h5 className="text-[10.5px] font-bold text-white uppercase">{activeChap.label.split('. ')[1] || activeChap.label}</h5>
              <p className="text-[9.5px] text-zinc-400 leading-relaxed font-sans mt-1">
                {activeChap.id === 'intro' ? 'The portfolio combines AscendSME, Lumi, Hone, and AI Client Finder — from discovery to close, all in one kit.' : 
                 activeChap.id === 'scanner' ? 'Enter a city and business niche, and the Scanner Agent finds every relevant business on Google Maps.' : 
                 activeChap.id === 'analyzer' ? 'Each lead gets a digital presence score based on website status, SEO, mobile readiness, and more.' : 
                 activeChap.id === 'pitcher' ? 'AI generates personalized outreach messages tailored to each lead’s specific needs and gaps.' : 
                 'Manage your pipeline in a drag-and-drop CRM and automate multi-channel campaign sequences.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-[#0C0C0E]/75">
          <div className="text-[9.5px] font-mono text-zinc-500">
            Powered by <strong className="text-zinc-400">@remotion/player</strong> &middot; Direct UI rendering
          </div>
          <button
            onClick={() => {
              if (playerRef.current) {
                playerRef.current.seekTo(0);
                setIsPlaying(true);
                playerRef.current.play();
              }
            }}
            className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-blue-650 hover:bg-blue-600 rounded-lg cursor-pointer transition-colors shadow-md hover:shadow-lg border border-blue-500/35"
          >
            Play Entire Product Tour
          </button>
        </div>
      </div>
    </div>
  );
}
