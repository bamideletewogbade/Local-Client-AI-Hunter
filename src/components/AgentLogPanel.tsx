import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { agentLogger, AgentLogEntry } from '../agents/logger';
import { useWebSocketStatus } from '../hooks/useWebSocket';
import AgentHandoffPipeline from './AgentHandoffPipeline';
import { Activity, X, RefreshCw, ChevronDown, AlertCircle, CheckCircle2, Bug, Play, MessageSquare, ArrowRight, Wifi, WifiOff, Gauge, Zap } from 'lucide-react';

interface AgentLogPanelProps {
  maxHeight?: string;
  defaultOpen?: boolean;
}

type LogFilter = 'all' | 'network' | 'agents' | 'errors';

/**
 * AgentLogPanel — live Activity Monitor.
 * Streams both API requests (method, path, status, latency) and agent steps
 * from the agent logger (fed by the server over WebSocket) in a devtools-style console.
 */
export default function AgentLogPanel({ maxHeight = '380px', defaultOpen = false }: AgentLogPanelProps) {
  const [isOpen, setIsOpen] = useLocalStorage('hunter_log_panel_open', defaultOpen);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [filter, setFilter] = useLocalStorage<LogFilter>('hunter_activity_filter', 'all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsConnected = useWebSocketStatus();

  // Subscribe to logger (server logs arrive here via the WebSocket hook)
  useEffect(() => {
    setLogs(agentLogger.getHistory());
    const unsubscribe = agentLogger.subscribe((entry) => {
      setLogs((prev) => {
        const updated = [...prev, entry];
        return updated.length > 250 ? updated.slice(-250) : updated;
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // ─── Derived stats ───
  const isHttp = (l: AgentLogEntry) => l.kind === 'http';
  const isError = (l: AgentLogEntry) => l.level === 'error' || (typeof l.statusCode === 'number' && l.statusCode >= 400);
  const httpLogs = logs.filter((l) => isHttp(l) && typeof l.durationMs === 'number');
  const reqCount = logs.filter(isHttp).length;
  const avgMs = httpLogs.length ? Math.round(httpLogs.reduce((s, l) => s + (l.durationMs || 0), 0) / httpLogs.length) : 0;
  const errCount = logs.filter(isError).length;

  const filteredLogs = logs.filter((l) => {
    if (filter === 'network') return isHttp(l);
    if (filter === 'agents') return !isHttp(l);
    if (filter === 'errors') return isError(l);
    return true;
  });

  // ─── Color helpers ───
  const methodColor = (m?: string) =>
    m === 'GET' ? 'text-sky-300 bg-sky-500/10 border-sky-500/25'
    : m === 'POST' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
    : m === 'PUT' || m === 'PATCH' ? 'text-amber-300 bg-amber-500/10 border-amber-500/25'
    : m === 'DELETE' ? 'text-rose-300 bg-rose-500/10 border-rose-500/25'
    : 'text-zinc-300 bg-white/5 border-white/10';

  const statusColor = (s?: number) =>
    !s ? 'text-zinc-500'
    : s >= 500 ? 'text-rose-300 bg-rose-500/10'
    : s >= 400 ? 'text-amber-300 bg-amber-500/10'
    : s >= 300 ? 'text-blue-300 bg-blue-500/10'
    : 'text-emerald-300 bg-emerald-500/10';

  const latencyColor = (ms?: number) =>
    ms === undefined ? 'text-zinc-600'
    : ms > 3000 ? 'text-rose-400'
    : ms > 1000 ? 'text-amber-400'
    : 'text-zinc-500';

  const levelIcon = (level: AgentLogEntry['level']) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />;
      case 'warn': return <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />;
      case 'info': return <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />;
      case 'debug': return <Bug className="h-3 w-3 text-zinc-500 shrink-0" />;
    }
  };

  const t = (ts: string) => ts.split('T')[1]?.split('.')[0] || '';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[440px] max-w-[calc(100vw-24px)]">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ml-auto rounded-lg px-3 py-2 text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'bg-zinc-900/90 backdrop-blur text-zinc-300 border border-white/10 hover:border-white/20 shadow-lg'
        }`}
      >
        <Activity className="h-3.5 w-3.5" />
        <span>Activity Monitor</span>
        <span className="rounded bg-white/10 px-1 py-px text-[8px] leading-none">{logs.length}</span>
        {errCount > 0 && <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="mt-2 rounded-xl border border-white/10 bg-[#0a0b12]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          style={{ maxHeight }}
        >
          {/* Header + live stats strip */}
          <div className="px-3 py-2 border-b border-white/10 bg-gradient-to-r from-blue-500/5 via-transparent to-violet-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-mono font-bold text-zinc-200 uppercase tracking-wider">Activity Monitor</span>
                <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-mono font-bold uppercase tracking-wider ${
                  wsConnected ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}>
                  {wsConnected ? <><Wifi className="h-2 w-2" /> Live</> : <><WifiOff className="h-2 w-2" /> Offline</>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => agentLogger.clear()} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer" title="Clear">
                  <RefreshCw className="h-3 w-3" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer" title="Close">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            {/* Stats */}
            <div className="mt-1.5 flex items-center gap-3 text-[9px] font-mono">
              <span className="flex items-center gap-1 text-zinc-400"><Zap className="h-2.5 w-2.5 text-blue-400" />{reqCount} <span className="text-zinc-600">reqs</span></span>
              <span className="flex items-center gap-1 text-zinc-400"><Gauge className="h-2.5 w-2.5 text-emerald-400" />{avgMs}<span className="text-zinc-600">ms avg</span></span>
              <span className={`flex items-center gap-1 ${errCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}><AlertCircle className="h-2.5 w-2.5" />{errCount} <span className="text-zinc-600">errors</span></span>
              <span className="ml-auto text-zinc-600">{logs.length} events</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
            {(['all', 'network', 'agents', 'errors'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === f ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`ml-auto px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                autoScroll ? 'text-blue-400' : 'text-zinc-500'
              }`}
            >
              Auto
            </button>
          </div>

          {/* Stream */}
          <div className="overflow-y-auto p-2 space-y-0.5 dark-scrollbar" style={{ maxHeight: `calc(${maxHeight} - 104px)` }}>
            {filteredLogs.length === 0 ? (
              <div className="px-2 py-3">
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-3 w-3 text-blue-400" />
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Agent Pipeline</span>
                  </div>
                  <AgentHandoffPipeline compact autoRun={false} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button onClick={() => window.dispatchEvent(new CustomEvent('hunter-open-copilot'))} className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] font-bold font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-all cursor-pointer">
                    <MessageSquare className="h-3 w-3 text-indigo-400" /> Ask Bishop
                  </button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('hunter-run-pipeline'))} className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] font-bold font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-all cursor-pointer">
                    <Play className="h-3 w-3 text-emerald-400" /> Run Demo
                  </button>
                </div>
                <div className="rounded-lg bg-gradient-to-r from-blue-500/5 via-white/[0.02] to-violet-500/5 border border-white/10 p-3">
                  <p className="text-[9px] font-mono text-zinc-500 leading-relaxed">
                    <span className="text-blue-400 font-bold">Activity streams here</span> in real time — every API request and agent step, with status and latency. Run a scan or ask Bishop to populate it.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] font-mono text-zinc-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Scanner → Analyzer</span>
                    <ArrowRight className="h-2 w-2 text-zinc-700" />
                    <span className="text-[8px] font-mono text-zinc-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Pitcher → Converter</span>
                  </div>
                </div>
              </div>
            ) : (
              filteredLogs.map((entry) => (
                entry.kind === 'http' ? (
                  // ── Network row ──
                  <div key={entry.id} className="group flex items-center gap-2 px-2 py-1.5 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-[10px] font-mono transition-colors">
                    <span className="text-zinc-600 shrink-0">{t(entry.timestamp)}</span>
                    <span className={`shrink-0 px-1.5 py-px rounded border text-[8px] font-bold tracking-wider ${methodColor(entry.method)}`}>
                      {entry.method}
                    </span>
                    <span className="text-zinc-300 truncate flex-1">{entry.path}</span>
                    {typeof entry.statusCode === 'number' && (
                      <span className={`shrink-0 px-1 rounded text-[9px] font-bold ${statusColor(entry.statusCode)}`}>{entry.statusCode}</span>
                    )}
                    <span className={`shrink-0 text-[9px] font-bold tabular-nums ${latencyColor(entry.durationMs)}`}>
                      {entry.durationMs}ms
                    </span>
                  </div>
                ) : (
                  // ── Agent row ──
                  <div key={entry.id} className={`group flex items-start gap-2 px-2 py-1.5 rounded border text-[10px] font-mono leading-relaxed transition-colors ${
                    entry.level === 'error' ? 'text-rose-300 bg-rose-950/30 border-rose-900/30'
                    : entry.level === 'warn' ? 'text-amber-300 bg-amber-950/30 border-amber-900/30'
                    : 'text-zinc-300 bg-white/[0.02] border-white/5'
                  }`}>
                    {levelIcon(entry.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 shrink-0">{t(entry.timestamp)}</span>
                        <span className="font-bold text-blue-300 shrink-0">[{entry.agentName}]</span>
                        <span className="text-zinc-300 truncate">{entry.message}</span>
                      </div>
                      {entry.toolName && (
                        <div className="mt-0.5 text-zinc-500 truncate">⚙ {entry.toolName}{entry.durationMs !== undefined && ` • ${entry.durationMs}ms`}</div>
                      )}
                      {entry.error && <div className="mt-0.5 text-rose-400/80 truncate">✗ {entry.error}</div>}
                    </div>
                    {entry.durationMs !== undefined && !entry.toolName && (
                      <span className={`shrink-0 text-[9px] font-bold ${latencyColor(entry.durationMs)}`}>{entry.durationMs}ms</span>
                    )}
                  </div>
                )
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
