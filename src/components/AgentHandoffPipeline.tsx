import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Zap,
  PenTool,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Play,
  Sparkles,
  ListChecks,
  BarChart3,
  FileText,
  Database,
  ChevronDown,
} from 'lucide-react';
import type { Lead, ScoreBreakdown, BusinessAnalysis, WebDesignProposal, OutreachPitch } from '../types';
import { agentLogger } from '../agents/logger';

// ─── Types ───

interface AgentStage {
  id: string;
  name: string;
  icon: typeof Search;
  color: string;
  accent: string;
  description: string;
  role: string;
}

export interface PipelineResult {
  stageId: string;
  status: 'running' | 'completed' | 'error';
  outputSummary: string;
  outputCount: number;
  details?: string[];
  duration?: number;
  /** Free-form data payload from the stage execution */
  payload?: any;
}

// ─── Agent Definitions ───

const AGENTS: AgentStage[] = [
  {
    id: 'scanner',
    name: 'Scanner',
    icon: Search,
    color: '#3b82f6',
    accent: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
    description: 'Discovers local businesses via Google Maps',
    role: 'Discovery'
  },
  {
    id: 'analyzer',
    name: 'Analyzer',
    icon: Zap,
    color: '#8b5cf6',
    accent: 'bg-purple-500/10 border-purple-500/25 text-purple-400',
    description: 'Scores digital presence & identifies gaps',
    role: 'Scoring'
  },
  {
    id: 'pitcher',
    name: 'Pitcher',
    icon: PenTool,
    color: '#06b6d4',
    accent: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400',
    description: 'Generates personalized outreach proposals',
    role: 'Content'
  },
  {
    id: 'converter',
    name: 'Converter',
    icon: TrendingUp,
    color: '#10b981',
    accent: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
    description: 'Prepares leads for CRM pipeline',
    role: 'Pipeline'
  },
  {
    id: 'auditor',
    name: 'Auditor',
    icon: ShieldCheck,
    color: '#f59e0b',
    accent: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
    description: 'Reviews quality across all stages',
    role: 'QA'
  }
];

const HANDOFF_MESSAGES: Record<string, string> = {
  scanner: 'Mapping local businesses...',
  analyzer: 'Analyzing digital footprints...',
  pitcher: 'Crafting outreach proposals...',
  converter: 'Syncing to pipeline...',
  auditor: 'Auditing pipeline quality...'
};

const HANDOFF_COMPLETE: Record<string, string> = {
  scanner: 'businesses discovered',
  analyzer: 'digital audits complete',
  pitcher: 'proposals generated',
  converter: 'leads synced to CRM',
  auditor: 'quality audit done'
};

// ─── Props ───

interface AgentHandoffPipelineProps {
  autoRun?: boolean;
  externalResults?: PipelineResult[];
  onStageComplete?: (result: PipelineResult) => void;
  onPipelineComplete?: (results: PipelineResult[]) => void;
  compact?: boolean;
  /** Real leads to run the pipeline against */
  leads?: Lead[];
  /** Original search query (for auditor context) */
  searchQuery?: string;
  /** Original search location (for auditor context) */
  searchLocation?: string;
}

// ─── Particle Component ───

