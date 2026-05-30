import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Zap,
  ClipboardCheck,
  PenTool,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Activity,
  Cpu,
  Network,
  Workflow,
  Shield,
  Target
} from 'lucide-react';

/**
 * AgentProcessFlow — Animated infographic demonstrating the 5-agent
 * collaborative workflow of the AI Client Hunter system.
 */

interface AgentNode {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Search;
  color: string;
  gradient: string;
  description: string;
  details: string[];
}

const AGENTS: AgentNode[] = [
  {
    id: 'scanner',
    title: 'Scanner',
    subtitle: 'Map Discovery',
    icon: Search,
    color: '#3b82f6',
    gradient: 'from-blue-600 to-blue-400',
    description: 'Scans Google Maps in real-time for any city or region to find local businesses with weak digital presence.',
    details: [
      'Crawls Google Maps listings by niche & location',
      'Extracts ratings, reviews, websites, and contact data',
      'Flags businesses with no website or broken links',
      'Discovers 100+ leads per scan in under 2 seconds'
    ]
  },
  {
    id: 'analyzer',
    title: 'Analyzer',
    subtitle: 'Digital Audit',
    icon: Zap,
    color: '#8b5cf6',
    gradient: 'from-purple-600 to-purple-400',
    description: 'Analyzes each lead\'s digital footprint — website speed, mobile responsiveness, SEO metadata, and more.',
    details: [
      'Measures page load speed and Core Web Vitals',
      'Checks mobile viewport meta tags and responsiveness',
      'Audits SEO metadata, structured data, and sitemaps',
      'Computes a Digital Presence Score (0–100)'
    ]
  },
  {
    id: 'auditor',
    title: 'Auditor',
    subtitle: 'Deficit Mapping',
    icon: ClipboardCheck,
    color: '#f59e0b',
    gradient: 'from-amber-500 to-yellow-400',
    description: 'Cross-references findings against best practices and generates a prioritized fix checklist.',
    details: [
      'Identifies image compression and WebP conversion needs',
      'Detects missing Google Maps pins and incorrect coordinates',
      'Flags broken external links and dead navigation paths',
      'Generates fix checklist sorted by revenue impact'
    ]
  },
  {
    id: 'pitcher',
    title: 'Pitcher',
    subtitle: 'Proposal Engine',
    icon: PenTool,
    color: '#06b6d4',
    gradient: 'from-cyan-600 to-cyan-400',
    description: 'Generates customized redesign proposals with wireframe previews and targeted outreach copy.',
    details: [
      'Creates bespoke Tailwind/React wireframe mockups',
      'Generates personalized outreach emails with audit findings',
      'Includes before/after performance comparisons',
      'Calculates estimated project ROI for the client'
    ]
  },
  {
    id: 'converter',
    title: 'Converter',
    subtitle: 'Pipeline Closing',
    icon: TrendingUp,
    color: '#10b981',
    gradient: 'from-emerald-600 to-emerald-400',
    description: 'Manages CRM pipeline progression with AI-powered follow-ups, meeting scheduling, and deal tracking.',
    details: [
      'Tracks lead status through 5-stage pipeline',
      'AI-generated summary briefs for each prospect',
      'Automated follow-up reminders and scheduling',
      'Real-time revenue projections and conversion analytics'
    ]
  }
];

interface AgentProcessFlowProps {
  onNavigate?: (tab: 'discovery' | 'crm' | 'analytics') => void;
}

