/**
 * AI Client Hunter — Agent Tool Definitions
 * 
 * Each tool wraps existing server-side business logic so agents
 * can discover leads, score them, analyze, propose, and pitch.
 * 
 * Tools receive typed arguments and return structured data that
 * the agent can reason about.
 */

import type { Lead, OutreachEntry, ScoreBreakdown, BIReport, BusinessAnalysis, WebDesignProposal, OutreachPitch, FollowUpJob } from '../types.js';
import { ToolParameter, AgentTool, AgentContext } from './core.js';
import { generateFallbackLeads } from './fallbacks.js';
import { sendTextMessage, isWhatsAppConfigured } from '../whatsapp.js';
import { scheduler, generateFollowUpMessage } from '../scheduler.js';
import { agentLogger } from './logger.js';

// ─── Helper: convert TypeScript types to ToolParameter schemas ───

function strParam(name: string, description: string, required = true): ToolParameter {
  return { name, type: 'string', description, required };
}

function numParam(name: string, description: string, required = true): ToolParameter {
  return { name, type: 'number', description, required };
}

function boolParam(name: string, description: string, required = true): ToolParameter {
  return { name, type: 'boolean', description, required };
}

function arrParam(name: string, description: string, itemsType: 'string' | 'number' = 'string', required = true): ToolParameter {
  return { name, type: 'array', description, required, items: { type: itemsType } };
}

// ─── Helper functions (same logic as server.ts but importable by agents) ───

function calculateScoreBreakdown(lead: Lead): ScoreBreakdown {
  const hasWebsite = !lead.website ? 25 : 0;
  const digitalPresence = lead.digitalPresenceScore > 0
    ? Math.max(0, 20 - Math.round(lead.digitalPresenceScore / 5))
    : 15;
  const reviewQuality = (lead.rating && lead.rating < 4.0 && lead.rating > 0) ? 20
    : (lead.rating && lead.rating >= 4.0) ? 10 : 15;
  const bookingPotential = lead.tags.some(t => /manual|whatsapp|phone|call|booking/i.test(t)) ? 20 : 15;
  const brandGap = !lead.website ? 25 : lead.digitalPresenceScore < 50 ? 15 : 5;
  const total = hasWebsite + digitalPresence + reviewQuality + bookingPotential + brandGap;
  return { hasWebsite, digitalPresence, reviewQuality, bookingPotential, brandGap, total: Math.min(100, Math.max(0, total)) };
}

function calculateOpportunityScore(lead: Lead): number {
  let score = 0;
  if (!lead.website) score += 30;
  if (lead.rating && lead.rating < 4.0) score += 15;
  if (!lead.website && (!lead.phone || lead.phone === 'No phone listed')) score += 10;
  if (lead.tags.some(t => /manual|whatsapp|facebook|instagram/i.test(t))) score += 15;
  if (lead.digitalPresenceScore < 40) score += 15;
  if (lead.reviewsCount && lead.reviewsCount < 20) score += 10;
  if (lead.reviewsCount && lead.reviewsCount === 0) score += 5;
  return Math.min(100, score);
}

function generateBIReport(lead: Lead): BIReport {
  const hasWeb = !!lead.website;
  const categoryLower = (lead.category || '').toLowerCase();
  let topOpportunity = '';
  let recommendedAction = '';
  let competitiveInsight = '';
  let estimatedValueUpside = '';

  if (categoryLower.includes('clinic') || categoryLower.includes('dent') || categoryLower.includes('health')) {
    topOpportunity = 'Online booking portal to automate patient intake and reduce front-desk congestion';
    recommendedAction = hasWeb ? 'Redesign existing site with mobile-responsive patient scheduler' : 'Build a patient booking website with automated WhatsApp reminders';
    competitiveInsight = 'Competitors with online scheduling are capturing 40% more new patient inquiries';
    estimatedValueUpside = 'Potential to recover 12-18 additional client sessions per week with streamlined booking';
  } else if (categoryLower.includes('rest') || categoryLower.includes('cafe') || categoryLower.includes('food') || categoryLower.includes('bak')) {
    topOpportunity = 'Direct online ordering system to bypass third-party delivery commission fees';
    recommendedAction = hasWeb ? 'Add direct ordering and table reservation modules' : 'Launch a commission-free ordering website with delivery zone management';
    competitiveInsight = 'Local competitors using direct ordering capture 25-35% more margin per order';
    estimatedValueUpside = 'Recapture ~$1,200-2,000/month in lost commission fees';
  } else if (categoryLower.includes('logis') || categoryLower.includes('freight') || categoryLower.includes('delivery')) {
    topOpportunity = 'Real-time shipment tracking portal to reduce customer support calls';
    recommendedAction = hasWeb ? 'Integrate tracking dashboard and automated SMS status updates' : 'Build a client portal with instant quote calculator and tracking';
    competitiveInsight = 'Competitors offering live tracking are preferred by 68% of corporate clients';
    estimatedValueUpside = 'Reduce dispatch support calls by 60% and win 3-5 more enterprise contracts';
  } else {
    topOpportunity = hasWeb ? 'Modernize digital presence with conversion-optimized design' : 'Establish first online presence to capture local search traffic';
    recommendedAction = hasWeb ? 'Redesign with modern UX, integrated booking, and SEO optimization' : 'Create a professional website with service showcase and contact automation';
    competitiveInsight = 'Businesses with modern websites receive 3x more inbound inquiries than those without';
    estimatedValueUpside = 'Estimated 15-30% increase in qualified lead generation through improved online presence';
  }

  return {
    businessOverview: `${lead.name} is a ${lead.category || 'local business'} operating in ${lead.address || 'the local area'}. ${hasWeb ? 'Has a website but likely needs modernization.' : 'Has no website presence — significant growth opportunity.'}`,
    digitalHealthScore: lead.digitalPresenceScore || 50,
    topOpportunity,
    recommendedAction,
    competitiveInsight,
    estimatedValueUpside,
  };
}