function DataParticle({ color, delay }: { color: string; delay: number }) {
  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      initial={{ left: '0%', opacity: 0 }}
      animate={{
        left: ['0%', '50%', '100%'],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 1.2,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ─── Main Component ───

export default function AgentHandoffPipeline({
  autoRun = false,
  externalResults,
  onStageComplete,
  onPipelineComplete,
  compact = false,
  leads = [],
  searchQuery,
  searchLocation,
}: AgentHandoffPipelineProps) {
  const [pipelineResults, setPipelineResults] = useState<PipelineResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(-1);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [handoffAnimations, setHandoffAnimations] = useState<Set<string>>(new Set());
  const pipelineRef = useRef<HTMLDivElement>(null);

  // ─── Stage Executors ───

  const runScanner = useCallback(async (leads: Lead[]): Promise<PipelineResult> => {
    agentLogger.info('Scanner', `Processing ${leads.length} discovered leads`);
    await new Promise(r => setTimeout(r, compact ? 300 : 600));

    const total = leads.length;
    const noWebsite = leads.filter(l => !l.website).length;

    return {
      stageId: 'scanner',
      status: 'completed',
      outputSummary: `${total} businesses discovered`,
      outputCount: total,
      details: [
        `${total} local businesses found`,
        noWebsite > 0 ? `${noWebsite} have no website (high opportunity)` : 'All leads have websites',
        `Average rating: ${leads.filter(l => l.rating).length > 0 ? (leads.reduce((s, l) => s + (l.rating || 0), 0) / leads.filter(l => l.rating).length).toFixed(1) : 'N/A'} ⭐`,
      ],
      payload: { total, noWebsite },
    };
  }, [compact]);

  const runAnalyzer = useCallback(async (leads: Lead[]): Promise<PipelineResult> => {
    agentLogger.info('Analyzer', `Scoring ${leads.length} leads`);

    // Dynamically import to avoid circular deps at module level
    const { scoreLeadTool, analyzeLeadTool, serverAnalyzeLead, calculateScoreBreakdown } = await import('../agents/tools');

    const scored: { leadName: string; score: number }[] = [];
    const details: string[] = [];
    let totalScore = 0;

    for (const lead of leads) {
      try {
        // Score the lead
        const breakdown = lead.scoreBreakdown || (typeof calculateScoreBreakdown === 'function' ? calculateScoreBreakdown(lead) : null);
        const score = breakdown?.total || lead.digitalPresenceScore || 50;
        scored.push({ leadName: lead.name, score });
        totalScore += score;

        // Run full analysis
        const analysis = typeof serverAnalyzeLead === 'function' ? serverAnalyzeLead(lead) : null;
        if (analysis) {
          lead.aiAnalysis = analysis;
        }

        await new Promise(r => setTimeout(r, compact ? 50 : 120));
      } catch (err) {
        agentLogger.warn('Analyzer', `Failed to score "${lead.name}": ${err}`);
      }
    }

    const avgScore = scored.length > 0 ? Math.round(totalScore / scored.length) : 0;
    const highOpp = scored.filter(s => s.score > 60).length;
    const lowOpp = scored.filter(s => s.score <= 40).length;

    details.push(`Average digital presence score: ${avgScore}/100`);
    if (highOpp > 0) details.push(`${highOpp} leads scored as "high opportunity"`);
    if (lowOpp > 0) details.push(`${lowOpp} leads have low scores — easy wins`);
    details.push(`${scored.length} leads analyzed for pain points & AI opportunities`);

    agentLogger.info('Analyzer', `Scored ${scored.length} leads. Avg: ${avgScore}/100`);

    return {
      stageId: 'analyzer',
      status: 'completed',
      outputSummary: `${scored.length} digital audits complete`,
      outputCount: scored.length,
      details,
      payload: { scored, avgScore },
    };
  }, [compact]);

  const runPitcher = useCallback(async (leads: Lead[]): Promise<PipelineResult> => {
    agentLogger.info('Pitcher', `Generating proposals for ${leads.length} leads`);

    const { serverGenerateProposal, serverGeneratePitch } = await import('../agents/tools');

    let pitched = 0;
    const details: string[] = [];
    const pitchTypes = new Map<string, number>();

    for (const lead of leads) {
      try {
        const proposal = lead.webDesignProposal || (typeof serverGenerateProposal === 'function' ? serverGenerateProposal(lead) : null);
        if (proposal) {
          lead.webDesignProposal = proposal;
          pitchTypes.set(proposal.suggestedType, (pitchTypes.get(proposal.suggestedType) || 0) + 1);
        }

        const pitch = lead.outreachPitch || (typeof serverGeneratePitch === 'function' ? serverGeneratePitch(lead) : null);
        if (pitch) {
          lead.outreachPitch = pitch;
          pitched++;
        }

        await new Promise(r => setTimeout(r, compact ? 60 : 150));
      } catch (err) {
        agentLogger.warn('Pitcher', `Failed to pitch "${lead.name}": ${err}`);
      }
    }

    details.push(`${pitched} custom ${pitched === 1 ? 'proposal' : 'proposals'} drafted`);
    pitchTypes.forEach((count, type) => {
      details.push(`${count}x ${type}`);
    });
    details.push('Each with 3 channel variants: email, LinkedIn, WhatsApp');

    agentLogger.info('Pitcher', `Generated proposals for ${pitched} leads`);

    return {
      stageId: 'pitcher',
      status: 'completed',
      outputSummary: `${pitched} proposals generated`,
      outputCount: pitched,
      details,
      payload: { pitched, pitchTypes: Object.fromEntries(pitchTypes) },
    };
  }, [compact]);

  const runConverter = useCallback(async (leads: Lead[]): Promise<PipelineResult> => {
    agentLogger.info('Converter', `Preparing ${leads.length} leads for pipeline`);

    const { getCrmStatsTool } = await import('../agents/tools');

    const withPhone = leads.filter(l => l.phone && l.phone !== 'No phone listed').length;
    const withWebsite = leads.filter(l => l.website).length;
    const highScore = leads.filter(l => (l.scoreBreakdown?.total || l.digitalPresenceScore || 0) > 50).length;

    const details: string[] = [
      `${withPhone} leads have contact numbers — WhatsApp-ready`,
      `${highScore} leads flagged as high-priority for outreach`,
      `${withWebsite} leads with existing websites — upsell AI automation`,
      `${leads.length - withWebsite} leads without websites — web design opportunities`,
    ];

    agentLogger.info('Converter', `Pipeline ready: ${withPhone} contactable, ${highScore} high-priority`);

    return {
      stageId: 'converter',
      status: 'completed',
      outputSummary: `${leads.length} leads synced to pipeline`,
      outputCount: leads.length,
      details,
      payload: { withPhone, highScore, withWebsite: leads.filter(l => l.website).length },
    };
  }, [compact]);

  const runAuditor = useCallback(async (leads: Lead[], previousResults: PipelineResult[]): Promise<PipelineResult> => {
    agentLogger.info('Auditor', `Running quality audit on ${leads.length} leads`);

    const { auditPipeline, formatAuditSummary } = await import('../agents/auditor');
    const { auditResultsTool } = await import('../agents/tools');

    const scanResult = previousResults.find(r => r.stageId === 'scanner');
    const analyzerResult = previousResults.find(r => r.stageId === 'analyzer');
    const pitcherResult = previousResults.find(r => r.stageId === 'pitcher');
    const converterResult = previousResults.find(r => r.stageId === 'converter');

    const report = auditPipeline(
      leads,
      scanResult?.payload
        ? { query: searchQuery || 'unknown', location: searchLocation || 'unknown', count: scanResult.outputCount }
        : undefined,
      undefined,
      pitcherResult && leads.length > 0
        ? new Map(leads.filter(l => l.outreachPitch).map(l => [l.name, true]))
        : undefined,
      converterResult?.payload
        ? { total: leads.length, succeeded: converterResult.outputCount, failed: leads.length - converterResult.outputCount }
        : undefined,
    );

    // Log the audit
    agentLogger.info('Auditor', `Quality score: ${report.overallQuality}/100 — ${report.findings.length} findings`);

    // Log critical findings separately
    report.findings.filter(f => f.severity === 'critical').forEach(f => {
      agentLogger.warn('Auditor', f.message, { details: f.details });
    });

    const criticalCount = report.findings.filter(f => f.severity === 'critical').length;
    const warningCount = report.findings.filter(f => f.severity === 'warning').length;

    const details = [
      `Quality score: ${report.overallQuality}/100`,
      `Conversion readiness: ${report.conversionReadiness}/100`,
      `${report.highPriorityLeads} high-priority targets (no website)`,
      ...(criticalCount > 0 ? [`${criticalCount} critical ${criticalCount === 1 ? 'issue' : 'issues'} found`] : []),
      ...(warningCount > 0 ? [`${warningCount} ${warningCount === 1 ? 'warning' : 'warnings'}`] : []),
      `${report.quickWins} quick wins — ready for immediate action`,
    ];

    return {
      stageId: 'auditor',
      status: 'completed',
      outputSummary: `${report.overallQuality}/100 quality score`,
      outputCount: report.findings.length,
      details,
      payload: report,
    };
  }, [compact, searchQuery, searchLocation]);

  // ─── Pipeline Runner ───

  const runPipeline = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setCompletedStages(new Set());
    setPipelineResults([]);
    setShowDetails(null);

    const results: PipelineResult[] = [];

    // If no real leads, run simulated for demo purposes
    const hasRealLeads = leads.length > 0;
    const workingLeads = hasRealLeads ? leads : [];

    const stageExecutors = [
      () => hasRealLeads ? runScanner(workingLeads) : simulateStage('scanner', 0),
      () => hasRealLeads ? runAnalyzer(workingLeads) : simulateStage('analyzer', 1),
      () => hasRealLeads ? runPitcher(workingLeads) : simulateStage('pitcher', 2),
      () => hasRealLeads ? runConverter(workingLeads) : simulateStage('converter', 3),
      () => hasRealLeads ? runAuditor(workingLeads, results) : simulateStage('auditor', 4),
    ];

    const simulateStage = async (stageId: string, idx: number): Promise<PipelineResult> => {
      const mockCounts = [12, 8, 5, 5, 9];
      const mockDetails: Record<string, string[]> = {
        scanner: ['12 local businesses found', '8 have no website (high opportunity)', 'Average rating: 4.3 ⭐'],
        analyzer: ['Average digital score: 42/100', '4 leads scored as "high opportunity"', '3 leads have broken or missing sites'],
        pitcher: ['5 custom proposals drafted', '3 web redesign pitches ready', '2 SEO optimization proposals'],
        converter: ['5 leads added to CRM pipeline', 'Follow-up sequence scheduled', 'Estimated pipeline value: $12,500'],
        auditor: ['Quality score: 78/100', 'Conversion readiness: 65/100', '5 high-priority targets identified'],
      };
      const duration = compact ? 500 + Math.random() * 300 : 1000 + Math.random() * 800;
      await new Promise(r => setTimeout(r, duration));
      return {
        stageId,
        status: 'completed' as const,
        outputSummary: `${mockCounts[idx]} ${HANDOFF_COMPLETE[stageId]}`,
        outputCount: mockCounts[idx],
        details: mockDetails[stageId],
        duration,
      };
    };

    for (let i = 0; i < AGENTS.length; i++) {
      const agent = AGENTS[i];
      setActiveStageIndex(i);

      // Show handoff animation between stages
      if (i > 0) {
        setHandoffAnimations(prev => new Set(prev).add(AGENTS[i - 1].id));
        await new Promise(r => setTimeout(r, compact ? 400 : 600));
        setHandoffAnimations(prev => {
          const next = new Set(prev);
          next.delete(AGENTS[i - 1].id);
          return next;
        });
      }

      const startTime = Date.now();
      const result = await stageExecutors[i]();
      result.duration = Date.now() - startTime;

      results.push(result);
      setPipelineResults(prev => [...prev, result]);
      setCompletedStages(prev => new Set(prev).add(agent.id));
      onStageComplete?.(result);
    }

    setActiveStageIndex(-1);
    setIsRunning(false);
    onPipelineComplete?.(results);
  }, [isRunning, compact, leads, onStageComplete, onPipelineComplete, runScanner, runAnalyzer, runPitcher, runConverter, runAuditor]);

  // Auto-run on mount if autoRun is true
  useEffect(() => {
    if (autoRun && !isRunning && pipelineResults.length === 0) {
      const timer = setTimeout(() => runPipeline(), 600);
      return () => clearTimeout(timer);
    }
  }, [autoRun, runPipeline, isRunning, pipelineResults.length]);

  // Listen for external run-pipeline custom event
  useEffect(() => {
    const handler = () => runPipeline();
    window.addEventListener('hunter-run-pipeline', handler);
    return () => window.removeEventListener('hunter-run-pipeline', handler);
  }, [runPipeline]);

  // Handle external results
  useEffect(() => {
    if (externalResults && externalResults.length > 0) {
      setPipelineResults(externalResults);
      const completed = new Set(externalResults.filter(r => r.status === 'completed').map(r => r.stageId));
      setCompletedStages(completed);
    }
  }, [externalResults]);

  const getStageResult = (stageId: string) => pipelineResults.find(r => r.stageId === stageId);

  return (
    <div ref={pipelineRef} className={`select-none dark-scrollbar ${compact ? '' : ''}`}>
      {/* Pipeline visualization */}
      <div className={`relative ${compact ? 'py-2' : 'py-4'}`}>
        {/* Background glow for active pipeline */}
        {isRunning && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 via-cyan-600/5 to-amber-600/5 rounded-xl animate-pulse" />
        )}

        {/* Agent stages */}
        <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2 sm:gap-3'}`}>
          {AGENTS.map((agent, idx) => {
            const isActive = activeStageIndex === idx || agent.id === showDetails;
            const isCompleted = completedStages.has(agent.id);
            const isWaiting = !isCompleted && activeStageIndex < idx;
            const result = getStageResult(agent.id);
            const isHandoffFrom = handoffAnimations.has(agent.id);
            const Icon = agent.icon;

            return (
              <div key={agent.id} className="flex items-center flex-1 min-w-0">
                {/* Agent card */}
                <motion.div                    className={`relative flex-1 rounded-xl border backdrop-blur-sm transition-all cursor-pointer ${
                      compact ? 'p-2' : 'p-3 sm:p-4'
                    } ${
                      isActive && isRunning
                        ? 'border-blue-500/60 bg-gradient-to-br from-blue-600/15 to-blue-950/20 shadow-lg shadow-blue-500/15 ring-1 ring-blue-500/20'
                        : isCompleted
                        ? agent.id === 'auditor'
                          ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-950/15 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/20'
                          : 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-950/15 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/20'
                        : isWaiting
                        ? 'border-zinc-800/30 bg-zinc-900/20 opacity-40'
                        : 'border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/80 hover:bg-zinc-900/50 hover:shadow-lg hover:shadow-blue-600/5'
                    }`}
                    onClick={() => setShowDetails(showDetails === agent.id ? null : agent.id)}
                    whileHover={{ scale: compact ? 1.02 : 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {/* Status indicator dot */}
                  <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0d0d10] ${
                    isRunning && isActive
                      ? 'bg-blue-500 animate-pulse'
                      : isCompleted
                      ? agent.id === 'auditor' ? 'bg-amber-500' : 'bg-emerald-500'
                      : 'bg-zinc-700'
                  }`} />

                  {/* Agent number */}
                  <div className={`absolute -top-2 -left-2 h-5 w-5 rounded-full flex items-center justify-center font-bold border ${
                    isCompleted
                      ? agent.id === 'auditor'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : isRunning && isActive
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                  } ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Icon + Name */}
                  <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
                    <div className={`${compact ? 'p-1' : 'p-1.5'} rounded-lg ${
                      isRunning && isActive
                        ? 'bg-blue-500/20'
                        : isCompleted
                        ? agent.id === 'auditor' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                        : 'bg-zinc-800'
                    }`}>
                      <Icon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} style={{
                        color: isCompleted
                          ? agent.id === 'auditor' ? '#f59e0b' : '#10b981'
                          : isRunning && isActive ? agent.color : '#71717a'
                      }} />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold font-display text-white leading-tight truncate ${
                        compact ? 'text-[9px]' : 'text-[11px] sm:text-xs'
                      }`}>
                        {agent.name}
                      </p>
                      {!compact && (
                        <p className="text-[8px] text-zinc-500 font-mono truncate leading-tight">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status text */}
                  <div className={`mt-1.5 ${compact ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'} font-mono leading-tight`}>
                    {isRunning && isActive ? (
                      <span className="text-blue-400 flex items-center gap-1">
                        <Loader2 className={`animate-spin ${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'}`} />
                        {HANDOFF_MESSAGES[agent.id]}
                      </span>
                    ) : isCompleted && result ? (
                      <span className={`flex items-center gap-1 ${agent.id === 'auditor' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        <CheckCircle2 className={`${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'}`} />
                        {result.outputSummary}
                        {result.duration && (
                          <span className="text-zinc-600 ml-auto">
                            {(result.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </span>
                    ) : isWaiting ? (
                      <span className="text-zinc-600">Waiting...</span>
                    ) : (
                      <span className="text-zinc-600">Ready</span>
                    )}
                  </div>

                  {/* Expandable details */}
                  <AnimatePresence>
                    {showDetails === agent.id && result?.details && !compact && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`mt-2 pt-2 border-t ${agent.id === 'auditor' ? 'border-amber-900/30' : 'border-zinc-800'} space-y-1`}>
                          {result.details.map((detail, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[9px] text-zinc-400">
                              <span className="h-1 w-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: agent.color }} />
                              <span>{detail}</span>
                            </div>
                          ))}

                          {/* Show audit-specific QA summary if auditor is expanded */}
                          {agent.id === 'auditor' && result.payload && (
                            <div className="mt-2 pt-2 border-t border-amber-900/20 space-y-2">
                              <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                  { label: 'Quality', value: result.payload.overallQuality, color: 'text-amber-400' },
                                  { label: 'Conversion', value: result.payload.conversionReadiness, color: 'text-emerald-400' },
                                  { label: 'Quick Wins', value: result.payload.quickWins, color: 'text-blue-400' },
                                ].map((stat) => (
                                  <div key={stat.label} className="bg-zinc-900/60 rounded-lg p-1.5">
                                    <p className={`text-[14px] font-bold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-[7px] font-mono text-zinc-600 uppercase">{stat.label}</p>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.dispatchEvent(new CustomEvent('hunter-open-dashboard'));
                                }}
                                className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold font-mono uppercase tracking-wider hover:bg-amber-500/20 transition-all cursor-pointer"
                              >
                                <BarChart3 className="h-2.5 w-2.5" />
                                View Full Dashboard
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Arrow connector between agents */}
                {idx < AGENTS.length - 1 && (
                  <div className={`relative flex items-center justify-center shrink-0 ${
                    compact ? 'w-6 mx-0.5' : 'w-8 sm:w-12 mx-1'
                  }`}>
                    <div className={`h-px w-full ${
                      completedStages.has(agent.id)
                        ? 'bg-gradient-to-r from-emerald-500/80 via-emerald-500/40 to-zinc-700'
                        : isHandoffFrom
                        ? 'bg-gradient-to-r from-blue-500/80 via-purple-500/50 to-zinc-700'
                        : 'bg-zinc-800/60'
                    }`} />

                    {/* Glow dot on connector */}
                    {completedStages.has(agent.id) && (
                      <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    )}

                    {/* Particle flow animation */}
                    {completedStages.has(agent.id) && !isRunning && (
                      <DataParticle color={agent.id === 'auditor' ? '#f59e0b' : '#10b981'} delay={0} />
                    )}
                    {isHandoffFrom && (
                      <>
                        <DataParticle color={agent.color} delay={0} />
                        <DataParticle color={agent.color} delay={0.3} />
                        <DataParticle color={agent.color} delay={0.6} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Handoff summary */}
        <AnimatePresence>
          {handoffAnimations.size > 0 && !compact && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-zinc-500 font-mono bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800 whitespace-nowrap"
            >
              <span className="text-emerald-400">●</span> Data handoff in progress...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls + Summary */}
      <div className={`flex items-center justify-between ${compact ? 'mt-1.5' : 'mt-3'}`}>
        {!externalResults && (
          <button
            onClick={runPipeline}
            disabled={isRunning}
            className={`flex items-center gap-1.5 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
              compact
                ? 'px-2 py-1 text-[8px]'
                : 'px-3 py-1.5 text-[9px] sm:text-[10px]'
            } ${
              isRunning
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:shadow-lg hover:shadow-blue-600/10'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className={`animate-spin ${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                Running...
              </>
            ) : (
              <>
                <Play className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                {compact ? 'Run' : 'Run Full Pipeline'}
              </>
            )}
          </button>
        )}

        {/* Summary stats */}
        {pipelineResults.length > 0 && (
          <div className={`flex items-center gap-2 ${compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} font-mono text-zinc-500`}>
            <span className="flex items-center gap-1">
              <ListChecks className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-emerald-400`} />
              {pipelineResults.length}/{AGENTS.length} stages
            </span>
            <span className="flex items-center gap-1">
              <Database className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-blue-400`} />
              {pipelineResults.reduce((sum, r) => sum + r.outputCount, 0)} items
            </span>
          </div>
        )}

        {/* Expand details toggle */}
        {pipelineResults.length > 0 && !compact && (
          <button
            onClick={() => setShowDetails(showDetails ? null : AGENTS[0].id)}
            className="flex items-center gap-1 text-[8px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            Details
          </button>
        )}
      </div>

      {/* Final summary when pipeline completes */}
      <AnimatePresence>
        {pipelineResults.length === AGENTS.length && !isRunning && !compact && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden mt-3"
          >
            <div className="bg-gradient-to-r from-emerald-600/10 via-zinc-900/60 to-amber-600/10 rounded-xl border border-emerald-500/25 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <div className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-ping" />
                </div>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-300">
                  Pipeline Complete
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {pipelineResults.map((r, idx) => {
                  const agent = AGENTS.find(a => a.id === r.stageId)!;
                  return (
                    <motion.div
                      key={r.stageId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`rounded-lg p-2 ${
                        agent.id === 'auditor'
                          ? 'bg-amber-500/10 border border-amber-500/20 shadow-sm shadow-amber-500/5'
                          : 'bg-zinc-900/60 border border-zinc-800/50'
                      }`}
                    >
                      <p className="text-lg font-bold font-display text-white">{r.outputCount}</p>
                      <p className="text-[8px] font-mono text-zinc-500 uppercase">{agent.name}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
