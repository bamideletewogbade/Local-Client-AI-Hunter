import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Target, BarChart3, PieChartIcon, Activity,
  ArrowUp, ArrowDown, MessageSquare, Mail, Linkedin,
  PhoneCall, Send, Clock, Calendar, CheckCircle2, AlertCircle,
  Sparkles, Eye, Pointer, Download, HeartPulse, Award,
  Lightbulb, Gauge, TrendingDown
} from 'lucide-react';
import { Campaign, OutreachChannel, ChannelEffectiveness, CampaignHealth, TrendComparison, SmartSendTiming } from '../types';

// ─── Channel Color Config ───

const CHANNEL_COLORS: Record<OutreachChannel, string> = {
  whatsapp: '#25D366',
  email: '#3B82F6',
  linkedin_dm: '#0A66C2',
  phone_call: '#8B5CF6',
  physical_visit: '#F59E0B',
};

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  linkedin_dm: 'LinkedIn DM',
  phone_call: 'Phone Call',
  physical_visit: 'Physical Visit',
};

const CHANNEL_ICONS: Record<OutreachChannel, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  linkedin_dm: <Linkedin className="h-3 w-3" />,
  phone_call: <PhoneCall className="h-3 w-3" />,
  physical_visit: <Send className="h-3 w-3" />,
};

// ─── Props ───

interface CampaignAnalyticsDashboardProps {
  campaigns: Campaign[];
}

// ─── Helpers ───

function computeCampaignHealth(campaigns: Campaign[]): CampaignHealth {
  if (campaigns.length === 0) {
    return { score: 0, label: 'Poor', color: '#EF4444', warnings: ['No campaigns created yet'], suggestions: ['Create your first multi-channel campaign'] };
  }

  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const inactiveCount = campaigns.filter(c => !c.isActive).length;
  if (inactiveCount > 0) {
    score -= inactiveCount * 10;
    warnings.push(`${inactiveCount} campaign(s) are paused`);
    suggestions.push('Reactivate paused campaigns to maintain outreach momentum');
  }

  const noSteps = campaigns.filter(c => c.steps.length === 0).length;
  if (noSteps > 0) {
    score -= noSteps * 15;
    warnings.push(`${noSteps} campaign(s) have no steps defined`);
    suggestions.push('Add at least 3 steps per campaign for effective sequencing');
  }

  const hasSingleChannel = campaigns.some(c => new Set(c.steps.map(s => s.channel)).size === 1);
  if (hasSingleChannel) {
    score -= 10;
    warnings.push('Some campaigns use only one channel');
    suggestions.push('Multi-channel campaigns get 3x higher reply rates — mix WhatsApp, Email, and LinkedIn');
  }

  const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + (c.stats?.converted || 0), 0);
  if (totalSent > 0 && totalConverted === 0) {
    score -= 10;
    warnings.push('Messages sent but zero conversions');
    suggestions.push('Review your message templates and add stronger CTAs');
  }

  const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.delivered || 0), 0);
  if (totalSent > 0 && totalDelivered < totalSent * 0.7) {
    score -= 10;
    warnings.push('Delivery rate below 70% — contacts may be invalid');
    suggestions.push('Verify phone numbers and email addresses for undelivered leads');
  }

  const noAutoAdvance = campaigns.filter(c => !c.autoAdvance?.enabled).length;
  if (noAutoAdvance === campaigns.length && campaigns.length > 0) {
    score -= 5;
    suggestions.push('Enable auto-advance to automatically progress through steps');
  }

  const now = Date.now();
  const staleCampaigns = campaigns.filter(c => c.updatedAt && (now - new Date(c.updatedAt).getTime()) > 30 * 24 * 60 * 60 * 1000).length;
  if (staleCampaigns > 0) {
    score -= 5 * staleCampaigns;
    warnings.push(`${staleCampaigns} campaign(s) not updated in 30+ days`);
    suggestions.push('Refresh stale campaigns with updated messaging and timing');
  }

  score = Math.max(0, Math.min(100, score));

  let label: CampaignHealth['label'];
  let color: string;
  if (score >= 80) { label = 'Excellent'; color = '#10B981'; }
  else if (score >= 60) { label = 'Good'; color = '#3B82F6'; }
  else if (score >= 40) { label = 'Fair'; color = '#F59E0B'; }
  else { label = 'Poor'; color = '#EF4444'; }

  return { score, label, color, warnings, suggestions };
}

