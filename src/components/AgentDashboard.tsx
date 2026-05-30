import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Zap, PenTool, TrendingUp, ShieldCheck,
  Terminal, Activity, BarChart3, Database, Target,
  CheckCircle2, Loader2, AlertTriangle, X, Clock,
  Users, Globe, Phone, Star, FileText, ListChecks,
  Sparkles, ArrowRight, Zap as ZapIcon, Wifi, WifiOff
} from 'lucide-react';
import { agentLogger, AgentLogEntry } from '../agents/logger';
import { useWebSocketStatus } from '../hooks/useWebSocket';
import type { Lead } from '../types';

// ─── Agent Definitions (mirrors pipeline) ───

const AGENTS = [
  { id: 'scanner',    name: 'Scanner',    icon: Search,    color: '#3b82f6',  label: 'Discovery',  role: 'Finds local businesses via Google Maps' },
  { id: 'analyzer',   name: 'Analyzer',   icon: Zap,       color: '#8b5cf6',  label: 'Scoring',    role: 'Scores digital presence & identifies gaps' },
  { id: 'pitcher',    name: 'Pitcher',    icon: PenTool,   color: '#06b6d4',  label: 'Content',    role: 'Generates personalized outreach proposals' },
  { id: 'converter',  name: 'Converter',  icon: TrendingUp, color: '#10b981', label: 'Pipeline',   role: 'Prepares leads for CRM pipeline' },
  { id: 'auditor',    name: 'Auditor',    icon: ShieldCheck, color: '#f59e0b', label: 'QA',        role: 'Reviews quality across all stages' },
];

// ─── Props ───

interface AgentDashboardProps {
  crmLeads: Lead[];
  onNavigate?: (tab: string) => void;
}

// ─── Log Timeline Item ───

