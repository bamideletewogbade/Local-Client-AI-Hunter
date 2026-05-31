import { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  BarChart3,
  House,
  LayoutList,
  MessageSquare,
  Activity
} from 'lucide-react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';

// Auth controls render only when Clerk is configured; otherwise the app runs anonymously.
const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface HeaderProps {
  activeTab: 'guide' | 'discovery' | 'crm' | 'analytics' | 'agents';
  setActiveTab: (tab: 'guide' | 'discovery' | 'crm' | 'analytics' | 'agents') => void;
  crmCount: number;
  onOpenChat?: () => void;
}

export default function Header({ activeTab, setActiveTab, crmCount, onOpenChat }: HeaderProps) {
  const [isFallbackActive, setIsFallbackActive] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hunter_ai_fallback') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setIsFallbackActive(localStorage.getItem('hunter_ai_fallback') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hunter_fallback_toggled', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hunter_fallback_toggled', handleStorageChange);
    };
  }, []);

  // Per-tab active accent so each section keeps its signature neon color
  const tabBase = 'flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-200 cursor-pointer border shrink-0';
  const tabInactive = 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#06070D]/85 backdrop-blur-xl">
      {/* faint top neon line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">

        {/* Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/30 shrink-0">
            <Target className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="hidden min-[370px]:block">
            <span className="text-xs font-bold tracking-tight text-white font-display flex items-center gap-1 uppercase">
              AscendSME <span className="hidden min-[400px]:inline text-zinc-500">· Lumi · Hone</span>
              <span className={`rounded-md px-1 py-0.5 text-[8px] font-bold border font-mono tracking-widest leading-none ${
                isFallbackActive
                  ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                  : 'bg-blue-500/15 text-blue-300 border-blue-400/30'
              }`}>
                {isFallbackActive ? 'Local' : 'AI'}
              </span>
            </span>
            <p className="text-[9px] font-medium text-zinc-500 font-mono tracking-wider hidden sm:block">Project Portfolio</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto no-scrollbar min-w-0">
          <button
            onClick={() => setActiveTab('guide')}
            className={`${tabBase} ${activeTab === 'guide' ? 'bg-white/10 text-white border-white/15 shadow-sm' : tabInactive}`}
            title="Home — Product Overview"
          >
            <House className="h-3.5 w-3.5 shrink-0" />
            <span className="font-display hidden sm:inline">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('discovery')}
            className={`${tabBase} ${activeTab === 'discovery' ? 'bg-blue-500/15 text-blue-300 border-blue-400/30 shadow-sm shadow-blue-600/10' : tabInactive}`}
            title="Discover & Search Leads"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="font-display hidden sm:inline">Discover</span>
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`${tabBase} gap-1.5 ${activeTab === 'crm' ? 'bg-white/10 text-white border-white/15 shadow-sm' : tabInactive}`}
            title="CRM Pipeline"
          >
            <LayoutList className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
            <span className="font-display hidden sm:inline">Pipeline</span>
            {crmCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white leading-none shrink-0 shadow-sm shadow-blue-600/40">
                {crmCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`${tabBase} ${activeTab === 'analytics' ? 'bg-violet-500/15 text-violet-300 border-violet-400/30 shadow-sm shadow-violet-600/10' : tabInactive}`}
            title="Analytics Dashboard"
          >
            <BarChart3 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span className="font-display hidden sm:inline">Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`${tabBase} ${activeTab === 'agents' ? 'bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-sm shadow-amber-600/10' : tabInactive}`}
            title="Agent Dashboard"
          >
            <Activity className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="font-display hidden sm:inline">Agents</span>
          </button>
        </nav>

        {/* Operations Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* ASK BISHOP button — opens AI chat copilot */}
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 sm:px-3 py-1.5 transition-all cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95 border border-indigo-400/30"
          >
            <MessageSquare className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Ask Bishop</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Auth + user management via Clerk */}
          {hasClerk ? (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border border-white/15"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="hidden sm:flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[9px] uppercase tracking-wider px-2.5 py-1.5 transition-all cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95 border border-indigo-400/30"
                  >
                    Sign Up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-7 w-7' } }} />
              </Show>
            </>
          ) : (
            <div
              title="Set VITE_CLERK_PUBLISHABLE_KEY to enable Clerk sign-in"
              className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 text-zinc-500 px-2 sm:px-2.5 py-1.5 text-[10px] font-mono font-bold"
            >
              <span className="hidden sm:inline">AUTH: SET KEY</span>
              <span className="sm:hidden">Auth</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