// ─── Server-side functions that will be called from Express ───
// These are implementations of the endpoint logic, shared between agents and routes.

export function serverAnalyzeLead(lead: Lead): BusinessAnalysis {
  const strength: 'low' | 'medium' = !lead.website ? 'low' : 'medium';
  const categoryLower = (lead.category || '').toLowerCase();
  const isMedical = /clinic|dent|health|physio|doctor|hospital/i.test(categoryLower);
  const isFood = /eat|rest|bak|cafe|food/i.test(categoryLower);
  const isLogistics = /delivery|freight|logis|cargo|courier/i.test(categoryLower);

  let summary = `Established local provider of ${lead.category || 'professional'} services with strong community reputation.`;
  let digitalPresenceSummary = lead.website
    ? `Legacy web presence at ${lead.website}. Lacks mobile responsiveness, modern booking widgets, and strong SEO.`
    : 'No official website. Business relies on directory listings and social media — significant growth opportunity.';
  let operationalPainPoints: string[] = [];
  let systemsNeeded: string[] = [];
  let aiOpportunities: string[] = [];

  if (isMedical) {
    summary = `Professional ${lead.category} providing quality healthcare services to the local community.`;
    operationalPainPoints = ['High front-desk phone congestion during peak hours', 'Manual patient intake processing causing waiting delays', 'No automated review collection cycle'];
    systemsNeeded = ['Patient Self-Booking Calendar', 'Digital Intake & Health Form Portal', 'Automated WhatsApp Check-In Bot'];
    aiOpportunities = ['AI-driven patient inquiry bot on WhatsApp for standard queries', 'Smart follow-up reminder agent based on visit history'];
  } else if (isFood) {
    summary = `Local culinary brand offering quality dining experiences to the community.`;
    operationalPainPoints = [lead.website ? 'Outdated menu not matching current offerings' : 'Manual order coordination via phone and Instagram DMs', 'Loss of catering leads due to no structured intake', 'High commission fees on delivery platforms'];
    systemsNeeded = ['Commission-Free Direct Ordering Hub', 'Digital Catering & Events Module', 'Google Reviews Automation'];
    aiOpportunities = ['AI menu recommendation agent for catering bundles', 'WhatsApp ordering concierge that computes prices and sends to kitchen'];
  } else if (isLogistics) {
    summary = `Transportation and logistics provider coordinating freight and parcel movements.`;
    operationalPainPoints = ['Clients calling repeatedly for shipment status', 'Manual dispatch tracking prone to errors', 'Slow quote response times for custom shipping rates'];
    systemsNeeded = ['Self-Serve Package Tracking Tool', 'Instant Shipping Quote Calculator', 'Fleet Management Dashboard'];
    aiOpportunities = ['Automated price quote engine via WhatsApp', 'AI route intelligence with SMS progress alerts'];
  } else {
    operationalPainPoints = [lead.website ? 'Legacy contact forms frequently broken' : 'Manual appointment scheduling without automation', 'No client segmentation for repeat business', 'Unoptimized local search visibility'];
    systemsNeeded = ['Convertible Landing Page & Client Portal', 'Interactive Scheduling Module', 'CRM with Reviews Automation'];
    aiOpportunities = ['24/7 conversational customer support agent', 'AI-driven localized promo scheduler'];
  }

  return { summary, digitalPresenceSummary, presenceStrength: strength, operationalPainPoints, systemsNeeded, aiOpportunities, digitalMaturityScore: lead.digitalPresenceScore || 50 };
}