function computeChannelEffectiveness(campaigns: Campaign[]): ChannelEffectiveness[] {
  const channelMap: Record<string, ChannelEffectiveness> = {};

  campaigns.forEach(c => {
    c.steps.forEach(step => {
      if (!channelMap[step.channel]) {
        channelMap[step.channel] = {
          channel: step.channel,
          totalSteps: 0,
          totalSent: 0,
          totalDelivered: 0,
          totalReplied: 0,
          totalConverted: 0,
          deliveryRate: 0,
          replyRate: 0,
          conversionRate: 0,
        };
      }
      channelMap[step.channel].totalSteps++;
    });
  });

  // Distribute stats proportionally across channels based on step count
  campaigns.forEach(c => {
    const totalSteps = c.steps.length;
    c.steps.forEach(step => {
      const entry = channelMap[step.channel];
      if (entry && totalSteps > 0) {
        const share = 1 / totalSteps;
        entry.totalSent += Math.round((c.stats?.sent || 0) * share);
        entry.totalDelivered += Math.round((c.stats?.delivered || 0) * share);
        entry.totalReplied += Math.round((c.stats?.replied || 0) * share);
        entry.totalConverted += Math.round((c.stats?.converted || 0) * share);
      }
    });
  });

  return Object.values(channelMap).map(ch => ({
    ...ch,
    deliveryRate: ch.totalSent > 0 ? Math.round((ch.totalDelivered / ch.totalSent) * 100) : 0,
    replyRate: ch.totalDelivered > 0 ? Math.round((ch.totalReplied / ch.totalDelivered) * 100) : 0,
    conversionRate: ch.totalReplied > 0 ? Math.round((ch.totalConverted / ch.totalReplied) * 100) : 0,
  })).sort((a, b) => b.totalSteps - a.totalSteps);
}

function computeTrendComparison(campaigns: Campaign[], period: '7d' | '30d' | 'all'): TrendComparison {
  const now = Date.now();
  const periodMs = period === '7d' ? 7 : 30;
  const periodDuration = periodMs * 24 * 60 * 60 * 1000;
  const prevDuration = periodDuration * 2;

  if (period === 'all') {
    const totalSent = campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0);
    const totalConverted = campaigns.reduce((s, c) => s + (c.stats?.converted || 0), 0);
    return {
      period: 'all',
      campaignsCreated: campaigns.length, campaignsCreatedPrev: 0,
      stepsAdded: campaigns.reduce((s, c) => s + c.steps.length, 0), stepsAddedPrev: 0,
      totalSent, totalSentPrev: 0,
      totalConverted, totalConvertedPrev: 0,
      sentGrowth: 0, convertedGrowth: 0,
    };
  }

  const current = campaigns.filter(c => (now - new Date(c.createdAt).getTime()) <= periodDuration);
  const previous = campaigns.filter(c => {
    const age = now - new Date(c.createdAt).getTime();
    return age > periodDuration && age <= prevDuration;
  });

  const sumStats = (list: Campaign[]) => ({
    campaignsCreated: list.length,
    stepsAdded: list.reduce((s, c) => s + c.steps.length, 0),
    totalSent: list.reduce((s, c) => s + (c.stats?.sent || 0), 0),
    totalConverted: list.reduce((s, c) => s + (c.stats?.converted || 0), 0),
  });

  const cur = sumStats(current);
  const prev = sumStats(previous);

  const sentGrowth = prev.totalSent > 0 ? Math.round(((cur.totalSent - prev.totalSent) / prev.totalSent) * 100) : cur.totalSent > 0 ? 100 : 0;
  const convertedGrowth = prev.totalConverted > 0 ? Math.round(((cur.totalConverted - prev.totalConverted) / prev.totalConverted) * 100) : cur.totalConverted > 0 ? 100 : 0;

  return {
    period,
    ...cur, ...prev,
    sentGrowth, convertedGrowth,
  };
}

