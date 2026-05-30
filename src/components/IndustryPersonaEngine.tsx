import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, MessageSquare, DollarSign,
  Shield, CheckCircle2, ChevronRight
} from 'lucide-react';
import { AgentPersona, AgentPersonaType } from '../types';

// ─── Industry Persona Database ───

export const AGENT_PERSONAS: Record<AgentPersonaType, AgentPersona> = {
  ai_receptionist: {
    type: 'ai_receptionist',
    name: 'Aura',
    title: 'AI Receptionist',
    description: 'A 24/7 intelligent receptionist that answers calls, books appointments, and handles inquiries instantly via WhatsApp — eliminating missed opportunities.',
    industryKeywords: ['clinic', 'hospital', 'dental', 'medical', 'doctor', 'healthcare', 'wellness', 'spa'],
    painPoints: [
      'Overwhelmed front desk staff',
      'Missed after-hours calls',
      'Long patient wait times on phone',
      'Double-booking and scheduling chaos'
    ],
    solutions: [
      'Instant WhatsApp appointment booking',
      '24/7 inquiry response with FAQ automation',
      'Automated appointment reminders & follow-ups',
      'Seamless calendar integration'
    ],
    pitchTemplates: {
      whatsapp: "Hi there! 👋 I'm Aura, your AI receptionist. I noticed you're managing a lot of incoming calls and walk-ins. What if I told you I could handle 80% of your booking inquiries automatically through WhatsApp — so your front desk can focus on patient care? Let's chat about setting this up this week!",
      email: "Subject: 24/7 AI Receptionist for Your Medical Practice\n\nHi {{name}},\n\nI noticed your clinic manages a high volume of patient inquiries. Our AI Receptionist, Aura, works 24/7 through WhatsApp to handle bookings, answer FAQs, and send reminders — so your front desk never misses a call.\n\nWould you be open to a 10-minute demo this week?\n\nBest regards,\n{{sender}}",
      linkedin: "Hi {{name}}, I work with medical practices to automate front desk operations through WhatsApp. Your clinic looks like it handles significant patient volume — would an AI receptionist that books appointments 24/7 be valuable? Happy to share how it works!"
    },
    pricing: { starter: 200, growth: 500, premium: 1200, enterprise: 2500 },
    color: '#6366F1',
    gradient: 'from-indigo-600 via-indigo-500 to-purple-600',
    icon: '🤖'
  },
  ai_admissions: {
    type: 'ai_admissions',
    name: 'Edu',
    title: 'AI Admissions Agent',
    description: 'An intelligent admissions assistant that handles parent inquiries, processes applications, and nurtures prospects through the enrollment funnel via WhatsApp.',
    industryKeywords: ['school', 'academy', 'college', 'university', 'education', 'learning', 'institute', 'montessori', 'nursery', 'high school', 'primary school'],
    painPoints: [
      'Overwhelming admission inquiry volume',
      'Slow parent response times',
      'Lost application follow-ups',
      'Manual fee inquiry handling'
    ],
    solutions: [
      'Instant parent inquiry responses',
      'Automated application collection',
      'Fee structure & payment guidance',
      'Event & open day registration'
    ],
    pitchTemplates: {
      whatsapp: "Hello! 🎓 I'm Edu, your AI admissions agent. I see your school receives many admission inquiries. I can help you respond to parents instantly via WhatsApp, collect applications automatically, and never lose a prospective student again. Ready to transform your admissions process?",
      email: "Subject: Simplify Your Admissions with AI\n\nDear {{name}},\n\nManaging admissions inquiries can be overwhelming. Our AI Admissions Agent, Edu, handles parent questions, fee inquiries, and application collection through WhatsApp — 24/7.\n\nLet me show you how schools are cutting response times by 90%.\n\nBest regards,\n{{sender}}",
      linkedin: "Hi {{name}}, I help schools automate their admissions process through WhatsApp. Noticed {{school}} handles a lot of parent inquiries — would automating responses and application collection free up your team's time?"
    },
    pricing: { starter: 150, growth: 400, premium: 1000, enterprise: 2000 },
    color: '#10B981',
    gradient: 'from-emerald-600 via-emerald-500 to-teal-600',
    icon: '🎓'
  },
  ai_property_consultant: {
    type: 'ai_property_consultant',
    name: 'Terra',
    title: 'AI Property Consultant',
    description: 'A virtual property consultant that qualifies leads, recommends properties, schedules viewings, and nurtures buyers through WhatsApp — converting inquiries into sales.',
    industryKeywords: ['real estate', 'property', 'realtor', 'realty', 'apartment', 'housing', 'estate agent', 'rental', 'property management'],
    painPoints: [
      'Slow lead response killing conversions',
      'Endless property inquiry management',
      'Hard to qualify buyers efficiently',
      'Missed follow-up opportunities'
    ],
    solutions: [
      'Instant property recommendations via WhatsApp',
      'Automated lead qualification',
      'Viewing scheduling & reminders',
      'Follow-up automation sequence'
    ],
    pitchTemplates: {
      whatsapp: "Hey! 🏠 I'm Terra, your AI property consultant. I see you're managing a lot of property inquiries. I can help by instantly sharing listings, qualifying buyers, and scheduling viewings — all through WhatsApp. Your sales team can focus on closing deals. Interested?",
      email: "Subject: Never Miss a Property Lead Again\n\nHi {{name}},\n\nIn real estate, speed wins. Our AI Property Consultant, Terra, responds to inquiries instantly on WhatsApp, recommends properties, qualifies buyers, and schedules viewings — all automatically.\n\nWant to see how agencies are converting 3x more leads?\n\nBest,\n{{sender}}",
      linkedin: "Hi {{name}}, I work with real estate agencies to automate lead response through WhatsApp. Your agency seems to handle significant inquiry volume — would insta nt property recommendations and automated viewing scheduling help your team close faster?"
    },
    pricing: { starter: 250, growth: 600, premium: 1500, enterprise: 3000 },
    color: '#F59E0B',
    gradient: 'from-amber-600 via-amber-500 to-orange-600',
    icon: '🏠'
  },
  ai_booking_agent: {
    type: 'ai_booking_agent',
    name: 'Nova',
    title: 'AI Booking Agent',
    description: 'A dynamic booking assistant that handles reservations, cancellations, rescheduling, and customer inquiries — making your service bookable 24/7 through WhatsApp.',
    industryKeywords: ['hotel', 'restaurant', 'salon', 'barber', 'spa', 'booking', 'reservation', 'lodging', 'accommodation', 'hospitality'],
    painPoints: [
      'Manual booking management chaos',
      'No-shows costing revenue',
      'Limited booking hours',
      'Double-booking headaches'
    ],
    solutions: [
      '24/7 WhatsApp booking & reservations',
      'Automated reminders reducing no-shows',
      'Easy rescheduling & cancellation',
      'Calendar sync across platforms'
    ],
    pitchTemplates: {
      whatsapp: "Hi there! ✨ I'm Nova, your AI booking agent. I noticed you're managing reservations manually — I can handle bookings, cancellations, and reminders through WhatsApp automatically. Your staff focuses on service, I'll handle the schedule. Game?",
      email: "Subject: 24/7 Booking Automation for {{business}}\n\nHi {{name}},\n\nNever miss a booking again. Nova, our AI Booking Agent, handles reservations, reminders, and cancellations through WhatsApp — around the clock.\n\nReduce no-shows by 60% and increase bookings by 40%. Want to see how?\n\nBest,\n{{sender}}",
      linkedin: "Hi {{name}}, I help hospitality businesses automate bookings through WhatsApp. Your venue looks fantastic — would a 24/7 AI booking agent that reduces no-shows and handles reservations automatically be valuable?"
    },
    pricing: { starter: 150, growth: 400, premium: 900, enterprise: 2000 },
    color: '#EC4899',
    gradient: 'from-pink-600 via-pink-500 to-rose-600',
    icon: '✨'
  },
  ai_fitness_coach: {
    type: 'ai_fitness_coach',
    name: 'Fitzy',
    title: 'AI Fitness Coach & Engagement Agent',
    description: 'A motivational fitness assistant that handles memberships, class bookings, personal training scheduling, and member retention campaigns via WhatsApp.',
    industryKeywords: ['gym', 'fitness', 'gymnasium', 'workout', 'crossfit', 'yoga', 'pilates', 'training', 'wellness center'],
    painPoints: [
      'Membership management overhead',
      'Low class attendance rates',
      'Member retention challenges',
      'Manual renewal follow-ups'
    ],
    solutions: [
      'Membership & class booking via WhatsApp',
      'Automated renewal reminders',
      'Personal training scheduler',
      'Member engagement campaigns'
    ],
    pitchTemplates: {
      whatsapp: "Hey! 💪 I'm Fitzy, your AI fitness coach. I see you're managing memberships and class bookings — I can automate all of that through WhatsApp. New sign-ups, class reservations, renewal reminders, all 24/7. Ready to grow your gym?",
      email: "Subject: 24/7 Gym Membership Automation\n\nHi {{name}},\n\nOur AI Fitness Coach, Fitzy, handles memberships, class bookings, and retention campaigns through WhatsApp — so your trainers focus on training, not admin.\n\nSee how gyms are increasing retention by 45%.\n\nBest,\n{{sender}}",
      linkedin: "Hi {{name}}, I help fitness centers automate member management through WhatsApp. Your gym looks great — would a 24/7 AI agent that handles memberships, class bookings, and renewals help your team?"
    },
    pricing: { starter: 150, growth: 400, premium: 900, enterprise: 2000 },
    color: '#8B5CF6',
    gradient: 'from-violet-600 via-violet-500 to-purple-600',
    icon: '💪'
  },
  ai_beauty_consultant: {
    type: 'ai_beauty_consultant',
    name: 'Luna',
    title: 'AI Beauty & Salon Consultant',
    description: 'A glamorous booking and marketing assistant that handles appointments, promotions, loyalty programs, and customer engagement through WhatsApp.',
    industryKeywords: ['salon', 'beauty', 'barber', 'nail', 'lash', 'makeup', 'cosmetics', 'hair', 'stylist', 'spa'],
    painPoints: [
      'Booking management chaos',
      'High no-show rates',
      'Customer retention struggles',
      'Promotion distribution challenges'
    ],
    solutions: [
      'Instant WhatsApp appointment booking',
      'Automated no-show reduction reminders',
      'Loyalty program automation',
      'Promotional campaign delivery'
    ],
    pitchTemplates: {
      whatsapp: "Hi gorgeous! 💅 I'm Luna, your AI salon consultant. I see you're managing bookings — I can handle appointments, send reminders, manage your loyalty program, and promote your services through WhatsApp. More bookings, less no-shows. Interested?",
      email: "Subject: 24/7 Salon Booking & Marketing\n\nHi {{name}},\n\nOur AI Beauty Consultant, Luna, handles appointments, reminders, loyalty programs, and promotions through WhatsApp — helping salons reduce no-shows by 70%.\n\nReady to see how?\n\nBest,\n{{sender}}",
      linkedin: "Hi {{name}}, I help salons and beauty businesses automate bookings and marketing through WhatsApp. Your work is amazing! Would a 24/7 AI assistant that handles appointments, reminders, and promotions interest you?"
    },
    pricing: { starter: 100, growth: 300, premium: 700, enterprise: 1500 },
    color: '#F43F5E',
    gradient: 'from-rose-600 via-rose-500 to-pink-600',
    icon: '💅'
  },
  ai_support_agent: {
    type: 'ai_support_agent',
    name: 'Sage',
    title: 'AI Support Agent',
    description: 'A knowledgeable support assistant that handles customer inquiries, troubleshooting, FAQs, and escalations — providing instant 24/7 customer service via WhatsApp.',
    industryKeywords: ['customer service', 'support', 'help desk', 'service', 'retail', 'ecommerce', 'logistics', 'delivery'],
    painPoints: [
      'High volume of repetitive inquiries',
      'Slow response times',
      'Customer frustration with wait times',
      'Support team burnout'
    ],
    solutions: [
      'Instant FAQ & common inquiry responses',
      '24/7 automated customer support',
      'Smart escalation to human agents',
      'Multi-language support capability'
    ],
    pitchTemplates: {
      whatsapp: "Hello! 🧠 I'm Sage, your AI support agent. I see your team handles many customer inquiries — I can instantly answer FAQs, troubleshoot common issues, and escalate complex ones to your team. All through WhatsApp, 24/7. Want to see how?",
      email: "Subject: 24/7 Customer Support Automation\n\nHi {{name}},\n\nSage, our AI Support Agent, handles customer inquiries instantly through WhatsApp — reducing response times from hours to seconds while your team focuses on complex issues.\n\nSee how businesses are cutting support costs by 60%.\n\nBest,\n{{sender}}",
      linkedin: "Hi {{name}}, I help businesses automate customer support through WhatsApp. Your company handles significant inquiry volume — would 24/7 automated support that answers FAQs instantly be valuable?"
    },
    pricing: { starter: 200, growth: 500, premium: 1200, enterprise: 3000 },
    color: '#06B6D4',
    gradient: 'from-cyan-600 via-cyan-500 to-sky-600',
    icon: '🧠'
  },
  ai_sales_agent: {
    type: 'ai_sales_agent',
    name: 'Kai',
    title: 'AI Sales Agent',
    description: 'A driven sales development agent that qualifies leads, nurtures prospects, handles objections, and closes deals — operating as your top-performing sales rep 24/7.',
    industryKeywords: ['general', 'business', 'retail', 'ecommerce', 'service', 'consulting', 'agency', 'store'],
    painPoints: [
      'Inconsistent lead follow-up',
      'Missed sales opportunities',
      'Time wasted on unqualified leads',
      'Long sales cycles'
    ],
    solutions: [
      'Instant lead qualification & response',
      'Automated follow-up sequences',
      'Objection handling scripts',
      'Pipeline acceleration'
    ],
    pitchTemplates: {
      whatsapp: "Hey! 🚀 I'm Kai, your AI sales agent. I noticed you're following up with leads manually — I can qualify, nurture, and convert prospects through WhatsApp automatically. More deals closed while you sleep. Ready to scale?",
      email: "Subject: Scale Your Sales with AI\n\nHi {{name}},\n\nKai, our AI Sales Agent, handles lead qualification, follow-up sequences, and objection handling through WhatsApp — so your team closes more deals, faster.\n\nWant to see how businesses are increasing conversions by 3x?\n\nBest,\n{{sender}}",
      linkedin: "Hi {{name}}, I help businesses automate sales development through WhatsApp. Your company looks like it handles serious lead volume — would an AI SDR that qualifies and nurtures prospects 24/7 help you scale?"
    },
    pricing: { starter: 300, growth: 700, premium: 1800, enterprise: 4000 },
    color: '#3B82F6',
    gradient: 'from-blue-600 via-blue-500 to-indigo-600',
    icon: '🚀'
  }
};