export function serverGenerateProposal(lead: Lead, analysis?: BusinessAnalysis): WebDesignProposal {
  const categoryLower = (lead.category || '').toLowerCase();
  const isMedical = /clinic|dent|health|physio|doctor|hospital/i.test(categoryLower);
  const isFood = /eat|rest|bak|cafe|food/i.test(categoryLower);
  const isLogistics = /delivery|freight|logis|cargo|courier/i.test(categoryLower);

  const needDetectedReason = lead.website
    ? 'Obsolete web platform that is not mobile-responsive and lacks booking features.'
    : 'Total online invisibility. Competitors with websites are capturing more search traffic.';

  if (isMedical) {
    return {
      needDetectedReason,
      suggestedType: 'Clinical Patient Scheduler Hub',
      structure: [
        { sectionName: 'Medical Core Promise', purpose: 'Patient trust', contentHint: 'Showcase certified specialists and treatment options' },
        { sectionName: 'Interactive Treatment Scheduler', purpose: 'Erase manual booking calls', contentHint: 'Calendar-based interface for selecting treatment and doctor' },
        { sectionName: 'Patient Success Stories', purpose: 'Social proof', contentHint: 'Verified Google reviews carousel' },
        { sectionName: 'FAQs & Pricing', purpose: 'Reduce intake friction', contentHint: 'Transparent breakdown of consultations and accepted insurance' },
      ],
      heroHeadline: `State-of-the-Art ${lead.category || 'Medical'} Care`,
      heroSubheadline: 'Book your appointment online in under a minute. No phone tag required.',
      selectedCta: 'Book Your Appointment',
      estimatedValue: '$1,800/mo in recaptured bookings',
      readyToSellOffer: 'I will build a patient-focused booking website with automated WhatsApp reminders in 7 days.',
    };
  } else if (isFood) {
    return {
      needDetectedReason,
      suggestedType: 'Commission-Free Direct Ordering Platform',
      structure: [
        { sectionName: 'Hero Visual Gallery', purpose: 'Visual appetite hook', contentHint: 'High-quality food photography with direct order CTA' },
        { sectionName: 'Interactive Menu', purpose: 'Drive cart checkout', contentHint: 'Digital categorized menu with add-to-cart' },
        { sectionName: 'Table Reservation Portal', purpose: 'Erase manual booking', contentHint: 'Calendar for reserving tables and specifying guest count' },
        { sectionName: 'Catering & Events Planner', purpose: 'High-margin deals', contentHint: 'Custom inquiry form with automated price bids' },
      ],
      heroHeadline: 'Delicious Meals, Direct Ordering, Zero Commissions',
      heroSubheadline: 'Order directly from the chef. Skip the 30% platform fees.',
      selectedCta: 'Order Direct & Save',
      estimatedValue: '$1,400/mo recovered from platform commissions',
      readyToSellOffer: 'I will create a direct ordering website with online payments and delivery zone management in 10 days.',
    };
  } else if (isLogistics) {
    return {
      needDetectedReason,
      suggestedType: 'Cargo Tracking & Dispatch Dashboard',
      structure: [
        { sectionName: 'Real-Time Tracker', purpose: 'Self-serve package lookup', contentHint: 'Enter tracking number to see shipment on map' },
        { sectionName: 'Rate Calculator', purpose: 'Drive shipping orders', contentHint: 'Input weight, class, origin, destination for instant quote' },
        { sectionName: 'Distribution Network', purpose: 'Authority showcase', contentHint: 'Interactive map of transport nodes and warehouses' },
        { sectionName: 'Enterprise Portal', purpose: 'B2B capture', contentHint: 'Corporate shipping contracts with bulk discounts' },
      ],
      heroHeadline: 'Fast, Reliable Freight with Real-Time Tracking',
      heroSubheadline: 'Get instant quotes and track every shipment from pickup to delivery.',
      selectedCta: 'Calculate Shipping Rate',
      estimatedValue: '$4,500/mo in operational savings',
      readyToSellOffer: 'I will build a tracking portal with instant quote calculator and SMS alerts in 14 days.',
    };
  }

  // Generic
  return {
    needDetectedReason,
    suggestedType: 'Modern Business Conversion Portal',
    structure: [
      { sectionName: 'Service Showcase', purpose: 'Value hook', contentHint: 'Highlight services and instant contact buttons' },
      { sectionName: 'Booking & Consult Form', purpose: 'Erase back-and-forth calls', contentHint: 'Calendar-based service selection and scheduling' },
      { sectionName: 'Work Gallery', purpose: 'Proof of quality', contentHint: 'Before/after grid or project showcase' },
      { sectionName: 'Client Reviews', purpose: 'Social proof', contentHint: 'Google reviews synced with testimonials' },
    ],
    heroHeadline: `Your Premier ${lead.category || 'Service'} Partner`,
    heroSubheadline: 'Book online or request a quote in seconds.',
    selectedCta: 'Schedule Consultation',
    estimatedValue: '$1,200/mo in new client acquisition',
    readyToSellOffer: 'I will build a conversion-optimized business website with booking and automation in 7 days.',
  };
}