function computeSmartTiming(campaigns: Campaign[]): SmartSendTiming[] {
  const timings: SmartSendTiming[] = [
    {
      channel: 'whatsapp',
      recommendedDay: 'Tuesday–Thursday',
      recommendedTime: '10:00 AM – 12:00 PM',
      reasoning: 'High open rates mid-week during business hours; avoid Monday mornings and Friday afternoons',
    },
    {
      channel: 'email',
      recommendedDay: 'Tuesday–Wednesday',
      recommendedTime: '8:00 AM – 10:00 AM',
      reasoning: 'Best open rates early morning mid-week when inboxes are fresh',
    },
    {
      channel: 'linkedin_dm',
      recommendedDay: 'Wednesday–Thursday',
      recommendedTime: '7:30 AM – 9:00 AM',
      reasoning: 'Professionals check LinkedIn before email; mid-week has highest engagement',
    },
    {
      channel: 'phone_call',
      recommendedDay: 'Tuesday–Thursday',
      recommendedTime: '10:00 AM – 11:30 AM, 2:00 PM – 4:00 PM',
      reasoning: 'Avoid lunch hours and end of day; mid-morning and mid-afternoon have best answer rates',
    },
    {
      channel: 'physical_visit',
      recommendedDay: 'Wednesday–Thursday',
      recommendedTime: '10:00 AM – 12:00 PM, 2:00 PM – 3:30 PM',
      reasoning: 'Business owners are most available mid-week; avoid Monday catch-up and Friday wind-down',
    },
  ];

  // Only return timings for channels used in campaigns
  const usedChannels = new Set<OutreachChannel>();
  campaigns.forEach(c => c.steps.forEach(s => usedChannels.add(s.channel)));

  return timings.filter(t => usedChannels.has(t.channel));
}

// ─── Metrics Card ───

