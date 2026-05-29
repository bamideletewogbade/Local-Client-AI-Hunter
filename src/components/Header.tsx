import { useState, useEffect } from 'react';
import { 
  Target, 
  Sparkles, 
  BarChart3, 
  Settings, 
  House,
  CloudLightning,
  Database,
  LayoutList,
  Search,
  MessageSquare
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface HeaderProps {
  activeTab: 'guide' | 'discovery' | 'crm' | 'analytics';
  setActiveTab: (tab: 'guide' | 'discovery' | 'crm' | 'analytics') => void;
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 shadow-sm shrink-0">
            <Target className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="hidden min-[370px]:block">
            <span className="text-xs font-bold tracking-tight text-zinc-900 font-display flex items-center gap-1 uppercase">
              Client <span className="hidden min-[400px]:inline">Hunter</span>
              <span className={`rounded-md px-1 py-0.5 text-[8px] font-bold border font-mono tracking-widest leading-none ${
                isFallbackActive 
                  ? 'bg-amber-50 text-amber-600 border-amber-200' 
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                {isFallbackActive ? 'Local' : 'AI'}
              </span>
            </span>
            <p className="text-[9px] font-medium text-zinc-400 font-mono tracking-wider hidden sm:block">Acquisition Engine</p>
          </div>
        </div>

        {/* Minimalist Tab Navigation */}
        <nav className="flex items-center gap-1 bg-zinc-100/80 border border-zinc-200/60 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-900 border border-transparent'
            }`}
            title="Home — Product Overview"
          >
            <House className="h-3.5 w-3.5 shrink-0" />
            <span className="font-display hidden sm:inline">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab('discovery')}
            className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer ${
              activeTab === 'discovery'
                ? 'bg-white text-blue-600 shadow-xs border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-900 border border-transparent'
            }`}
            title="Discover & Search Leads"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="font-display hidden sm:inline">Discover</span>
          </button>
          
          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer ${
              activeTab === 'crm'
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-900 border border-transparent'
            }`}
            title="CRM Pipeline"
          >
            <LayoutList className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
            <span className="font-display hidden sm:inline">Pipeline</span>
            {crmCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[8px] font-bold text-white leading-none shrink-0">
                {crmCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-900 border border-transparent'
            }`}
            title="Analytics Dashboard"
          >
            <BarChart3 className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
            <span className="font-display hidden sm:inline">Analytics</span>
          </button>
        </nav>

        {/* Operations Dashboard */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ASK BISHOP button — opens AI chat copilot */}
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 sm:px-3 py-1.5 transition-all cursor-pointer shadow-xs active:scale-95 border border-indigo-400/30"
          >
            <MessageSquare className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Ask Bishop</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Core Firebase Auth state — compact */}
          {!isConfigured ? (
            <div 
              title="Database backup defaults to fast native browser IndexedDB."
              className="flex items-center gap-1 rounded-lg bg-zinc-100 border border-zinc-200/80 text-zinc-500 px-2 sm:px-2.5 py-1.5 text-[10px] font-mono font-bold"
            >
              <Database className="h-3 w-3 text-zinc-400 shrink-0" />
              <span className="hidden sm:inline">DB: LOCAL</span>
              <span className="sm:hidden">Local</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 border-l border-zinc-200/80 pl-2 sm:pl-3">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="h-6 w-6 rounded-full border border-zinc-200 shadow-xs shrink-0" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-[10px] text-zinc-800 font-bold truncate max-w-[80px] leading-tight">
                  {user.displayName || user.email?.split('@')[0] || 'Active User'}
                </p>
                <button 
                  type="button"
                  onClick={logout} 
                  className="text-[9px] text-zinc-400 hover:text-red-600 font-bold block leading-none cursor-pointer mt-0.5"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex items-center gap-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-600 font-bold text-[9px] uppercase tracking-wider px-2 py-1.5 transition-all cursor-pointer shadow-xs active:scale-95 border border-zinc-300"
              title="Sign in with Google"
            >
              <CloudLightning className="h-3 w-3 text-zinc-500 shrink-0" />
              <span className="hidden sm:inline text-[9px]">Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