export function serverGeneratePitch(lead: Lead, analysis?: BusinessAnalysis, proposal?: WebDesignProposal): OutreachPitch {
  const prop = proposal || serverGenerateProposal(lead, analysis);
  const ratingText = lead.rating ? `${lead.rating}/5 stars from ${lead.reviewsCount} reviews` : 'great local reviews';
  const nameClean = (lead.name || '').replace(/[&\\/\\\\#,+()$~%.'":*?<>{}]/g, '');

  return {
    email: `Subject: Growth opportunity for ${nameClean}\n\nDear ${nameClean} Team,\n\nI came across your business while researching the local area and saw your excellent reputation (${ratingText}). Your quality is clear — but I noticed a digital gap limiting your growth.\n\n${lead.website ? 'Your website has mobile responsiveness issues, meaning customers searching on phones see a broken layout without easy booking options.' : 'Your business currently has no listed website, meaning potential customers searching for services may choose competitors with a direct booking page.'}\n\nI specialize in building high-converting platforms for ${lead.category || 'local'} businesses. I sketched a custom concept for ${nameClean} that includes: ${prop.structure.map(s => s.sectionName).slice(0, 3).join(', ')}.\n\nWould you be open to a 2-minute preview of how this looks?\n\nBest,\nSales Intelligence Partner`,
    linkedin: `Hi ${nameClean} team! Impressed by your ${ratingText}. I noticed you handle bookings manually — I designed a custom scheduling website concept specifically for your business. Happy to share a 2-minute mockup preview. Let's connect!`,
    whatsapp: `Hello ${nameClean} team! 👋 Saw your amazing reviews (${ratingText})! I noticed you take bookings manually — I created a professional website & booking system specifically for your business. Would you like to see the preview mockups for free? 🚀`,
  };
}

// ─── Tool Definitions ───

/**
 * Search for new leads by query and location.
 */
export const searchLeadsTool: AgentTool = {
  name: 'searchLeads',
  description: 'Search for new business leads by industry/query and location. Returns up to 5 matching leads with digital presence scores.',
  parameters: [
    strParam('query', 'The search query (e.g., "dentist", "restaurant", "gym")'),
    strParam('location', 'The location to search in (e.g., "Accra", "Lagos", "Nairobi")', false),
    strParam('source', 'Source to search from: "google_maps", "linkedin", "facebook", or "ai_search"', false),
  ],
  execute: async (args: { query: string; location?: string; source?: string }, ctx: AgentContext) => {
    const { query, location, source } = args;
    const fullQuery = location ? `${query} in ${location}` : query;
    
    agentLogger.info('searchLeads', `Searching for "${fullQuery}"`, { toolArgs: args });
    const results = generateFallbackLeads(fullQuery, source);
    agentLogger.info('searchLeads', `Found ${results.length} leads`, { details: results.map(r => r.name).join(', ') });
    
    return results;
  },
};

/**
 * Score a lead and return the breakdown.
 */
export const scoreLeadTool: AgentTool = {
  name: 'scoreLead',
  description: 'Score a lead across 5 dimensions (hasWebsite, digitalPresence, reviewQuality, bookingPotential, brandGap) and get an overall opportunity score (0-100). Higher = more sales opportunity.',
  parameters: [
    strParam('leadId', 'The ID of the lead to score'),
  ],
  execute: async (args: { leadId: string }, ctx: AgentContext) => {
    const lead = ctx.leadDatabase.find(l => l.id === args.leadId);
    if (!lead) {
      agentLogger.warn('scoreLead', `Lead "${args.leadId}" not found`);
      return { error: `Lead with ID "${args.leadId}" not found. Available leads: ${ctx.leadDatabase.map(l => l.id + ': ' + l.name).join(', ')}` };
    }
    const breakdown = calculateScoreBreakdown(lead);
    const opportunityScore = calculateOpportunityScore(lead);
    agentLogger.info('scoreLead', `Scored "${lead.name}": ${opportunityScore}/100`, { details: `Breakdown: ${JSON.stringify(breakdown)}` });
    return { lead: { id: lead.id, name: lead.name, category: lead.category }, scoreBreakdown: breakdown, opportunityScore };
  },
};

/**
 * Get a deep analysis of a lead.
 */
export const analyzeLeadTool: AgentTool = {
  name: 'analyzeLead',
  description: 'Get a deep business analysis of a lead, including pain points, systems needed, and AI opportunities.',
  parameters: [
    strParam('leadId', 'The ID of the lead to analyze'),
  ],
  execute: async (args: { leadId: string }, ctx: AgentContext) => {
    const lead = ctx.leadDatabase.find(l => l.id === args.leadId);
    if (!lead) {
      agentLogger.warn('analyzeLead', `Lead "${args.leadId}" not found`);
      return { error: `Lead "${args.leadId}" not found` };
    }
    agentLogger.info('analyzeLead', `Analyzing "${lead.name}"`);
    const analysis = serverAnalyzeLead(lead);
    return { lead: { id: lead.id, name: lead.name }, analysis };
  },
};

/**
 * Generate a web design proposal for a lead.
 */
export const generateProposalTool: AgentTool = {
  name: 'generateProposal',
  description: 'Generate a custom web design proposal for a lead, including suggested site structure and value estimate.',
  parameters: [
    strParam('leadId', 'The ID of the lead'),
  ],
  execute: async (args: { leadId: string }, ctx: AgentContext) => {
    const lead = ctx.leadDatabase.find(l => l.id === args.leadId);
    if (!lead) {
      agentLogger.warn('generateProposal', `Lead "${args.leadId}" not found`);
      return { error: `Lead "${args.leadId}" not found` };
    }
    agentLogger.info('generateProposal', `Generating proposal for "${lead.name}"`);
    const proposal = serverGenerateProposal(lead);
    return { lead: { id: lead.id, name: lead.name }, proposal };
  },
};

/**
 * Generate outreach pitches for a lead (email, LinkedIn, WhatsApp).
 */
export const generatePitchTool: AgentTool = {
  name: 'generatePitch',
  description: 'Generate personalized outreach messages for a lead across 3 channels: email, LinkedIn DM, and WhatsApp. Returns ready-to-send copy.',
  parameters: [
    strParam('leadId', 'The ID of the lead'),
  ],
  execute: async (args: { leadId: string }, ctx: AgentContext) => {
    const lead = ctx.leadDatabase.find(l => l.id === args.leadId);
    if (!lead) {
      agentLogger.warn('generatePitch', `Lead "${args.leadId}" not found`);
      return { error: `Lead "${args.leadId}" not found` };
    }
    agentLogger.info('generatePitch', `Generating pitch for "${lead.name}"`);
    const pitch = serverGeneratePitch(lead);
    return { lead: { id: lead.id, name: lead.name }, pitch };
  },
};

/**
 * Get CRM statistics (total leads, no-website count, conversion rate, revenue, etc.)
 */
export const getCrmStatsTool: AgentTool = {
  name: 'getCrmStats',
  description: 'Get the current CRM dashboard statistics: total leads, no-website count, conversion rate, estimated pipeline revenue, and more.',
  parameters: [],
  execute: async (_args: {}, ctx: AgentContext) => {
    const db = ctx.leadDatabase;
    const total = db.length;
    const noWebsite = db.filter(l => !l.website).length;
    const contacted = db.filter(l => l.status !== 'new').length;
    const replied = db.filter(l => l.status === 'replied' || l.status === 'interested' || l.status === 'closed').length;
    const meetingsBooked = db.filter(l => l.status === 'interested' || l.status === 'closed').length;
    const closedCount = db.filter(l => l.status === 'closed').length;
    const conversionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;
    const revenue = db.reduce((acc, lead) => {
      if (lead.status === 'closed') {
        return acc + (lead.serviceType === 'web_design' ? 1500 : lead.serviceType === 'ai_automation' ? 2500 : 4000);
      } else if (lead.status === 'interested') {
        return acc + (lead.serviceType === 'web_design' ? 1500 : lead.serviceType === 'ai_automation' ? 2500 : 4000) * 0.5;
      }
      return acc;
    }, 0);

    agentLogger.info('getCrmStats', `Stats: ${total} leads, ${noWebsite} no website, $${revenue} pipeline`);

    return {
      totalLeads: total,
      leadsWithNoWebsite: noWebsite,
      contactedLeads: contacted,
      replied: replied,
      meetingsBooked,
      conversionRate,
      estimatedRevenue: revenue,
    };
  },
};

/**
 * Get all leads, optionally filtered by status or source.
 */
export const getLeadsTool: AgentTool = {
  name: 'getLeads',
  description: 'Get all leads from the CRM database, optionally filtered by status or source.',
  parameters: [
    strParam('status', 'Filter by status: "new", "contacted", "replied", "interested", "closed"', false),
    strParam('source', 'Filter by source: "google_maps", "linkedin", "facebook", "ai_search", "manual_import"', false),
    numParam('limit', 'Maximum number of leads to return', false),
  ],
  execute: async (args: { status?: string; source?: string; limit?: number }, ctx: AgentContext) => {
    let filtered = [...ctx.leadDatabase];
    if (args.status) filtered = filtered.filter(l => l.status === args.status);
    if (args.source) filtered = filtered.filter(l => l.source === args.source);
    if (args.limit && args.limit > 0) filtered = filtered.slice(0, args.limit);
    return filtered.map(l => ({
      id: l.id,
      name: l.name,
      category: l.category,
      status: l.status,
      source: l.source,
      website: l.website,
      rating: l.rating,
      digitalPresenceScore: l.digitalPresenceScore,
      tags: l.tags,
      phone: l.phone,
      address: l.address,
      outreachCount: l.outreachHistory?.length || 0,
      createdAt: l.createdAt,
    }));
  },
};

/**
 * Update a lead's status and/or notes.
 */
export const updateLeadTool: AgentTool = {
  name: 'updateLead',
  description: 'Update a lead\'s status, notes, or tags in the database.',
  parameters: [
    strParam('leadId', 'The ID of the lead to update'),
    strParam('status', 'New status: "new", "contacted", "replied", "interested", "closed"', false),
    strParam('notes', 'Updated notes for the lead', false),
    arrParam('tags', 'Updated tags for the lead', 'string', false),
  ],
  execute: async (args: { leadId: string; status?: string; notes?: string; tags?: string[] }, ctx: AgentContext) => {
    const idx = ctx.leadDatabase.findIndex(l => l.id === args.leadId);
    if (idx === -1) return { error: `Lead "${args.leadId}" not found` };
    const lead = ctx.leadDatabase[idx];
    if (args.status) lead.status = args.status as Lead['status'];
    if (args.notes) lead.notes = args.notes;
    if (args.tags) lead.tags = args.tags;
    ctx.leadDatabase[idx] = lead;
    return { success: true, lead: { id: lead.id, name: lead.name, status: lead.status, notes: lead.notes } };
  },
};

/**
 * Get a specific lead by ID with full details.
 */
export const getLeadTool: AgentTool = {
  name: 'getLead',
  description: 'Get full details of a specific lead by ID.',
  parameters: [
    strParam('leadId', 'The ID of the lead to retrieve'),
  ],
  execute: async (args: { leadId: string }, ctx: AgentContext) => {
    const lead = ctx.leadDatabase.find(l => l.id === args.leadId);
    if (!lead) return { error: `Lead "${args.leadId}" not found` };
    return lead;
  },
};

/**
 * Search for leads with no website (high priority targets).
 */
export const getNoWebsiteLeadsTool: AgentTool = {
  name: 'getNoWebsiteLeads',
  description: 'Get leads that have no website — these are high-priority web design opportunities.',
  parameters: [
    numParam('limit', 'Maximum number of leads to return', false),
  ],
  execute: async (args: { limit?: number }, ctx: AgentContext) => {
    let filtered = ctx.leadDatabase.filter(l => !l.website);
    if (args.limit && args.limit > 0) filtered = filtered.slice(0, args.limit);
    return filtered.map(l => ({
      id: l.id,
      name: l.name,
      category: l.category,
      status: l.status,
      address: l.address,
      rating: l.rating,
      digitalPresenceScore: l.digitalPresenceScore,
    }));
  },
};

/**
 * Send WhatsApp messages to multiple leads in batch.
 * Filters by optional criteria (status, noWebsiteOnly, minScore).
 * If scheduleFor is provided, creates scheduled follow-up jobs instead of sending immediately.
 */
export const batchWhatsAppOutreachTool: AgentTool = {
  name: 'batchWhatsAppOutreach',
  description: 'Send WhatsApp outreach messages to multiple leads in batch. You can filter leads by status (e.g., "new"), by "noWebsiteOnly", or by minimum opportunity score. Optionally schedule for a future date instead of sending immediately. This is the most efficient way to contact many leads at once.',
  parameters: [
    strParam('message', 'The WhatsApp message text to send to all leads'),
    strParam('status', 'Filter leads by status: "new", "contacted", "replied", "interested", "closed"', false),
    boolParam('noWebsiteOnly', 'If true, only send to leads without a website', false),
    numParam('minScore', 'Minimum opportunity score (0-100) for filtering leads', false),
    numParam('maxLeads', 'Maximum number of leads to contact (safety cap, default 10)', false),
    strParam('scheduleFor', 'ISO timestamp for scheduled delivery. If omitted, sends immediately', false),
  ],
  execute: async (args: { message: string; status?: string; noWebsiteOnly?: boolean; minScore?: number; maxLeads?: number; scheduleFor?: string }, ctx: AgentContext) => {
    const { message, status, noWebsiteOnly, minScore, maxLeads = 10, scheduleFor } = args;

    if (!message) {
      return { error: 'Message text is required for batch outreach.' };
    }

    agentLogger.info('batchWhatsAppOutreach', `Starting batch outreach: ${status || 'all'} leads, ${noWebsiteOnly ? 'no-website only, ' : ''}max ${maxLeads} leads`);

    // Filter leads
    let targets = [...ctx.leadDatabase];
    if (status) targets = targets.filter(l => l.status === status);
    if (noWebsiteOnly) targets = targets.filter(l => !l.website);
    if (minScore !== undefined) {
      targets = targets.filter(l => {
        const score = l.scoreBreakdown?.total || 50;
        return score >= minScore;
      });
    }
    // Only leads with phone numbers
    targets = targets.filter(l => l.phone);

    // Sort by priority: no website first, then by score
    targets.sort((a, b) => {
      const aScore = a.scoreBreakdown?.total || 0;
      const bScore = b.scoreBreakdown?.total || 0;
      const aNoWeb = !a.website ? 100 : 0;
      const bNoWeb = !b.website ? 100 : 0;
      return (bScore + bNoWeb) - (aScore + aNoWeb);
    });

    const batch = targets.slice(0, Math.min(maxLeads, 20));

    if (batch.length === 0) {
      agentLogger.warn('batchWhatsAppOutreach', 'No matching leads found');
      return { error: 'No leads match the given filters.', filtered: 0 };
    }

    agentLogger.info('batchWhatsAppOutreach', `Sending to ${batch.length} leads`, { details: batch.map(l => l.name).join(', ') });

    if (!isWhatsAppConfigured()) {
      agentLogger.warn('batchWhatsAppOutreach', 'WhatsApp API not configured');
      return {
        error: 'WhatsApp Business API is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env',
        warning: 'The messages were generated but not sent.',
        targetLeads: batch.map(l => ({ id: l.id, name: l.name, phone: l.phone })),
        generatedMessage: message,
      };
    }

    const results: { leadId: string; leadName: string; success: boolean; jobId?: string; error?: string }[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const lead of batch) {
      try {
        if (scheduleFor) {
          // Schedule for later
          const job = scheduler.createJob({
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone!,
            message,
            scheduledAt: scheduleFor,
            metadata: { source: 'agent_batch_broadcast' },
          });

          lead.outreachHistory = lead.outreachHistory || [];
          lead.outreachHistory.push({
            id: `agent-batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            channel: 'whatsapp',
            status: 'pending',
            sentAt: new Date().toISOString(),
            notes: `[Bishop] Scheduled batch follow-up for ${new Date(scheduleFor).toLocaleString()}. Job ID: ${job.id}`,
            followUpDate: scheduleFor,
          });
          if (lead.status === 'new') lead.status = 'contacted';

          succeeded++;
          results.push({ leadId: lead.id, leadName: lead.name, success: true, jobId: job.id });
        } else {
          // Send immediately
          const result = await sendTextMessage(lead.phone!, message);
          if (result && result.status !== 'failed') {
            lead.outreachHistory = lead.outreachHistory || [];
            lead.outreachHistory.push({
              id: `agent-batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              channel: 'whatsapp',
              status: 'sent',
              sentAt: result.timestamp,
              notes: `[Bishop] Sent via batch outreach. Message ID: ${result.messageId}`,
            });
            if (lead.status === 'new') lead.status = 'contacted';
            succeeded++;
            results.push({ leadId: lead.id, leadName: lead.name, success: true });
          } else {
            failed++;
            results.push({ leadId: lead.id, leadName: lead.name, success: false, error: result?.error || 'Send failed' });
          }
        }
      } catch (err: any) {
        failed++;
        results.push({ leadId: lead.id, leadName: lead.name, success: false, error: err.message });
      }
    }

    agentLogger.info('batchWhatsAppOutreach', `Complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      total: results.length,
      succeeded,
      failed,
      results,
      details: scheduleFor
        ? `Scheduled WhatsApp outreach to ${succeeded} leads for ${new Date(scheduleFor).toLocaleString()}`
        : `Sent WhatsApp outreach to ${succeeded} leads (${failed} failed)`,
    };
  },
};

/**
 * Schedule an automated follow-up message for a lead at a specific future time.
 */
export const scheduleFollowUpTool: AgentTool = {
  name: 'scheduleFollowUp',
  description: 'Schedule an automated WhatsApp follow-up message for a specific lead at a future date/time. The follow-up message is auto-generated based on the lead\'s outreach history and attempt number. Use this after an initial outreach to automatically follow up if the lead doesn\'t respond.',
  parameters: [
    strParam('leadId', 'The ID of the lead to schedule a follow-up for'),
    strParam('scheduledAt', 'ISO timestamp for when the follow-up should be sent (e.g., "2026-06-01T10:00:00.000Z")'),
    strParam('message', 'Custom message text. If omitted, auto-generates based on outreach history', false),
    numParam('maxAttempts', 'Maximum send retry attempts if delivery fails (default 3)', false),
  ],
  execute: async (args: { leadId: string; scheduledAt: string; message?: string; maxAttempts?: number }, ctx: AgentContext) => {
    const { leadId, scheduledAt, message, maxAttempts } = args;

    const lead = ctx.leadDatabase.find(l => l.id === leadId);
    if (!lead) {
      agentLogger.warn('scheduleFollowUp', `Lead "${leadId}" not found`);
      return { error: `Lead with ID "${leadId}" not found.` };
    }

    if (!lead.phone) {
      agentLogger.warn('scheduleFollowUp', `Lead "${lead.name}" has no phone number`);
      return { error: `Lead "${lead.name}" has no phone number. Cannot schedule WhatsApp follow-up.` };
    }

    // Auto-generate follow-up message if not provided
    const attemptNumber = (lead.outreachHistory?.length || 0) + 1;
    const followUpMessage = message || generateFollowUpMessage(lead, attemptNumber);

    agentLogger.info('scheduleFollowUp', `Scheduling follow-up for "${lead.name}" at ${new Date(scheduledAt).toLocaleString()}`);

    if (!isWhatsAppConfigured()) {
      agentLogger.warn('scheduleFollowUp', 'WhatsApp API not configured');
      return {
        warning: 'WhatsApp API not configured. The follow-up was logged but won\'t send.',
        followUpMessage,
        scheduledAt,
        leadId: lead.id,
        leadName: lead.name,
      };
    }

    // Create the scheduled job
    const job = scheduler.createJob({
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone,
      message: followUpMessage,
      scheduledAt,
      attemptNumber,
      maxAttempts: maxAttempts || 3,
      metadata: { source: 'agent_scheduled_followup' },
    });

    // Log in outreach history
    lead.outreachHistory = lead.outreachHistory || [];
    lead.outreachHistory.push({
      id: `followup-scheduled-${Date.now()}`,
      channel: 'whatsapp',
      status: 'pending',
      sentAt: new Date().toISOString(),
      notes: `[Bishop] Scheduled follow-up #${attemptNumber} for ${new Date(scheduledAt).toLocaleString()}. Job ID: ${job.id}`,
      followUpDate: scheduledAt,
    });

    agentLogger.info('scheduleFollowUp', `Created job ${job.id} for "${lead.name}"`);

    return {
      success: true,
      jobId: job.id,
      lead: { id: lead.id, name: lead.name },
      followUpMessage,
      scheduledAt,
      attemptNumber,
      details: `Follow-up scheduled for ${lead.name} at ${new Date(scheduledAt).toLocaleString()}. Message: "${followUpMessage.slice(0, 80)}..."`,
    };
  },
};