// ─── Helper: Find best matching persona for a query ───

export function findMatchingPersona(query: string): AgentPersona | null {
  const q = query.toLowerCase().trim();
  const queryWords = q.split(/\s+/).filter(w => w.length > 2); // ignore very short words
  
  if (queryWords.length === 0) return null;

  // Score each persona by keyword matches with bonus for exact multi-word matches
  const scored = Object.values(AGENT_PERSONAS).map(persona => {
    let score = 0;
    
    for (const kw of persona.industryKeywords) {
      const kwLower = kw.toLowerCase();
      
      // Exact multi-word keyword match (e.g., "real estate" matches "real estate")
      if (kwLower.includes(' ') && q.includes(kwLower)) {
        score += 4; // strong bonus for exact phrase match
        continue;
      }
      
      // Single word keyword matches
      const kwParts = kwLower.split(' ');
      for (const part of kwParts) {
        if (part.length <= 2) continue;
        
        // Check for whole-word match (boundaries to avoid partial overlaps)
        const wordBoundary = new RegExp(`\\b${part}\\b`, 'i');
        if (wordBoundary.test(q)) {
          score += 1.5;
        } else if (q.includes(part)) {
          // Partial match with penalty
          score += 0.3;
        }
      }
    }
    
    // Negative scoring for conflicting keywords to prevent cross-industry mismatches
    const conflictingPairs: [RegExp, string[]][] = [
      [/\bhotel\b/i, ['clinic', 'hospital', 'medical', 'dental']],
      [/\bgym\b|\bfitness\b/i, ['school', 'hospital', 'clinic']],
      [/\bschool\b|\bacademy\b|\bcollege\b/i, ['gym', 'salon', 'barber']],
      [/\bdental\b|\bclinic\b|\bmedical\b/i, ['hotel', 'restaurant', 'gym']],
    ];
    
    for (const [pattern, conflictKeywords] of conflictingPairs) {
      if (pattern.test(q)) {
        for (const kw of persona.industryKeywords) {
          if (conflictKeywords.some(c => kw.includes(c))) {
            score -= 2; // penalize if query is about one industry but persona targets a conflicting one
          }
        }
      }
    }
    
    return { persona, score: Math.max(0, score) };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  
  // Only return if score exceeds minimum threshold
  return best && best.score >= 1.5 ? best.persona : null;
}

// ─── The Component ───

interface IndustryPersonaEngineProps {
  searchQuery: string;
  onActivatePersona?: (persona: AgentPersonaType) => void;
}

export default function IndustryPersonaEngine({ searchQuery, onActivatePersona }: IndustryPersonaEngineProps) {
  const [activatedPersona, setActivatedPersona] = useState<AgentPersona | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [currentPricingTier, setCurrentPricingTier] = useState<'starter' | 'growth' | 'premium' | 'enterprise'>('growth');
  const [isVisible, setIsVisible] = useState(false);

  // Stable random positions for particles — computed once
  const particlePositions = useMemo(() =>
    [...Array(6)].map(() => ({
      startX: Math.random() * 300,
      endX: Math.random() * 300 + 50,
      startY: Math.random() * 200,
      endY: Math.random() * 200 - 30,
      duration: 4 + Math.random() * 3,
    })), []
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (!searchQuery) {
      setIsVisible(false);
      timeout = setTimeout(() => setActivatedPersona(null), 300);
      return () => clearTimeout(timeout);
    }

    const matched = findMatchingPersona(searchQuery);
    
    if (matched && matched.type !== activatedPersona?.type) {
      setIsVisible(false);
      timeout = setTimeout(() => {
        setActivatedPersona(matched);
        setIsVisible(true);
        onActivatePersona?.(matched.type);
      }, 300);
    } else if (!matched) {
      setIsVisible(false);
      timeout = setTimeout(() => setActivatedPersona(null), 300);
    } else if (matched && matched.type === activatedPersona?.type) {
      setIsVisible(true);
    }

    return () => { if (timeout) clearTimeout(timeout); };
  }, [searchQuery, activatedPersona, onActivatePersona]);

  if (!activatedPersona) return null;

  const pricingTiers = [
    { key: 'starter' as const, label: 'Starter', desc: 'For small businesses', monthly: activatedPersona.pricing.starter },
    { key: 'growth' as const, label: 'Growth', desc: 'For growing companies', monthly: activatedPersona.pricing.growth },
    { key: 'premium' as const, label: 'Premium', desc: 'For established orgs', monthly: activatedPersona.pricing.premium },
    { key: 'enterprise' as const, label: 'Enterprise', desc: 'For large enterprises', monthly: activatedPersona.pricing.enterprise },
  ];

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={activatedPersona.type}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#0C0C0E]"
        >
          {/* Cinematic gradient background */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${activatedPersona.gradient} opacity-[0.03]`} 
          />
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-[0.04] blur-3xl"
            style={{ background: activatedPersona.color }}
          />

          {/* Animated particle dots — stable positions via useMemo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particlePositions.map((p, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{ background: activatedPersona.color }}
                animate={{
                  x: [p.startX, p.endX],
                  y: [p.startY, p.endY],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <div className="relative p-5 space-y-4">
            {/* Header — Avatar + Identity */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shrink-0 overflow-hidden"
                  style={{ 
                    background: `linear-gradient(135deg, ${activatedPersona.color}22, ${activatedPersona.color}11)`,
                    borderColor: `${activatedPersona.color}44`,
                  }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${activatedPersona.color}, transparent)` }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="relative z-10">{activatedPersona.icon}</span>
                </motion.div>
                <div>
                  <motion.h3 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg font-display font-bold text-white"
                  >
                    {activatedPersona.name}
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-xs font-bold uppercase tracking-widest mt-0.5"
                    style={{ color: activatedPersona.color }}
                  >
                    {activatedPersona.title}
                  </motion.p>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed max-w-md"
                  >
                    {activatedPersona.description}
                  </motion.p>
                </div>
              </div>

              {/* Activation badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', damping: 12 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest shrink-0"
                style={{ 
                  background: `${activatedPersona.color}15`,
                  borderColor: `${activatedPersona.color}30`,
                  color: activatedPersona.color,
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: activatedPersona.color }}
                />
                Agent Active
              </motion.div>
            </div>

            {/* Pain Points + Solutions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Pain Points */}
              <div>
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-rose-400" />
                  Pain Points Detected
                </h4>
                <div className="space-y-1.5">
                  {activatedPersona.painPoints.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-start gap-2 text-[10px] text-zinc-400 bg-[#09090B] p-2 rounded-lg border border-zinc-800/60"
                    >
                      <span className="text-rose-400/80 shrink-0 mt-0.5">✕</span>
                      <span>{p}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Solutions */}
              <div>
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  AI Solutions
                </h4>
                <div className="space-y-1.5">
                  {activatedPersona.solutions.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-start gap-2 text-[10px] text-zinc-300 bg-[#09090B] p-2 rounded-lg border border-zinc-800/60"
                    >
                      <span 
                        className="shrink-0 mt-0.5 font-bold"
                        style={{ color: activatedPersona.color }}
                      >
                        ✓
                      </span>
                      <span>{s}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing Tiers */}
            <div className="pt-1">
              <button
                onClick={() => setShowPricing(!showPricing)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer mb-3"
              >
                <DollarSign className="h-3 w-3" style={{ color: activatedPersona.color }} />
                {showPricing ? 'Hide Pricing Plans' : 'View Pricing Plans'}
                <motion.span animate={{ rotate: showPricing ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="h-3 w-3" />
                </motion.span>
              </button>

              <AnimatePresence>
                {showPricing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {pricingTiers.map((tier) => (
                        <motion.button
                          key={tier.key}
                          onClick={() => setCurrentPricingTier(tier.key)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            currentPricingTier === tier.key
                              ? 'bg-zinc-800/80 border-zinc-600'
                              : 'bg-[#09090B] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                          }`}
                        >
                          <p className="text-[10px] font-bold text-white">{tier.label}</p>
                          <p className="text-[8px] text-zinc-500 mt-0.5">{tier.desc}</p>
                          <p className="text-xs font-bold mt-1.5" style={{ color: activatedPersona.color }}>
                            ${tier.monthly}<span className="text-[8px] text-zinc-500 font-normal">/mo</span>
                          </p>
                        </motion.button>
                      ))}
                    </div>

                    {/* Pitch Preview */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-3 p-3 rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-[#09090B]"
                    >
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" style={{ color: activatedPersona.color }} />
                        WhatsApp Pitch Preview
                      </p>
                      <p className="text-[10.5px] text-zinc-300 italic leading-relaxed">
                        "{activatedPersona.pitchTemplates.whatsapp}"
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