function MetricCard({
  label, value, subtext, icon, trend, color = '#3B82F6', delay = 0,
}: {
  label: string; value: string | number; subtext?: string; icon: React.ReactNode;
  trend?: { value: number; isUp: boolean }; color?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 group"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(600px circle at 50% 0%, ${color}08, transparent)` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border"
            style={{ background: `${color}12`, borderColor: `${color}25`, color }}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              trend.isUp ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
            }`}>
              {trend.isUp ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {trend.value}%
            </div>
          )}
        </div>
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">{label}</p>
        <motion.p
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + delay * 0.08, type: 'spring', damping: 12 }}
          className="text-lg font-bold font-mono" style={{ color }}>
          {value}
        </motion.p>
        {subtext && <p className="text-[9px] text-zinc-600 mt-0.5">{subtext}</p>}
      </div>
    </motion.div>
  );
}

// ─── Health Gauge ───

function HealthGauge({ health }: { health: CampaignHealth }) {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (health.score / 100) * circumference;

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-[#09090B] border border-zinc-800">
      <div className="relative shrink-0">
        <svg width="72" height="72" className="transform -rotate-90">
          <circle cx="36" cy="36" r="28" fill="none" stroke="#1f2937" strokeWidth="6" />
          <circle cx="36" cy="36" r="28" fill="none" stroke={health.color} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold font-mono" style={{ color: health.color }}>{health.score}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Award className="h-3.5 w-3.5" style={{ color: health.color }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: health.color }}>{health.label}</span>
        </div>
        <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">
          {health.warnings.length > 0 ? health.warnings[0] : 'All campaigns healthy'}
        </p>
      </div>
    </div>
  );
}

// ─── Export to CSV ───

function exportCampaignsToCSV(campaigns: Campaign[]) {
  const headers = ['Campaign Name', 'Status', 'Steps', 'Channels', 'Total Duration (d)', 'Sent', 'Delivered', 'Replied', 'Converted', 'Created', 'Last Updated'];
  const rows = campaigns.map(c => [
    `"${c.name}"`,
    c.isActive ? 'Active' : 'Paused',
    c.steps.length,
    `"${[...new Set(c.steps.map(s => s.channel))].join(', ')}"`,
    c.steps.reduce((s, st) => s + st.delayDays, 0),
    c.stats?.sent || 0,
    c.stats?.delivered || 0,
    c.stats?.replied || 0,
    c.stats?.converted || 0,
    new Date(c.createdAt).toLocaleDateString(),
    new Date(c.updatedAt).toLocaleDateString(),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campaigns-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── The Dashboard ───

export default function CampaignAnalyticsDashboard({ campaigns }: CampaignAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [isVisible, setIsVisible] = useState(false);
  const [showHealthDetails, setShowHealthDetails] = useState(false);
  const [showChannelEffectiveness, setShowChannelEffectiveness] = useState(false);
  const [showSmartTiming, setShowSmartTiming] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ─── Derived Metrics ───

  const metrics = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.isActive).length;
    const totalSteps = campaigns.reduce((sum, c) => sum + c.steps.length, 0);
    const multiChannelCount = campaigns.filter(c => new Set(c.steps.map(s => s.channel)).size > 1).length;

    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.delivered || 0), 0);
    const totalReplied = campaigns.reduce((sum, c) => sum + (c.stats?.replied || 0), 0);
    const totalConverted = campaigns.reduce((sum, c) => sum + (c.stats?.converted || 0), 0);

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const replyRate = totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 100) : 0;
    const conversionRate = totalReplied > 0 ? Math.round((totalConverted / totalReplied) * 100) : 0;

    const totalDuration = campaigns.reduce((sum, c) => sum + c.steps.reduce((s, st) => s + st.delayDays, 0), 0);

    return {
      totalCampaigns, activeCampaigns, totalSteps, totalDuration,
      totalSent, totalDelivered, totalReplied, totalConverted,
      deliveryRate, replyRate, conversionRate, multiChannelCount,
    };
  }, [campaigns]);

  const health = useMemo(() => computeCampaignHealth(campaigns), [campaigns]);
  const channelEffectiveness = useMemo(() => computeChannelEffectiveness(campaigns), [campaigns]);
  const trendComparison = useMemo(() => computeTrendComparison(campaigns, timeRange), [campaigns, timeRange]);
  const smartTimings = useMemo(() => computeSmartTiming(campaigns), [campaigns]);

  // ─── Channel Distribution Data (for pie chart) ───

  const channelData = useMemo(() => {
    const counts: Record<string, { count: number; label: string; color: string }> = {};
    campaigns.forEach(c => c.steps.forEach(step => {
      if (!counts[step.channel]) {
        counts[step.channel] = { count: 0, label: CHANNEL_LABELS[step.channel] || step.channel, color: CHANNEL_COLORS[step.channel] || '#6B7280' };
      }
      counts[step.channel].count++;
    }));
    return Object.entries(counts).map(([key, val]) => ({ name: val.label, value: val.count, color: val.color, channel: key })).sort((a, b) => b.value - a.value);
  }, [campaigns]);

  // ─── Funnel Data ───

  const funnelData = useMemo(() => [
    { name: 'Total Steps', value: metrics.totalSteps, fill: '#3B82F6' },
    { name: 'Sent', value: metrics.totalSent, fill: '#8B5CF6' },
    { name: 'Delivered', value: metrics.totalDelivered, fill: '#06B6D4' },
    { name: 'Replied', value: metrics.totalReplied, fill: '#F59E0B' },
    { name: 'Converted', value: metrics.totalConverted, fill: '#10B981' },
  ], [metrics]);

  // ─── Timeline Data ───

  const timelineData = useMemo(() => {
    if (campaigns.length === 0) return [];
    const sorted = [...campaigns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const grouped: Record<string, { date: string; created: number; steps: number }> = {};
    sorted.forEach(c => {
      const key = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!grouped[key]) grouped[key] = { date: key, created: 0, steps: 0 };
      grouped[key].created += 1;
      grouped[key].steps += c.steps.length;
    });
    return Object.values(grouped);
  }, [campaigns]);

  if (!isVisible) {
    return <div className="flex items-center justify-center py-12"><Sparkles className="h-6 w-6 text-blue-500 animate-spin" /></div>;
  }

  if (campaigns.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-center">
        <div className="relative mb-4">
          <BarChart3 className="h-12 w-12 text-zinc-700" />
          <motion.div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500/20 border border-blue-500/30"
            animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        </div>
        <h4 className="text-sm font-bold text-zinc-400 mb-1">No Campaign Analytics Yet</h4>
        <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
          Create your first multi-channel campaign to see performance metrics, conversion funnels, and channel distribution.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Campaign Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Export button */}
          <button onClick={() => exportCampaignsToCSV(campaigns)}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-zinc-400 hover:text-zinc-200 bg-[#09090B] border border-zinc-800 rounded-lg transition-all cursor-pointer">
            <Download className="h-3 w-3" />
            Export CSV
          </button>
          {/* Time range */}
          <div className="flex items-center gap-1 bg-[#09090B] border border-zinc-800 rounded-lg p-0.5">
            {(['7d', '30d', 'all'] as const).map((range) => (
              <button key={range} onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                  timeRange === range ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── KPI Metrics Grid ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Campaigns" value={metrics.totalCampaigns}
          subtext={`${metrics.activeCampaigns} active · ${metrics.multiChannelCount} multi-channel`}
          icon={<Target className="h-4 w-4" />} color="#3B82F6" delay={0}
          trend={trendComparison.period !== 'all' ? {
            value: Math.abs(trendComparison.sentGrowth),
            isUp: trendComparison.sentGrowth >= 0
          } : undefined} />
        <MetricCard label="Total Steps" value={metrics.totalSteps}
          subtext={`${metrics.totalDuration}d total duration`}
          icon={<Activity className="h-4 w-4" />} color="#8B5CF6" delay={1} />
        <MetricCard label="Delivery Rate" value={`${metrics.deliveryRate}%`}
          subtext={`${metrics.totalSent} sent, ${metrics.totalDelivered} delivered`}
          icon={<Send className="h-4 w-4" />} color="#06B6D4"
          trend={metrics.deliveryRate >= 80 ? { value: metrics.deliveryRate - 50, isUp: true } : undefined} delay={2} />
        <MetricCard label="Conversion" value={`${metrics.conversionRate}%`}
          subtext={`${metrics.totalConverted}/${metrics.totalReplied} replied → converted`}
          icon={<TrendingUp className="h-4 w-4" />} color="#10B981"
          trend={metrics.conversionRate >= 20 ? { value: metrics.conversionRate, isUp: true } : { value: 100 - metrics.conversionRate, isUp: false }} delay={3} />
      </div>

      {/* ─── Campaign Health Score ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <button onClick={() => setShowHealthDetails(!showHealthDetails)}
          className="w-full cursor-pointer text-left">
          <HealthGauge health={health} />
        </button>
        {showHealthDetails && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="mt-2 p-3 rounded-xl bg-[#09090B] border border-zinc-800 space-y-2">
              {health.warnings.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Warnings
                  </p>
                  <ul className="space-y-1">
                    {health.warnings.map((w, i) => (
                      <li key={i} className="text-[9px] text-zinc-400 flex items-start gap-1.5">
                        <span className="text-rose-500 mt-0.5">•</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {health.suggestions.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Suggestions
                  </p>
                  <ul className="space-y-1">
                    {health.suggestions.map((s, i) => (
                      <li key={i} className="text-[9px] text-zinc-400 flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ─── Trend Comparison ─── */}
      {trendComparison.period !== 'all' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-[#09090B]/50 border border-zinc-800">
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
            <TrendingUp className="h-3 w-3" />
            <span className="font-bold">vs previous {timeRange}:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[9px] font-bold flex items-center gap-0.5 ${trendComparison.sentGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trendComparison.sentGrowth >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              Sent {Math.abs(trendComparison.sentGrowth)}%
            </span>
            <span className={`text-[9px] font-bold flex items-center gap-0.5 ${trendComparison.convertedGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trendComparison.convertedGrowth >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              Converted {Math.abs(trendComparison.convertedGrowth)}%
            </span>
            <span className="text-[9px] text-zinc-500">
              {trendComparison.totalSent} sent ({trendComparison.totalSentPrev} prev)
            </span>
          </div>
        </motion.div>
      )}

      {/* ─── Charts Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Conversion Funnel</span>
          </div>
          <div className="h-[200px]">
            {funnelData.every(d => d.value === 0) ? (
              <div className="flex h-full items-center justify-center text-[10px] text-zinc-500 italic">No campaign activity data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#6B7280" fontSize={10} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090B', borderColor: '#27272A', borderRadius: '8px', fontSize: '11px' }}
                    itemStyle={{ color: '#E4E4E7' }} labelStyle={{ color: '#71717A' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {funnelData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-zinc-800/60">
            {[
              { label: 'Send Rate', value: '100%', color: '#8B5CF6' },
              { label: 'Delivery', value: `${metrics.deliveryRate}%`, color: '#06B6D4' },
              { label: 'Reply Rate', value: `${metrics.replyRate}%`, color: '#F59E0B' },
              { label: 'Conversion', value: `${metrics.conversionRate}%`, color: '#10B981' },
            ].map(r => (
              <div key={r.label} className="text-center">
                <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">{r.label}</p>
                <p className="text-xs font-bold font-mono mt-0.5" style={{ color: r.color }}>{r.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Channel Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <PieChartIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Channel Distribution</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[160px] w-[160px] shrink-0">
              {channelData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[10px] text-zinc-500 italic">No channels</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channelData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {channelData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#09090B', borderColor: '#27272A', borderRadius: '8px', fontSize: '11px' }}
                      itemStyle={{ color: '#E4E4E7' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              {channelData.map(ch => (
                <div key={ch.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: ch.color }} />
                    <span className="text-[10px] text-zinc-400">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-zinc-300">{ch.value}</span>
                    <span className="text-[8px] text-zinc-600 font-mono">
                      {Math.round((ch.value / Math.max(1, channelData.reduce((s, d) => s + d.value, 0))) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Channel Effectiveness ─── */}
      {channelEffectiveness.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4">
          <button onClick={() => setShowChannelEffectiveness(!showChannelEffectiveness)}
            className="w-full flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Gauge className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Channel Effectiveness</span>
            </div>
            <motion.span animate={{ rotate: showChannelEffectiveness ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDownIcon />
            </motion.span>
          </button>

          {showChannelEffectiveness && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="mt-3 space-y-2">
                {channelEffectiveness.map((ch, idx) => (
                  <div key={ch.channel} className="p-2.5 rounded-lg bg-[#09090B] border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: CHANNEL_COLORS[ch.channel] }}>{CHANNEL_ICONS[ch.channel]}</span>
                        <span className="text-[10px] font-bold text-white">{ch.channel.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        <span className="text-[8px] text-zinc-600 font-mono">{ch.totalSteps} steps</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[9px] font-bold font-mono ${ch.deliveryRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          📬 {ch.deliveryRate}%
                        </span>
                        <span className={`text-[9px] font-bold font-mono ${ch.replyRate >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          💬 {ch.replyRate}%
                        </span>
                        <span className={`text-[9px] font-bold font-mono ${ch.conversionRate >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          🎯 {ch.conversionRate}%
                        </span>
                      </div>
                    </div>
                    {/* Mini effectiveness bars */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Delivery', pct: ch.deliveryRate, color: '#06B6D4' },
                        { label: 'Reply', pct: ch.replyRate, color: '#F59E0B' },
                        { label: 'Convert', pct: ch.conversionRate, color: '#10B981' },
                      ].map(bar => (
                        <div key={bar.label}>
                          <div className="flex items-center justify-between text-[7px] text-zinc-500 mb-0.5">
                            <span>{bar.label}</span>
                            <span>{bar.pct}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, bar.pct)}%`, background: bar.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-[8px] text-zinc-600 mt-1.5 pt-1.5 border-t border-zinc-800/50">
                      <span>Sent: {ch.totalSent}</span>
                      <span>Delivered: {ch.totalDelivered}</span>
                      <span>Replied: {ch.totalReplied}</span>
                      <span>Converted: {ch.totalConverted}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ─── Campaign Timeline ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Campaign Activity Timeline</span>
        </div>
        <div className="h-[200px]">
          {timelineData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[10px] text-zinc-500 italic">No campaign timeline data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="campaignCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="campaignStepsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090B', borderColor: '#27272A', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#E4E4E7' }} labelStyle={{ color: '#71717A' }} />
                <Area type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#campaignCreatedGrad)" name="Campaigns Created" />
                <Area type="monotone" dataKey="steps" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#campaignStepsGrad)" name="Total Steps" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ─── Smart Send Timing ─── */}
      {smartTimings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4">
          <button onClick={() => setShowSmartTiming(!showSmartTiming)}
            className="w-full flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Smart Send Timing</span>
              <span className="text-[8px] text-zinc-600 font-mono">AI-recommended</span>
            </div>
            <motion.span animate={{ rotate: showSmartTiming ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDownIcon />
            </motion.span>
          </button>

          {showSmartTiming && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="mt-3 space-y-2">
                {smartTimings.map(t => (
                  <div key={t.channel} className="p-2.5 rounded-lg bg-[#09090B] border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: CHANNEL_COLORS[t.channel] }}>{CHANNEL_ICONS[t.channel]}</span>
                      <span className="text-[10px] font-bold text-white">{t.channel.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <span className="text-zinc-500">Best day: </span>
                        <span className="text-zinc-300 font-bold">{t.recommendedDay}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Best time: </span>
                        <span className="text-zinc-300 font-bold">{t.recommendedTime}</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-zinc-600 mt-1 italic">{t.reasoning}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ─── Campaign Cards Mini View ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Campaign Overview</span>
          <span className="text-[9px] text-zinc-500 font-mono ml-auto">{campaigns.length} campaigns</span>
        </div>
        <div className="space-y-2">
          {campaigns.map((campaign, idx) => (
            <motion.div key={campaign.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#09090B] border border-zinc-800/60 hover:border-zinc-700 transition-all">
              <div className={`h-2 w-2 rounded-full shrink-0 ${campaign.isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white truncate">{campaign.name}</p>
                <p className="text-[8px] text-zinc-500 font-mono">
                  {campaign.steps.length} steps · {campaign.steps.reduce((s, st) => s + st.delayDays, 0)}d total
                  {campaign.autoAdvance?.enabled && ' · ⚡ Auto-advance'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {campaign.steps.map((step, si) => (
                  <span key={si} className="h-5 w-5 flex items-center justify-center rounded"
                    style={{ background: `${CHANNEL_COLORS[step.channel] || '#6B7280'}15`, color: CHANNEL_COLORS[step.channel] || '#6B7280' }}
                    title={CHANNEL_LABELS[step.channel]}>
                    <span className="text-[9px]">{CHANNEL_ICONS[step.channel]}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono shrink-0">
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{campaign.stats?.sent || 0}</span>
                <span className="flex items-center gap-0.5"><Pointer className="h-2.5 w-2.5" />{campaign.stats?.replied || 0}</span>
                <span className="flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" />{campaign.stats?.converted || 0}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Small Chevron Icon ───
function ChevronDownIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