/**
 * Get all scheduled follow-up jobs, optionally filtered by leadId or status.
 */
export const getScheduledJobsTool: AgentTool = {
  name: 'getScheduledJobs',
  description: 'View all scheduled WhatsApp follow-up jobs. Optionally filter by lead ID or status ("pending", "executing", "completed", "failed", "cancelled"). Use this to check when follow-ups are scheduled and their current status.',
  parameters: [
    strParam('leadId', 'Filter by lead ID to see only their scheduled jobs', false),
    strParam('status', 'Filter by job status: "pending", "executing", "completed", "failed", "cancelled"', false),
  ],
  execute: async (args: { leadId?: string; status?: string }, ctx: AgentContext) => {
    const { leadId, status } = args;

    let jobs = scheduler.getJobs(status as any);
    if (leadId) {
      jobs = jobs.filter(j => j.leadId === leadId);
    }

    // Enrich with lead names
    const enriched = jobs.map(j => ({
      id: j.id,
      leadId: j.leadId,
      leadName: j.leadName,
      type: j.type,
      status: j.status,
      scheduledAt: j.scheduledAt,
      createdAt: j.createdAt,
      attemptNumber: j.attemptNumber,
      message: j.message.slice(0, 100) + (j.message.length > 100 ? '...' : ''),
      result: j.result,
    }));

    agentLogger.info('getScheduledJobs', `Found ${jobs.length} jobs`);

    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      jobs: enriched,
    };
  },
};