export default function AgentProcessFlow({ onNavigate }: AgentProcessFlowProps) {
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [pulseIndex, setPulseIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection observer to animate nodes as they scroll into view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate nodes in sequence
            AGENTS.forEach((_, idx) => {
              setTimeout(() => {
                setVisibleNodes((prev) => {
                  const next = new Set(prev);
                  next.add(AGENTS[idx].id);
                  return next;
                });
              }, idx * 300);
            });
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    observerRef.current.observe(section);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Pulse animation cycling through agents
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % AGENTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="agent-process-flow"
      ref={sectionRef}
      className="relative overflow-hidden bg-zinc-950 py-24 sm:py-32"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 mb-4">
            <Workflow className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-mono tracking-widest text-blue-300/80 uppercase font-bold">
              Autonomous Agent Mesh
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-[1.1]">
            Five AI agents working in<br />
            <span className="neon-text">
              synchronized harmony
            </span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 font-light mt-4 max-w-xl mx-auto leading-relaxed">
            From map discovery to closed deal — each agent has a specialized role,
            communicating and passing data through a neural mesh.
          </p>
        </div>

        {/* Agent nodes flow — horizontal on desktop, vertical on mobile */}
        <div className="relative">
          {/* Connection wires (visible on desktop) */}
          <div className="hidden lg:block absolute top-[76px] left-[8%] right-[8%] h-px pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 1000 1" preserveAspectRatio="none">
              <defs>
                <linearGradient id="connectorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <line x1="0" y1="0" x2="1000" y2="0" stroke="url(#connectorGradient)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </div>

          {/* Agent cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-3 xl:gap-4">
            {AGENTS.map((agent, idx) => {
              const Icon = agent.icon;
              const isVisible = visibleNodes.has(agent.id);
              const isActive = activeAgent === agent.id;
              const isPulsing = pulseIndex === idx && !activeAgent;
              const showArrow = idx < AGENTS.length - 1;

              return (
                <div key={agent.id} className="relative">
                  <div
                    className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-500 cursor-pointer group ${
                      isVisible
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-8'
                    } ${
                      isActive
                        ? 'border-blue-500/50 bg-zinc-900 shadow-lg shadow-blue-500/5'
                        : isPulsing
                        ? 'border-blue-500/30 bg-zinc-900/80 shadow-md shadow-blue-500/5'
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                    style={{
                      transitionDelay: `${idx * 150}ms`,
                    }}
                    onClick={() => {
                      setActiveAgent(isActive ? null : agent.id);
                    }}
                    onMouseEnter={() => setActiveAgent(agent.id)}
                    onMouseLeave={() => setActiveAgent(null)}
                  >
                    {/* Pulse ring */}
                    {isPulsing && (
                      <div className="absolute -inset-0.5 rounded-2xl opacity-30 animate-pulse" style={{ backgroundColor: agent.color }} />
                    )}

                    {/* Agent number badge */}
                    <div className="absolute -top-2.5 -left-2.5 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border-2"
                      style={{
                        backgroundColor: agent.color + '20',
                        borderColor: agent.color + '50',
                        color: agent.color
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Icon */}
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3.5 transition-all duration-300 ${
                      isPulsing || isActive
                        ? 'shadow-lg'
                        : ''
                    }`}
                      style={{
                        background: `linear-gradient(135deg, ${agent.color}25, ${agent.color}10)`,
                        borderColor: agent.color + '30',
                        borderWidth: 1,
                        boxShadow: isPulsing || isActive ? `0 0 20px ${agent.color}20` : 'none'
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: agent.color }} />
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold font-display text-white mb-0.5">
                      {agent.title}
                    </h3>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-3"
                      style={{ color: agent.color }}
                    >
                      {agent.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
                      {agent.description}
                    </p>

                    {/* Expandable details — shown on hover/active */}
                    <div className={`overflow-hidden transition-all duration-300 ${
                      isActive ? 'max-h-[300px] mt-3.5 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="border-t border-zinc-800 pt-3 space-y-1.5">
                        {agent.details.map((detail, i) => (
                          <div key={i} className="flex items-start gap-2 text-[10px] text-zinc-300">
                            <span className="h-1 w-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: agent.color }} />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Launch button */}
                    <div className="mt-3 pt-3 border-t border-zinc-800/60">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigate) {
                            const tabMap: Record<string, 'discovery' | 'crm'> = {
                              scanner: 'discovery',
                              analyzer: 'discovery',
                              auditor: 'discovery',
                              pitcher: 'discovery',
                              converter: 'crm'
                            };
                            const tab = tabMap[agent.id];
                            if (tab) onNavigate(tab);
                          }
                        }}
                        className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.97] ${
                          isPulsing || isActive
                            ? 'text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        style={{
                          backgroundColor: (isPulsing || isActive) ? agent.color + '30' : 'transparent',
                          borderColor: agent.color + '30',
                          borderWidth: 1,
                        }}
                      >
                        Launch {agent.title}
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>

                  {/* Arrow connector between nodes (below on mobile, right on desktop) */}
                  {showArrow && (
                    <div className="hidden lg:flex absolute -right-[14px] top-[72px] z-10 items-center justify-center">
                      <div className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-500 ${
                        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                      }`}
                        style={{
                          borderColor: agent.color + '40',
                          backgroundColor: agent.color + '10',
                          transitionDelay: `${idx * 150 + 200}ms`
                        }}
                      >
                        <ArrowRight className="h-3 w-3" style={{ color: agent.color }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vertical arrows for mobile */}
          <div className="flex lg:hidden flex-col items-center gap-1 mt-2 mb-0">
            {AGENTS.slice(0, -1).map((agent, idx) => (
              <div key={idx} className={`transition-all duration-500 ${
                visibleNodes.has(agent.id) ? 'opacity-100' : 'opacity-0'
              }`}
                style={{ transitionDelay: `${idx * 150 + 100}ms` }}
              >
                <ArrowRight className="h-4 w-4 rotate-90 text-zinc-600" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats summary */}
        <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto transition-all duration-700 ${
          visibleNodes.size >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}>
          {[
            { value: '5', label: 'Specialized Agents', icon: Cpu, color: 'text-blue-400' },
            { value: 'Any City', label: 'Global Targeting', icon: Network, color: 'text-purple-400' },
            { value: '< 2s', label: 'Lead Scan Time', icon: Zap, color: 'text-amber-400' },
            { value: '30%+', label: 'Avg. Response Rate', icon: Target, color: 'text-emerald-400' },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="text-center bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                <StatIcon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                <p className="text-xl sm:text-2xl font-bold font-display text-white">{stat.value}</p>
                <p className="text-[10px] font-mono tracking-wider text-zinc-500 mt-0.5 uppercase">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Learn more CTA */}
        <div className={`mt-10 text-center transition-all duration-700 delay-500 ${
          visibleNodes.size >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <p className="text-xs text-zinc-500 font-mono">
            Each agent runs autonomously on OpenRouter / Groq • Mesh coordination by{' '}
            <span className="text-blue-400 font-bold">Bishop Orchestrator</span>
          </p>
        </div>
      </div>
    </section>
  );
}
