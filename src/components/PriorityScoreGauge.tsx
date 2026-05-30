import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PriorityScore, PriorityScoreFactor } from '../types';
import { 
  TrendingUp, Target, Zap, Smartphone, Users, 
  Shield, ArrowUp, ChevronDown, Info,
  BarChart3, BrainCircuit, Gauge
} from 'lucide-react';

// ─── Animated Radial Gauge ───

function RadialGauge({ score, size = 80, strokeWidth = 6, color }: { score: number; size?: number; strokeWidth?: number; color?: string }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;
  const center = size / 2;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(Math.min(score, 100)), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = () => {
    if (color) return color;
    if (animatedProgress >= 80) return '#10B981';
    if (animatedProgress >= 60) return '#3B82F6';
    if (animatedProgress >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const getLabel = () => {
    if (animatedProgress >= 80) return 'Elite';
    if (animatedProgress >= 60) return 'Strong';
    if (animatedProgress >= 40) return 'Moderate';
    return 'Low';
  };

  const gaugeColor = getColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#27272A"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}44)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', damping: 12 }}
          className="text-lg font-bold font-mono tracking-tight"
          style={{ color: gaugeColor }}
        >
          {Math.round(animatedProgress)}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-[7px] font-bold uppercase tracking-widest mt-0.5"
          style={{ color: gaugeColor }}
        >
          {getLabel()}
        </motion.span>
      </div>
    </div>
  );
}

// ─── Animated Factor Bar ───

function FactorBar({ factor, delay }: { factor: PriorityScoreFactor; delay: number }) {
  const [width, setWidth] = useState(0);
  const percentage = (factor.score / factor.maxScore) * 100;
  const weightedScore = (factor.score / factor.maxScore) * factor.weight * 100;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 200 + delay * 100);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  const barColor = percentage >= 80 ? '#10B981' : percentage >= 60 ? '#3B82F6' : percentage >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.4 }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: barColor }} />
          {factor.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[9px] font-mono">
            {factor.score}/{factor.maxScore}
          </span>
          <span className="text-[9px] font-bold font-mono" style={{ color: barColor }}>
            +{Math.round(weightedScore)}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
            boxShadow: `0 0 8px ${barColor}33`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, delay: delay * 0.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="text-[8px] text-zinc-600 leading-tight">{factor.description}</p>
    </motion.div>
  );
}

// ─── Main Component ───

interface PriorityScoreGaugeProps {
  score: PriorityScore;
}

