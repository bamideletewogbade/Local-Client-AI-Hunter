/**
 * AI Client Hunter Types & Interfaces
 */

export type LeadSource = 'google_maps' | 'linkedin' | 'facebook' | 'ai_search' | 'manual_import' | 'csv_import';

export type OutreachChannel = 'whatsapp' | 'email' | 'linkedin_dm' | 'physical_visit' | 'phone_call';

export type OutreachStatus = 'pending' | 'sent' | 'opened' | 'replied' | 'no_response' | 'interested' | 'not_interested';

export interface OutreachEntry {
  id: string;
  channel: OutreachChannel;
  status: OutreachStatus;
  sentAt: string;
  respondedAt?: string | null;
  notes: string;
  followUpDate?: string | null;
}

export interface ScoreBreakdown {
  hasWebsite: number;
  digitalPresence: number;
  reviewQuality: number;
  bookingPotential: number;
  brandGap: number;
  total: number;
}

export interface BusinessAnalysis {
  summary: string;
  digitalPresenceSummary: string;
  presenceStrength: 'low' | 'medium' | 'high';
  operationalPainPoints: string[];
  systemsNeeded: string[];
  aiOpportunities: string[];
  digitalMaturityScore: number;
}

export interface WebDesignStructureSection {
  sectionName: string;
  purpose: string;
  contentHint: string;
}

export interface WebDesignProposal {
  needDetectedReason: string;
  suggestedType: string;
  structure: WebDesignStructureSection[];
  heroHeadline: string;
  heroSubheadline: string;
  selectedCta: string;
  estimatedValue: string;
  readyToSellOffer: string;
}

export interface OutreachPitch {
  email: string;
  linkedin: string;
  whatsapp: string;
}

export interface BIReport {
  businessOverview: string;
  digitalHealthScore: number;
  topOpportunity: string;
  recommendedAction: string;
  competitiveInsight: string;
  estimatedValueUpside: string;
}

export interface Lead {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  address: string;
  rating: number | null;
  reviewsCount: number | null;
  website: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'new' | 'contacted' | 'replied' | 'interested' | 'closed';
  notes: string;
  tags: string[];
  serviceType: 'ai_automation' | 'web_design' | 'hybrid';
  digitalPresenceScore: number;
  createdAt: string;
  source: LeadSource;
  scoreBreakdown?: ScoreBreakdown | null;
  outreachHistory: OutreachEntry[];
  aiAnalysis?: BusinessAnalysis | null;
  webDesignProposal?: WebDesignProposal | null;
  outreachPitch?: OutreachPitch | null;
  biReport?: BIReport | null;
}

export interface DashboardStats {
  totalLeads: number;
  noWebsite: number;
  contactedLeads: number;
  repliesReceived: number;
  meetingsBooked: number;
  conversionRate: number;
  estimatedPipelineRevenue: number;
  leadsBySource: { source: string; count: number }[];
  avgLeadScore: number;
}

export interface WhatsAppMessageStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  error?: string;
}

export interface WhatsAppConfig {
  configured: boolean;
  phoneNumberId?: string;
  webhookToken?: string;
}

export interface FollowUpJob {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  type: 'whatsapp_followup' | 'whatsapp_reengagement' | 'whatsapp_reminder';
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: string;
  createdAt: string;
  message: string;
  attemptNumber: number;
  maxAttempts: number;
  result?: {
    messageId?: string;
    status?: string;
    sentAt?: string;
    error?: string;
  };
  metadata?: Record<string, any>;
}

export interface BatchOutreachConfig {
  leadIds: string[];
  message?: string;
  templateName?: string;
  scheduleAt?: string; // ISO timestamp for scheduled send, empty = send now
  maxMessages: number;  // Cap for safety
  channel: 'whatsapp';
}

export interface SearchQueryConfig {
  query: string;
  location?: string;
  industry?: string;
  hasNoWebsiteOnly?: boolean;
  source?: LeadSource;
}
