import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { agentLogger, AgentLogEntry } from '../agents/logger';
import { Terminal, X, RefreshCw, ChevronDown, AlertCircle, CheckCircle2, Loader2, Bug } from 'lucide-react';

interface AgentLogPanelProps {
  maxHeight?: string;
  defaultOpen?: boolean;
}

/**
 * AgentLogPanel — Real-time log display for agent interactions.
 * Subscribes to the agent logger and displays entries in a terminal-like UI.
 */
export default function AgentLogPanel({ maxHeight = '320px', defaultOpen = false }: AgentLogPanelProps) {
  const [isOpen, setIsOpen] = useLocalStorage('hunter_log_panel_open', defaultOpen);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [filter, setFilter] = useLocalStorage<AgentLogEntry['level'] | 'all'>('hunter_log_filter', 'all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to logger
  useEffect(() => {
    // Load existing history
    setLogs(agentLogger.getHistory());

    const unsubscribe = agentLogger.subscribe((entry) => {
      setLogs((prev) => {
        const updated = [...prev, entry];
        // Keep max 200 logs in UI
        return updated.length > 200 ? updated.slice(-200) : updated;
      });
    });

    return unsubscribe;
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  const levelIcon = (level: AgentLogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />;
      case 'warn':
        return <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />;
      case 'info':
        return <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />;
      case 'debug':
        return <Bug className="h-3 w-3 text-zinc-500 shrink-0" />;
    }
  };

  const levelColor = (level: AgentLogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-rose-300 bg-rose-950/30 border-rose-900/30';
      case 'warn': return 'text-amber-300 bg-amber-950/30 border-amber-900/30';
      case 'info': return 'text-emerald-300 bg-emerald-950/20 border-emerald-900/20';
      case 'debug': return 'text-zinc-400 bg-zinc-950/20 border-zinc-800/20';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[calc(100vw-32px)]">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ml-auto rounded-lg px-3 py-2 text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 shadow-lg'
        }`}
      >
        <Terminal className="h-3.5 w-3.5" />
        <span>Agent Logs</span>
        {logs.some((l) => l.level === 'error') && (
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        )}
        {logs.some((l) => l.level === 'warn') && !logs.some((l) => l.level === 'error') && (
          <span className="flex h-2 w-2 rounded-full bg-amber-500" />
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="mt-2 rounded-xl border border-zinc-800 bg-[#0c0c0e]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          style={{ maxHeight }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
                Agent Monitor
              </span>
              <span className="text-[9px] font-mono text-zinc-600">
                {logs.length} events
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => agentLogger.clear()}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                title="Clear logs"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800/40 bg-zinc-900/30">
            {(['all', 'info', 'warn', 'error', 'debug'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === l
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {l === 'all' ? 'All' : l}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  autoScroll ? 'text-blue-400' : 'text-zinc-500'
                }`}
              >
                Auto-scroll
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div
            ref={scrollRef}
            className="overflow-y-auto p-2 space-y-0.5"
            style={{ maxHeight: `calc(${maxHeight} - 82px)` }}
          >
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                <Loader2 className="h-5 w-5 mb-2 animate-spin text-zinc-700" />
                <p className="text-[10px] font-mono">Awaiting agent activity...</p>
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`group flex items-start gap-2 px-2 py-1.5 rounded border text-[10px] font-mono leading-relaxed transition-colors ${levelColor(entry.level)}`}
                >
                  {levelIcon(entry.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 shrink-0">
                        {entry.timestamp.split('T')[1]?.split('.')[0] || ''}
                      </span>
                      <span className="font-bold text-zinc-200 shrink-0">
                        [{entry.agentName}]
                      </span>
                      <span className="text-zinc-300 truncate">{entry.message}</span>
                    </div>
                    {entry.toolName && (
                      <div className="mt-0.5 text-zinc-500 truncate">
                        ⚙ {entry.toolName}
                        {entry.durationMs !== undefined && ` • ${entry.durationMs}ms`}
                      </div>
                    )}
                    {entry.error && (
                      <div className="mt-0.5 text-rose-400/80 truncate">
                        ✗ {entry.error}
                      </div>
                    )}
                    {entry.details && entry.level === 'debug' && (
                      <div className="mt-0.5 text-zinc-600 truncate">{entry.details}</div>
                    )}
                  </div>
                  {entry.durationMs !== undefined && (
                    <span className={`shrink-0 text-[9px] font-bold ${
                      entry.durationMs > 5000 ? 'text-amber-400' : 'text-zinc-500'
                    }`}>
                      {entry.durationMs}ms
                    </span>
                  )}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
