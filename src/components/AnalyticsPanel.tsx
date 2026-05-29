import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, CircleDollarSign, CalendarRange, CheckCircle2,
  AlertOctagon, Globe, Inbox, Sparkles
} from 'lucide-react';
import { Lead, DashboardStats, LeadSource } from '../types';

interface AnalyticsPanelProps {
  leads: Lead[];
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

  // Transform CRM leads to Recharts format:
  // 1. Pipeline status distribution
  const pipelineChartData = [
    { name: 'Opportunities', value: leads.filter(l => l.status === 'new').length, fill: '#3b82f6' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, fill: '#eab308' },
    { name: 'Replied', value: leads.filter(l => l.status === 'replied').length, fill: '#8b5cf6' },
    { name: 'Meetings', value: leads.filter(l => l.status === 'interested').length, fill: '#10b981' },
    { name: 'Closed Won', value: leads.filter(l => l.status === 'closed').length, fill: '#4f46e5' }
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

  // 2. Website presence ratio
  const websiteCount = leads.filter(l => l.website).length;
  const noWebsiteCount = leads.filter(l => !l.website).length;
  const websiteChartData = [
    { name: 'No Website (High Value)', value: noWebsiteCount, color: '#f43f5e' },
    { name: 'Has Website', value: websiteCount, color: '#10b981' }
  ];

  // 3. Projected Pipeline Revenue Over Time
  const getRevenueTimeData = () => {
    if (leads.length === 0) return [];

    // Sort leads chronologically
    const sorted = [...leads].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Group raw incremental values at each unique date node
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
    
    // Formulate a running financial accumulation
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

    // If only 1 data point is present, prepend coordinate zero for a smooth ramp graphic
    if (finalPoints.length === 1) {
      return [
        { date: 'Initial', 'Projected Pipeline Revenue': 0, 'Closed Deals': 0 },
        ...finalPoints
      ];
    }
    
    return finalPoints;
  };

  const revenueTimeData = getRevenueTimeData();

  // Calculate real-time financial stats and variance for high-density monitoring KPI
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

    return {
      totalProj,
      totalReal,
      variance: totalProj - totalReal
    };
  };