// ─── All tools registry ───

/**
 * Send a WhatsApp outreach message to a lead via the WhatsApp Business API.
 * Auto-generates the pitch text if not provided, logs the outreach in CRM,
 * and returns delivery status.
 */
export const sendWhatsAppOutreachTool: AgentTool = {
  name: 'sendWhatsAppOutreach',
  description: 'Send a WhatsApp message to a lead via the WhatsApp Business API. If no custom text is provided, it auto-generates the pitch using the lead\'s analysis. Returns delivery status and auto-logs the outreach in CRM history.',
  parameters: [
    strParam('leadId', 'The ID of the lead to message'),
    strParam('text', 'Custom message text. If omitted, auto-generates from the lead\'s pitch template', false),
  ],
  execute: async (args: { leadId: string; text?: string }, ctx: AgentContext) => {
    const lead = ctx.leadDatabase.find(l => l.id === args.leadId);
    if (!lead) {
      agentLogger.warn('sendWhatsAppOutreach', `Lead "${args.leadId}" not found`);
      return { error: `Lead "${args.leadId}" not found` };
    }

    if (!lead.phone) {
      agentLogger.warn('sendWhatsAppOutreach', `Lead "${lead.name}" has no phone number`);
      return { error: `Lead "${lead.name}" has no phone number. Cannot send WhatsApp.` };
    }

    // Auto-generate pitch text if not provided
    let messageText = args.text;
    if (!messageText) {
      if (lead.outreachPitch?.whatsapp) {
        messageText = lead.outreachPitch.whatsapp;
      } else {
        // Generate pitch on the fly
        const pitch = serverGeneratePitch(lead);
        messageText = pitch.whatsapp;
      }
    }

    agentLogger.info('sendWhatsAppOutreach', `Sending WhatsApp to "${lead.name}" (${lead.phone})`);

    // Check if WhatsApp API is configured
    if (!isWhatsAppConfigured()) {
      agentLogger.warn('sendWhatsAppOutreach', 'WhatsApp API not configured');
      return {
        error: 'WhatsApp Business API is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env',
        generatedText: messageText,
        warning: 'The pitch text was generated but not sent. Copy it from outreachPitch.whatsapp or the generatedText field.',
      };
    }

    try {
      const result = await sendTextMessage(lead.phone, messageText);

      if (!result) {
        agentLogger.error('sendWhatsAppOutreach', 'Failed to send — null result from WhatsApp API');
        return { error: 'WhatsApp API returned no result. Check your credentials.' };
      }

      // Log the outreach in CRM history
      const entry = {
        id: `wa-agent-${Date.now()}`,
        channel: 'whatsapp' as const,
        status: result.status === 'failed' ? 'no_response' as const : 'sent' as const,
        sentAt: result.timestamp,
        notes: `[Bishop] WhatsApp outreach sent via Agentic workflow. Message ID: ${result.messageId}`,
      };

      if (!lead.outreachHistory) lead.outreachHistory = [];
      lead.outreachHistory.push(entry);

      // Auto-update lead status
      if (result.status !== 'failed' && lead.status === 'new') {
        lead.status = 'contacted';
      }

      agentLogger.info('sendWhatsAppOutreach', `Result: ${result.status} (ID: ${result.messageId})`);

      return {
        success: result.status !== 'failed',
        lead: { id: lead.id, name: lead.name, phone: lead.phone },
        messageStatus: result,
        details: result.status === 'failed'
          ? `Delivery failed: ${result.error || 'Unknown error'}`
          : `WhatsApp message sent to ${lead.name}. Message ID: ${result.messageId}. Status: ${result.status}`,
      };
    } catch (err: any) {
      agentLogger.error('sendWhatsAppOutreach', `Error: ${err.message}`);
      return { error: `Failed to send WhatsApp message: ${err.message || String(err)}` };
    }
  },
};

export const ALL_TOOLS: AgentTool[] = [
  searchLeadsTool,
  scoreLeadTool,
  analyzeLeadTool,
  generateProposalTool,
  generatePitchTool,
  sendWhatsAppOutreachTool,
  batchWhatsAppOutreachTool,
  scheduleFollowUpTool,
  getScheduledJobsTool,
  getCrmStatsTool,
  getLeadsTool,
  getLeadTool,
  updateLeadTool,
  getNoWebsiteLeadsTool,
];