export default function PriorityScoreGauge({ score }: PriorityScoreGaugeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const summaryFactors = [
    { label: 'Closing', value: score.probabilityOfClosing, icon: Target, color: '#10B981' },
    { label: 'Revenue', value: score.revenuePotential, icon: TrendingUp, color: '#3B82F6' },
    { label: 'AI Ready', value: score.aiReadiness, icon: BrainCircuit, color: '#8B5CF6' },
    { label: 'WhatsApp', value: score.whatsappDependence, icon: Smartphone, color: '#06B6D4' },
    { label: 'Access', value: score.easeOfAccess, icon: Users, color: '#F59E0B' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden"
    >
      {/* Header with Gauge */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-4">
          {/* Radial Gauge */}
          <RadialGauge score={score.overall} size={80} />

          {/* Summary stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-3.5 w-3.5 text-blue-400" />
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Priority Score
              </h4>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                score.overall >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                score.overall >= 60 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                score.overall >= 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {score.overall >= 80 ? 'HOT LEAD' : score.overall >= 60 ? 'WARM' : score.overall >= 40 ? 'LUKEWARM' : 'COLD'}
              </span>
            </div>

            {/* Mini factor pills - 5 columns */}
            <div className="grid grid-cols-5 gap-1.5">
              {summaryFactors.map((f) => (
                <div key={f.label} className="flex flex-col items-center text-center p-1.5 rounded-lg bg-[#09090B] border border-zinc-800/60">
                  <f.icon className="h-3 w-3 mb-0.5" style={{ color: f.color }} />
                  <span className="text-[9px] font-bold font-mono" style={{ color: f.color }}>
                    {f.value}/10
                  </span>
                  <span className="text-[7px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 mt-3 text-[9px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <BarChart3 className="h-3 w-3" />
          {isExpanded ? 'Hide Detailed Breakdown' : 'Show Detailed Breakdown'}
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-3 w-3" />
          </motion.span>
        </button>
      </div>

      {/* Detailed Factors */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3.5 border-t border-zinc-800/60 pt-3">
              {score.factors.map((factor, i) => (
                <FactorBar key={factor.label} factor={factor} delay={i} />
              ))}

              {/* Final weighted total */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Weighted Total
                </span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring', damping: 12 }}
                  className="text-sm font-bold font-mono px-2.5 py-0.5 rounded-lg"
                  style={{
                    color: score.overall >= 80 ? '#10B981' : score.overall >= 60 ? '#3B82F6' : score.overall >= 40 ? '#F59E0B' : '#EF4444',
                    background: score.overall >= 80 ? '#10B98115' : score.overall >= 60 ? '#3B82F615' : score.overall >= 40 ? '#F59E0B15' : '#EF444415',
                    borderColor: score.overall >= 80 ? '#10B98130' : score.overall >= 60 ? '#3B82F630' : score.overall >= 40 ? '#F59E0B30' : '#EF444430',
                  }}
                >
                  {score.overall}/100
                </motion.span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Priority Score Generator Utility ───

export function generatePriorityScore(lead: {
  rating?: number | null;
  reviewsCount?: number | null;
  website?: string | null;
  digitalPresenceScore?: number;
  category?: string;
  phone?: string | null;
  address?: string;
}): PriorityScore {
  const factors: PriorityScoreFactor[] = [];

  // Probability of Closing (based on website gap, quality signals)
  const hasWebsite = !!lead.website;
  const hasPhone = !!lead.phone;
  const hasAddress = !!lead.address;
  const qualitySignals = [hasWebsite, hasPhone, hasAddress].filter(Boolean).length;
  
  const probScore = Math.min(10, Math.round(
    (hasWebsite ? 0 : 3) + // No website = easier sale
    qualitySignals * 1.5 +
    (lead.rating && lead.rating >= 4 ? 2 : 0)
  ));
  
  factors.push({
    label: 'Probability of Closing',
    score: probScore,
    maxScore: 10,
    weight: 0.30,
    description: hasWebsite 
      ? 'Has website — warm lead, existing digital presence to build on'
      : 'No website — high urgency gap, easier to demonstrate value'
  });

  // Revenue Potential
  const categoryRevenueMap: Record<string, number> = {
    'Hospital': 9, 'Clinic': 7, 'Dental': 7,
    'School': 8, 'College': 9, 'University': 9,
    'Hotel': 8, 'Restaurant': 5,
    'Real Estate': 7, 'Gym': 6, 'Salon': 4, 'Spa': 5,
  };
  const revenueBase = Object.entries(categoryRevenueMap).find(
    ([k]) => lead.category?.toLowerCase().includes(k.toLowerCase())
  )?.[1] || 5;

  const revScore = Math.min(10, revenueBase + (hasWebsite ? 1 : 2) + (lead.rating && lead.rating >= 4 ? 1 : 0));
  
  factors.push({
    label: 'Revenue Potential',
    score: revScore,
    maxScore: 10,
    weight: 0.25,
    description: `Estimated based on ${lead.category || 'business'} category and digital maturity`
  });

  // AI Readiness
  const aiScore = Math.min(10, Math.max(1, Math.round(
    (lead.digitalPresenceScore || 50) / 12 +
    (lead.website ? 3 : 5) + // No website = more ready for AI solution
    (lead.rating && lead.rating >= 4 ? 1 : 0)
  )));

  factors.push({
    label: 'AI Readiness',
    score: aiScore,
    maxScore: 10,
    weight: 0.20,
    description: lead.website 
      ? 'Has digital foundation — ready for WhatsApp AI integration'
      : 'No digital presence — ideal candidate for complete AI transformation'
  });

  // WhatsApp Dependence
  const whatsAppScore = Math.min(10, Math.max(1, Math.round(
    (hasPhone ? 4 : 0) +
    (hasWebsite ? 2 : 3) + // No website = more WhatsApp dependent
    (lead.reviewsCount && lead.reviewsCount > 10 ? 2 : 1) +
    (lead.rating && lead.rating >= 4 ? 1 : 0)
  )));

  factors.push({
    label: 'WhatsApp Dependence',
    score: whatsAppScore,
    maxScore: 10,
    weight: 0.15,
    description: hasPhone 
      ? 'Phone available — high WhatsApp engagement potential' 
      : 'No phone listed — may need alternative outreach channel'
  });

  // Ease of Access
  const accessScore = Math.min(10, Math.max(1, Math.round(
    (hasPhone ? 3 : 0) +
    (hasAddress ? 2 : 0) +
    (lead.rating ? 2 : 0) +
    (hasWebsite ? 1 : 2)
  )));

  factors.push({
    label: 'Ease of Access',
    score: accessScore,
    maxScore: 10,
    weight: 0.10,
    description: hasPhone 
      ? 'Direct phone access — easy to initiate contact' 
      : 'Limited contact info — may require multi-channel outreach'
  });

  // Calculate weighted overall
  const overall = Math.round(
    factors.reduce((sum, f) => sum + (f.score / f.maxScore) * f.weight * 100, 0)
  );

  return {
    overall: Math.min(100, overall),
    probabilityOfClosing: probScore,
    revenuePotential: revScore,
    aiReadiness: aiScore,
    whatsappDependence: whatsAppScore,
    easeOfAccess: accessScore,
    factors
  };
}