  const { totalProj, totalReal, variance } = getFinancialVariance();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0C0C0E]/40 rounded-xl border border-zinc-800">
        <Sparkles className="h-8 w-8 text-blue-550 animate-spin mb-3" />
        <span className="text-xs text-zinc-500">Loading business metrics dashboard...</span>
      </div>
    );
  }

  return (
    <div id="analytics-statistics-dashboard" className="space-y-6 animate-fade-in">
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total leads */}
        <div className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 relative overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/40 border border-blue-900/30 text-blue-400 mb-2">
            <Inbox className="h-4.5 w-4.5" />
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total CRM leads</p>
          <p className="text-2xl font-mono font-bold text-white mt-0.5">{stats.totalLeads}</p>
          <span className="text-[9px] text-zinc-500 block mt-1.5 leading-normal">Total stored in business queue</span>
        </div>

        {/* Website Desficit */}
        <div className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 relative overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-450 mb-2">
            <Globe className="h-4.5 w-4.5" />
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">No Website Deficit</p>
          <p className="text-2xl font-mono font-bold text-rose-400 mt-0.5">{stats.noWebsite}</p>
          <span className="text-[9px] text-rose-300 block mt-1.5 leading-normal font-semibold">✨ Web design opportunities</span>
        </div>

        {/* Win-rate conversion */}
        <div className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 relative overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 mb-2">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Won Conversion rate</p>
          <p className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">{stats.conversionRate}%</p>
          <span className="text-[9px] text-zinc-500 block mt-1.5 leading-normal">Percentage of closed deals</span>
        </div>

        {/* Projected Pipeline Cash */}
        <div className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 relative overflow-hidden bg-gradient-to-br from-blue-950/10 to-zinc-950 border-blue-900/20">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
            <CircleDollarSign className="h-4.5 w-4.5" />
          </div>
          <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Projected Revenue Pool</p>
          <p className="text-2xl font-mono font-bold text-blue-350 mt-0.5">
            ${stats.estimatedPipelineRevenue.toLocaleString()}
          </p>
          <span className="text-[9px] text-blue-300 block mt-1.5 leading-normal font-bold">Inferred proposal pipeline</span>
        </div>
      </div>        {/* Recharts Data Visualization block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Column pipeline stats */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-800 bg-[#0C0C0E] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4.5 w-4.5 text-zinc-500" />
            <span className="text-xs font-sans font-bold text-white">CRM Status Share</span>
          </div>

          <div className="h-[250px] w-full">
            {leads.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500 italic select-none">
                Add leads to display chart
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#e4e4e7', fontSize: '11px' }}
                    labelStyle={{ color: '#71717a', fontSize: '10px' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Source Distribution Pie */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-800 bg-[#0C0C0E] p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-zinc-500" />
              <span className="text-xs font-sans font-bold text-white">Lead Source Distribution</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
              Breakdown by acquisition channel (Google Maps, LinkedIn, Facebook, AI).
            </p>
          </div>

          <div className="h-[180px] w-full flex items-center justify-center relative">
            {leads.length === 0 ? (
              <div className="text-xs text-zinc-500 italic select-none">No active metrics yet</div>
            ) : sourceChartData.length === 0 ? (
              <div className="text-xs text-zinc-500 italic">No source data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceChartData.map((entry, idx) => (
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

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-zinc-800">
            {sourceChartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span>{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Projected Pipeline Revenue Growth & Cash Realization Area Chart */}
      <div className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-sans font-bold text-white block">Projected Revenue Growth & Cash Realization</span>
              <p className="text-[10px] text-zinc-500 mt-0.5">Chronologically tracks cumulative potential vs secured closed contract volume</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400">
            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
              <span>Projected Pipeline</span>
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 text-indigo-400">
              <span className="h-2 w-2 rounded-full bg-[#4f46e5] shrink-0"></span>
              <span>Closed Realized</span>
            </div>
          </div>
        </div>

        {/* Real-time high-density Revenue Variance KPI Dashboard */}
        <div id="analytics-revenue-variance-kpi bg-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#09090B]/60 border border-zinc-900 font-sans">
          <div id="kpi-projected-revenue-block" className="p-2.5 rounded-md bg-zinc-950/40 border border-zinc-900 flex flex-col justify-between">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold font-mono">Projected Pool</span>
            <span className="text-sm font-mono font-bold text-blue-400 mt-1">${totalProj.toLocaleString()}</span>
          </div>
          <div id="kpi-realized-deals-block" className="p-2.5 rounded-md bg-zinc-950/40 border border-zinc-900 flex flex-col justify-between">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold font-mono">Realized Won Contracts</span>
            <span className="text-sm font-mono font-bold text-indigo-400 mt-1">${totalReal.toLocaleString()}</span>
          </div>
          <div id="kpi-revenue-variance-block" className="p-2.5 rounded-md bg-blue-950/15 border border-blue-900/35 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-2 top-2 h-4.5 w-4.5 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/15 animate-pulse" />
            <span className="text-[10px] text-blue-300 uppercase tracking-wider font-black font-mono">Revenue Variance</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-sm font-mono font-bold text-white">${variance.toLocaleString()}</span>
              {totalProj > 0 && (
                <span className="text-[8.5px] font-mono text-zinc-400 font-bold">
                  ({Math.round((variance / totalProj) * 100)}% pending)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          {leads.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500 italic select-none">
              No active pipeline deals yet to plot revenue history
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTimeData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={{ stroke: '#27272a' }}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={{ stroke: '#27272a' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7', fontSize: '11px' }}
                  labelStyle={{ color: '#71717a', fontSize: '10px' }}
                />
                <Area 
                  name="Projected Pipeline Revenue"
                  type="monotone" 
                  dataKey="Projected Pipeline Revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProjected)" 
                />
                <Area 
                  name="Closed Realized"
                  type="monotone" 
                  dataKey="Closed Deals" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorClosed)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
