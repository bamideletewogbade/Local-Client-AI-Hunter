import { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  BarChart3,
  House,
  CloudLightning,
  Database,
  LayoutList,
  MessageSquare,
  Activity
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface HeaderProps {
  activeTab: 'guide' | 'discovery' | 'crm' | 'analytics' | 'agents';
  setActiveTab: (tab: 'guide' | 'discovery' | 'crm' | 'analytics' | 'agents') => void;
  crmCount: number;
  onOpenChat?: () => void;
}

export default function Header({ activeTab, setActiveTab, crmCount, onOpenChat }: HeaderProps) {
  const { user, isConfigured, signInWithGoogle, logout } = useAuth();

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
  const tabBase = 'flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-200 cursor-pointer border';
  const tabInactive = 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#06070D]/85 backdrop-blur-xl">
      {/* faint top neon line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Brand Logo */}
        <div className="flex items-center gap-2">
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
        <nav className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
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
        <div className="flex items-center gap-2 sm:gap-3">
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

          {/* Core Firebase Auth state — compact */}
          {!isConfigured ? (
            <div
              title="Database backup defaults to fast native browser IndexedDB."
              className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 px-2 sm:px-2.5 py-1.5 text-[10px] font-mono font-bold"
            >
              <Database className="h-3 w-3 text-zinc-500 shrink-0" />
              <span className="hidden sm:inline">DB: LOCAL</span>
              <span className="sm:hidden">Local</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 border-l border-white/10 pl-2 sm:pl-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="h-6 w-6 rounded-full border border-white/15 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-[10px] text-zinc-100 font-bold truncate max-w-[80px] leading-tight">
                  {user.displayName || user.email?.split('@')[0] || 'Active User'}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[9px] text-zinc-500 hover:text-rose-400 font-bold block leading-none cursor-pointer mt-0.5"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 font-bold text-[9px] uppercase tracking-wider px-2 py-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border border-white/15"
              title="Sign in with Google"
            >
              <CloudLightning className="h-3 w-3 text-zinc-300 shrink-0" />
              <span className="hidden sm:inline text-[9px]">Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
