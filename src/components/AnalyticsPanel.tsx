import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, AlertOctagon, Globe, Inbox, Sparkles, Zap, Target,
  BarChart3, Activity, DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';
import { Lead, DashboardStats } from '../types';

interface AnalyticsPanelProps {
  leads: Lead[];
}

// ─── Stat Card Component ───
const ACCENT_STYLES = {
  blue: { container: 'bg-blue-500/10 border-blue-500/20 text-blue-400', glow: 'bg-blue-500/5', dot: 'bg-blue-500', shadow: 'hover:shadow-blue-500/5', hex: '#3b82f6' },
  rose: { container: 'bg-rose-500/10 border-rose-500/20 text-rose-400', glow: 'bg-rose-500/5', dot: 'bg-rose-500', shadow: 'hover:shadow-rose-500/5', hex: '#f43f5e' },
  emerald: { container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', glow: 'bg-emerald-500/5', dot: 'bg-emerald-500', shadow: 'hover:shadow-emerald-500/5', hex: '#10b981' },
  violet: { container: 'bg-violet-500/10 border-violet-500/20 text-violet-400', glow: 'bg-violet-500/5', dot: 'bg-violet-500', shadow: 'hover:shadow-violet-500/5', hex: '#8b5cf6' },
} as const;

function StatCard({ icon, label, value, subtext, accentColor, gradient }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  accentColor: keyof typeof ACCENT_STYLES;
  gradient: string;
}) {
  const styles = ACCENT_STYLES[accentColor];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-xl border ${gradient} p-4 sm:p-5 group hover:shadow-xl ${styles.shadow} transition-all duration-400 backdrop-blur-sm cinematic-card`}
    >
      {/* Cinematic shimmer overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      {/* Glow effect on hover */}
      <div className={`absolute -top-24 -right-24 h-48 w-48 rounded-full ${styles.glow} blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      {/* Subtle grid dots */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${styles.hex} 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      <div className="relative z-10">
        <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${styles.container} mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          {icon}
        </div>
        <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">{label}</p>
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-white mt-0.5 sm:mt-1 tracking-tight">
          {value}
        </p>
        <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-1.5 sm:mt-2 leading-relaxed flex items-center gap-1">
          <span className={`relative flex h-2 w-2`}>
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${styles.dot} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${styles.dot}`} />
          </span>
          {subtext}
        </p>
      </div>
    </motion.div>
  );
}

export default function AnalyticsPanel({ leads }: AnalyticsPanelProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    noWebsite: 0,
    contactedLeads: 0,
    repliesReceived: 0,
    meetingsBooked: 0,
    conversionRate: 0,
    estimatedPipelineRevenue: 0,
    leadsBySource: [],
    avgLeadScore: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load statistics panel metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [leads]);

  // Pipeline status distribution
  const pipelineChartData = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length, fill: '#3b82f6' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, fill: '#eab308' },
    { name: 'Replied', value: leads.filter(l => l.status === 'replied').length, fill: '#8b5cf6' },
    { name: 'Interested', value: leads.filter(l => l.status === 'interested').length, fill: '#10b981' },
    { name: 'Closed', value: leads.filter(l => l.status === 'closed').length, fill: '#4f46e5' }
  ];

  // Source Distribution
  const sourceLabels: Record<string, string> = {
    google_maps: 'Google Maps',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    ai_search: 'AI Search',
    manual_import: 'Manual',
    csv_import: 'CSV Import'
  };
  const sourceColors: Record<string, string> = {
    google_maps: '#34a853',
    linkedin: '#0a66c2',
    facebook: '#1877f2',
    ai_search: '#8b5cf6',
    manual_import: '#f59e0b',
    csv_import: '#6b7280'
  };
  const sourceCount: Record<string, number> = {};
  leads.forEach(l => {
    const src = l.source || 'ai_search';
    sourceCount[src] = (sourceCount[src] || 0) + 1;
  });
  const sourceChartData = Object.entries(sourceCount).map(([key, value]) => ({
    name: sourceLabels[key] || key,
    value,
    color: sourceColors[key] || '#6b7280'
  }));

  // Website presence ratio
  const websiteCount = leads.filter(l => l.website).length;
  const noWebsiteCount = leads.filter(l => !l.website).length;
  const websiteChartData = [
    { name: 'No Website', value: noWebsiteCount, color: '#f43f5e' },
    { name: 'Has Website', value: websiteCount, color: '#10b981' }
  ];

  // Pipeline Revenue Over Time
  const getRevenueTimeData = () => {
    if (leads.length === 0) return [];

    const sorted = [...leads].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const grouped: { [key: string]: { date: string, incrementalRevenue: number, closedRevenue: number } } = {};

    sorted.forEach((lead) => {
      if (!lead.createdAt) return;
      const dt = new Date(lead.createdAt);
      const key = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      let val = 0;
      let closedVal = 0;
      if (lead.status === 'closed') {
        const full = lead.serviceType === 'web_design' ? 1500 : lead.serviceType === 'ai_automation' ? 2500 : 4000;
        val = full;
        closedVal = full;
      } else if (lead.status === 'interested') {
        val = (lead.serviceType === 'web_design' ? 1500 : lead.serviceType === 'ai_automation' ? 2500 : 4000) * 0.5;
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, incrementalRevenue: 0, closedRevenue: 0 };
      }
      grouped[key].incrementalRevenue += val;
      grouped[key].closedRevenue += closedVal;
    });

    const dataPoints = Object.values(grouped);
    let totalProjected = 0;
    let totalClosed = 0;
    const finalPoints = dataPoints.map(dp => {
      totalProjected += dp.incrementalRevenue;
      totalClosed += dp.closedRevenue;
      return {
        date: dp.date,
        'Projected Pipeline Revenue': totalProjected,
        'Closed Deals': totalClosed
      };
    });

    if (finalPoints.length === 1) {
      return [
        { date: 'Start', 'Projected Pipeline Revenue': 0, 'Closed Deals': 0 },
        ...finalPoints
      ];
    }

    return finalPoints;
  };

  const revenueTimeData = getRevenueTimeData();

  // Financial variance
  const getFinancialVariance = () => {
    let totalProj = 0;
    let totalReal = 0;
    leads.forEach((lead) => {
      const full = lead.serviceType === 'web_design' ? 1500 : lead.serviceType === 'ai_automation' ? 2500 : 4000;
      if (lead.status === 'closed') {
        totalProj += full;
        totalReal += full;
      } else if (lead.status === 'interested') {
        totalProj += full * 0.5;
      }
    });
    return { totalProj, totalReal, variance: totalProj - totalReal };
  };

  const { totalProj, totalReal, variance } = getFinancialVariance();

  // Get chart colors based on gradient classes (avoid dynamic classes)
  const chartColors = {
    projected: '#3b82f6',
    closed: '#4f46e5',
    gradientProjFrom: '#3b82f6',
    gradientClosedFrom: '#4f46e5',
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0C0C0E]/40 rounded-xl border border-zinc-800">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="h-8 w-8 text-blue-500 mb-3" />
        </motion.div>
        <span className="text-xs text-zinc-500 font-mono">Loading analytics dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in dark-scrollbar">
      
      {/* ─── Hero Section ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-950 via-[#0C0C0E] to-blue-950/30 p-5 sm:p-7 shadow-xl shadow-blue-600/5"
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/8 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '3s' }} />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">Live Dashboard</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-white tracking-tight">
              Pipeline <span className="text-gradient">Analytics</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-lg leading-relaxed">
              Real-time intelligence on your lead pipeline, conversion metrics, and revenue forecasting.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                {leads.length} Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <Activity className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                Live
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── KPI Metrics Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<Inbox className="h-4 w-4 sm:h-5 sm:w-5" />}
          label="Total Leads"
          value={stats.totalLeads}
          subtext="Active pipeline entries"
          accentColor="blue"
          gradient="border-zinc-800 bg-[#0C0C0E]"
        />
        <StatCard
          icon={<Globe className="h-4 w-4 sm:h-5 sm:w-5" />}
          label="No Website"
          value={stats.noWebsite}
          subtext="Web design opportunities"
          accentColor="rose"
          gradient="border-zinc-800 bg-[#0C0C0E]"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
          label="Conversion Rate"
          value={`${stats.conversionRate}%`}
          subtext="Closed vs total pipeline"
          accentColor="emerald"
          gradient="border-zinc-800 bg-[#0C0C0E]"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
          label="Pipeline Revenue"
          value={`$${stats.estimatedPipelineRevenue.toLocaleString()}`}
          subtext="Total projected value"
          accentColor="violet"
          gradient="border-zinc-800 bg-[#0C0C0E]"
        />
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Pipeline Status Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-7 rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 sm:p-5 hover:border-zinc-700/50 transition-colors duration-300 dark-scrollbar"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white font-sans block">Pipeline Status</span>
                <p className="text-[9px] text-zinc-500 font-mono">Lead distribution by stage</p>
              </div>
            </div>
          </div>

          <div className="h-[220px] sm:h-[250px] w-full">
            {leads.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600 italic font-mono">
                <Inbox className="h-5 w-5 text-zinc-700 mr-2" />
                No leads to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={{ stroke: '#27272a' }} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={{ stroke: '#27272a' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    itemStyle={{ color: '#e4e4e7', fontSize: '11px' }}
                    labelStyle={{ color: '#71717a', fontSize: '10px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1200}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Source Distribution Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-5 rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 sm:p-5 flex flex-col hover:border-zinc-700/50 transition-colors duration-300"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white font-sans block">Lead Sources</span>
              <p className="text-[9px] text-zinc-500 font-mono">Acquisition channel breakdown</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[160px] sm:h-[180px] w-full">
              {leads.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600 italic font-mono">
                  No source data
                </div>
              ) : sourceChartData.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600 italic font-mono">
                  <AlertOctagon className="h-4 w-4 text-zinc-700 mr-2" />
                  No source data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={1200}
                    >
                      {sourceChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                      itemStyle={{ color: '#e4e4e7', fontSize: '11px' }}
                      formatter={(value: any) => [`${value} leads`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-zinc-800/60 w-full">
              {sourceChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold text-zinc-400">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}</span>
                  <span className="text-zinc-600 font-mono">({entry.value})</span>
                </div>
              ))}
              {sourceChartData.length === 0 && leads.length > 0 && (
                <span className="text-[10px] text-zinc-600 italic font-mono">No source data available</span>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Website Presence & Revenue Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Website Presence Ratio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-4 rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 sm:p-5 flex flex-col hover:border-zinc-700/50 transition-colors duration-300"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white font-sans block">Website Presence</span>
              <p className="text-[9px] text-zinc-500 font-mono">Digital maturity overview</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[160px] sm:h-[180px] w-full">
              {leads.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600 italic font-mono">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={websiteChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1200}
                    >
                      {websiteChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#e4e4e7', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {leads.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t border-zinc-800/60 w-full">
                {websiteChartData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold text-zinc-400">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}</span>
                    <span className="text-zinc-600 font-mono">({entry.value})</span>
                  </div>
                ))}
              </div>
            )}
            
            {noWebsiteCount > 0 && (
              <div className="mt-3 w-full p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15">
                <p className="text-[9px] sm:text-[10px] text-rose-300 font-semibold text-center">
                  <Zap className="h-3 w-3 inline mr-1" />
                  {noWebsiteCount} leads need websites — web design opportunities
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Revenue Growth Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-8 rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 sm:p-5 hover:border-zinc-700/50 transition-colors duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white font-sans block">Revenue Growth</span>
                <p className="text-[9px] text-zinc-500 font-mono">Cumulative pipeline vs closed deals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px]">
              <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="text-blue-400 font-bold font-mono">Pipeline</span>
              </div>
              <div className="flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span className="text-indigo-400 font-bold font-mono">Closed</span>
              </div>
            </div>
          </div>

          <div className="h-[220px] sm:h-[260px] w-full">
            {leads.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600 italic font-mono">
                <DollarSign className="h-5 w-5 text-zinc-700 mr-2" />
                No revenue data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTimeData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{ stroke: '#27272a' }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    itemStyle={{ color: '#e4e4e7', fontSize: '11px' }}
                    labelStyle={{ color: '#71717a', fontSize: '10px' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    name="Projected Pipeline Revenue"
                    type="monotone" 
                    dataKey="Projected Pipeline Revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorProjected)" 
                    animationDuration={1500}
                  />
                  <Area 
                    name="Closed Deals"
                    type="monotone" 
                    dataKey="Closed Deals" 
                    stroke="#4f46e5" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorClosed)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Revenue KPIs */}
          {totalProj > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-4 border-t border-zinc-800/60">
              <div className="p-2.5 sm:p-3 rounded-lg bg-blue-950/10 border border-blue-900/25 text-center">
                <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold font-mono">Projected</p>
                <p className="text-sm sm:text-base font-bold font-display text-blue-400 mt-0.5">${totalProj.toLocaleString()}</p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-indigo-950/10 border border-indigo-900/25 text-center">
                <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold font-mono">Closed Won</p>
                <p className="text-sm sm:text-base font-bold font-display text-indigo-400 mt-0.5">${totalReal.toLocaleString()}</p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-amber-950/10 border border-amber-900/25 text-center">
                <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold font-mono">Variance</p>
                <p className="text-sm sm:text-base font-bold font-display text-amber-400 mt-0.5">${variance.toLocaleString()}</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