function LogEntry({ entry }: { entry: AgentLogEntry }) {
  const levelColors: Record<string, string> = {
    error: 'border-rose-900/30 bg-rose-950/20 text-rose-300',
    warn: 'border-amber-900/30 bg-amber-950/20 text-amber-300',
    info: 'border-zinc-800/50 bg-zinc-900/30 text-zinc-300',
    debug: 'border-zinc-800/30 bg-zinc-950/20 text-zinc-500',
  };

  const levelIcon = (level: AgentLogEntry['level']) => {
    switch (level) {
      case 'error': return <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />;
      case 'warn': return <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />;
      case 'info': return <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />;
      case 'debug': return <Terminal className="h-3 w-3 text-zinc-500 shrink-0" />;
    }
  };

  return (
    <div className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono leading-relaxed transition-colors ${levelColors[entry.level] || levelColors.info}`}>
      {levelIcon(entry.level)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 shrink-0">
            {entry.timestamp.split('T')[1]?.split('.')[0] || ''}
          </span>
          <span className="font-bold shrink-0">[{entry.agentName}]</span>
          <span className="truncate">{entry.message}</span>
        </div>
        {entry.toolName && (
          <div className="mt-0.5 text-zinc-600 truncate flex items-center gap-1">
            <ZapIcon className="h-2.5 w-2.5" />
            {entry.toolName}{entry.durationMs !== undefined && ` • ${entry.durationMs}ms`}
          </div>
        )}
        {entry.error && <div className="mt-0.5 text-rose-400/80 truncate">✗ {entry.error}</div>}
      </div>
      {entry.durationMs !== undefined && (
        <span className={`shrink-0 text-[9px] font-bold ${entry.durationMs > 5000 ? 'text-amber-400' : 'text-zinc-500'}`}>
          {entry.durationMs}ms
        </span>
      )}
    </div>
  );
}

// ─── Main Dashboard Component ───

export default function AgentDashboard({ crmLeads, onNavigate }: AgentDashboardProps) {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [filter, setFilter] = useState<AgentLogEntry['level'] | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsConnected = useWebSocketStatus();

  // Stats from CRM
  const totalLeads = crmLeads.length;
  const noWebsite = crmLeads.filter(l => !l.website).length;
  const withPhone = crmLeads.filter(l => l.phone && l.phone !== 'No phone listed').length;
  const avgScore = crmLeads.length > 0
    ? Math.round(crmLeads.reduce((s, l) => s + (l.digitalPresenceScore || 50), 0) / crmLeads.length)
    : 0;

  // Subscribe to agent logger
  useEffect(() => {
    setLogs(agentLogger.getHistory());
    const unsubscribe = agentLogger.subscribe((entry) => {
      setLogs((prev) => {
        const updated = [...prev, entry];
        return updated.length > 500 ? updated.slice(-500) : updated;
      });
    });
    return unsubscribe;
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  // Agent stats from logs
  const agentStats = AGENTS.map(agent => {
    const agentLogs = logs.filter(l => l.agentName === agent.name);
    const lastRun = agentLogs.length > 0 ? agentLogs[agentLogs.length - 1] : null;
    const totalDuration = agentLogs.reduce((s, l) => s + (l.durationMs || 0), 0);
    const errorCount = agentLogs.filter(l => l.level === 'error').length;
    const lastStatus = lastRun?.level === 'error' ? 'error' : lastRun ? 'success' : 'idle';

    return { ...agent, logs: agentLogs.length, lastRun, totalDuration, errorCount, lastStatus };
  });

  // ─── Stats Cards ───

  const statCards = [
    { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'No Website', value: noWebsite, icon: Globe, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Contactable', value: withPhone, icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Avg Score', value: `${avgScore}`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  return (
    <div className="space-y-6 animate-fade-in dark-scrollbar">
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-950 via-[#0C0C0E] to-amber-950/20 p-5 shadow-xl shadow-amber-500/5"
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/8 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/20">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-display text-white">Agent Dashboard</h2>
                {/* WebSocket connection status */}
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                  wsConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {wsConnected ? (
                    <><Wifi className="h-2.5 w-2.5" /> Live</>
                  ) : (
                    <><WifiOff className="h-2.5 w-2.5" /> Offline</>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Real-time agent activity & pipeline intelligence</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate?.('discovery')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[9px] font-bold font-mono uppercase tracking-wider hover:bg-blue-600/30 hover:shadow-lg hover:shadow-blue-600/10 transition-all cursor-pointer"
          >
            <Search className="h-3 w-3" />
            New Scan
          </button>
        </div>
      </motion.div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`rounded-xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg cinematic-card ${stat.bg}`}
            >
              {/* Subtle grid */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, ${stat.color === 'text-blue-400' ? '#3b82f6' : stat.color === 'text-rose-400' ? '#f43f5e' : stat.color === 'text-emerald-400' ? '#10b981' : '#8b5cf6'} 1px, transparent 0)`,
                  backgroundSize: '20px 20px'
                }}
              />
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                  <Icon className={`h-4 w-4 ${stat.color} opacity-70`} />
                </div>
                <p className={`text-2xl font-bold font-display ${stat.color}`}>{stat.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Agent Cards Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {agentStats.map((agent, idx) => {
          const Icon = agent.icon;
          const statusColors = {
            success: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-emerald-950/15',
            error: 'border-rose-500/30 bg-gradient-to-br from-rose-500/8 to-rose-950/15',
            idle: 'border-zinc-800/50 bg-zinc-900/20',
          };

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-xl border backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cinematic-card ${statusColors[agent.lastStatus]}`}
            >
              {/* Subtle grid */}
              <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, ${agent.color} 1px, transparent 0)`,
                  backgroundSize: '20px 20px'
                }}
              />
              <div className="relative p-4">
                {/* Agent Header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg ring-1" style={{ backgroundColor: `${agent.color}15`, borderColor: `${agent.color}30`, borderWidth: 1 }}>
                    <Icon className="h-4 w-4" style={{ color: agent.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{agent.name}</p>
                    <span className="text-[8px] font-mono text-zinc-500">{agent.role}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {agent.lastStatus === 'success' && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    {agent.lastStatus === 'error' && <AlertTriangle className="h-3 w-3 text-rose-400" />}
                    {agent.lastStatus === 'idle' && <div className="h-2 w-2 rounded-full bg-zinc-700" />}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-zinc-900/50 rounded-lg p-1.5 border border-zinc-800/30">
                    <p className="text-xs font-bold text-white">{agent.logs}</p>
                    <p className="text-[7px] font-mono text-zinc-600 uppercase">Events</p>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-1.5 border border-zinc-800/30">
                    <p className="text-xs font-bold text-white">
                      {agent.totalDuration > 1000 ? `${(agent.totalDuration / 1000).toFixed(1)}s` : `${agent.totalDuration}ms`}
                    </p>
                    <p className="text-[7px] font-mono text-zinc-600 uppercase">Runtime</p>
                  </div>
                </div>

                {/* Error count */}
                {agent.errorCount > 0 && (
                  <div className="mt-2 flex items-center gap-1 bg-rose-500/10 rounded-lg px-2 py-1 border border-rose-500/20">
                    <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                    <span className="text-[8px] font-mono text-rose-300">{agent.errorCount} error{agent.errorCount > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Last activity */}
                {agent.lastRun && (
                  <div className="mt-2 text-[8px] font-mono text-zinc-600 truncate bg-zinc-900/30 rounded-lg px-2 py-1">
                    Last: {agent.lastRun.message.slice(0, 40)}{agent.lastRun.message.length > 40 ? '...' : ''}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Log Timeline ─── */}
      <div className="rounded-xl border border-zinc-800/60 bg-gradient-to-b from-[#0C0C0E] to-zinc-950/50 overflow-hidden backdrop-blur-sm shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider">Agent Log Timeline</span>
            <span className="text-[9px] font-mono text-zinc-600">{filteredLogs.length} events</span>
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'info', 'warn', 'error', 'debug'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === l ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {l === 'all' ? 'All' : l}
              </button>
            ))}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`ml-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider cursor-pointer ${
                autoScroll ? 'text-blue-400' : 'text-zinc-500'
              }`}
            >
              Auto
            </button>
          </div>
        </div>

        {/* Log entries */}
        <div className="overflow-y-auto p-3 space-y-1 dark-scrollbar" style={{ maxHeight: '400px' }}>
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-6 w-6 text-zinc-700 mb-2" />
              <p className="text-[10px] font-mono text-zinc-600">No agent activity yet</p>
              <p className="text-[9px] font-mono text-zinc-700 mt-1">Run a lead scan or ask Bishop a question to see agent activity here</p>
            </div>
          ) : (
            filteredLogs.slice(-200).map((entry) => (
              <LogEntry key={entry.id} entry={entry} />
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* ─── Insights Footer ─── */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-r from-amber-500/5 via-zinc-900/50 to-blue-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-300">Agent Insights</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-900/60 rounded-lg p-3">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Total Executions</p>
              <p className="text-lg font-bold text-white mt-1">
                {agentStats.reduce((s, a) => s + a.logs, 0)}
              </p>
            </div>
            <div className="bg-zinc-900/60 rounded-lg p-3">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Avg Runtime</p>
              <p className="text-lg font-bold text-white mt-1">
                {agentStats.reduce((s, a) => s + a.totalDuration, 0) > 0
                  ? `${(agentStats.reduce((s, a) => s + a.totalDuration, 0) / Math.max(1, agentStats.reduce((s, a) => s + a.logs, 0))).toFixed(0)}ms`
                  : '—'}
              </p>
            </div>
            <div className="bg-zinc-900/60 rounded-lg p-3">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Errors</p>
              <p className={`text-lg font-bold mt-1 ${agentStats.reduce((s, a) => s + a.errorCount, 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {agentStats.reduce((s, a) => s + a.errorCount, 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
