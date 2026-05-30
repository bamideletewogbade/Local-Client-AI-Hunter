import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, Building2, Phone, MapPin, Globe, Star, ShieldAlert,
  Loader2, Check, Copy, Settings, Calendar, Award, Layout, Briefcase, FileText,
  Mail, MessageSquare, Linkedin, Send, RefreshCw, AlertCircle, ArrowUpRight,
  TrendingUp, BarChart3, Target, Clock, PhoneCall, Footprints, Megaphone, ChevronDown
} from 'lucide-react';
import { Lead, BusinessAnalysis, WebDesignProposal, OutreachPitch, OutreachEntry, ScoreBreakdown, BIReport, Campaign, PriorityScore, AgentPersonaType } from '../types';
import { useAuth } from './AuthContext';
import ConfirmationDialog from './ConfirmationDialog';
import PriorityScoreGauge, { generatePriorityScore } from './PriorityScoreGauge';
import CampaignSequence from './CampaignSequence';
import CampaignAnalyticsDashboard from './CampaignAnalyticsDashboard';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LeadSidePanelProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (updated: Lead) => void;
  onDeleteLead?: (id: string) => void;
}

export default function LeadSidePanel({ lead, onClose, onUpdateLead, onDeleteLead }: LeadSidePanelProps) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'website_offer' | 'outreach' | 'bi_report' | 'campaigns'>('audit');

  
  // Action Loading states
  const [isAuditing, setIsAuditing] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isPitching, setIsPitching] = useState(false);
  const [copiedText, setCopiedText] = useState<{ [key: string]: boolean }>({});
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState<{ [key: string]: 'idle' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' }>({});
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);

  // Campaigns state — persisted per lead
  const [leadCampaigns, setLeadCampaigns] = useLocalStorage<Campaign[]>(`hunter_campaigns_${lead.id}`, []);
  const [showCampaignAnalytics, setShowCampaignAnalytics] = useState(false);
  
  // Priority score — computed from lead data (recomputed on lead change)
  const [priorityScore, setPriorityScore] = useState<PriorityScore | null>(null);
  
  const computePriorityScore = () => {
    setPriorityScore(generatePriorityScore(lead));
  };

  // Recompute when lead changes
  useEffect(() => {
    setPriorityScore(generatePriorityScore(lead));
  }, [lead.id, lead.website, lead.rating, lead.phone, lead.address, lead.category, lead.digitalPresenceScore]);

  // Check if WhatsApp API is configured on mount
  useEffect(() => {
    fetch('/api/whatsapp/config')
      .then(res => res.json())
      .then(data => setWhatsappConfigured(data.configured))
      .catch(() => setWhatsappConfigured(false));
  }, []);

  // Poll delivery status for recently sent WhatsApp messages
  useEffect(() => {
    const sendingKeys = Object.entries(whatsappSending).filter(([, v]) => v === 'sent');
    if (sendingKeys.length === 0) return;

    const interval = setInterval(async () => {
      for (const [msgId] of sendingKeys) {
        try {
          const res = await fetch(`/api/whatsapp/status/${msgId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status && data.status.status !== 'sent') {
              setWhatsappSending(prev => ({ ...prev, [msgId]: data.status.status, whatsapp: data.status.status }));
            }
          }
        } catch { /* ignore polling errors */ }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [whatsappSending]);

  // Reset tabs when the inspected lead changes
  useEffect(() => {
    setActiveSubTab('audit');
    setPanelError(null);
  }, [lead?.id]);

  if (!lead) return null;

  const currentAnalysis = lead.aiAnalysis;
  const currentProposal = lead.webDesignProposal;
  const currentPitch = lead.outreachPitch;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCopiedText((prev) => ({ ...prev, [type]: false }));
    }, 2000);
  };

  const sendWhatsAppMessage = async (text: string, type: string) => {
    if (!lead.phone) {
      setPanelError('No phone number available for this lead.');
      return;
    }

    setWhatsappSending(prev => ({ ...prev, [type]: 'sending' }));
    setPanelError(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.phone,
          text,
          leadId: lead.id,
        }),
      });

      const data = await res.json();

      if (data.success && data.status?.messageId) {
        setWhatsappSending(prev => ({ ...prev, [type]: 'sent' }));
        // Store the messageId for polling
        setWhatsappSending(prev => ({ ...prev, [data.status.messageId]: 'sent' }));
      } else if (data.isFallback) {
        setPanelError('WhatsApp API not configured. Copy the message and send manually.');
        setWhatsappSending(prev => ({ ...prev, [type]: 'idle' }));
      } else {
        setPanelError(data.error || 'Failed to send WhatsApp message.');
        setWhatsappSending(prev => ({ ...prev, [type]: 'failed' }));
      }
    } catch (err: any) {
      setPanelError('Network error sending WhatsApp message.');
      setWhatsappSending(prev => ({ ...prev, [type]: 'idle' }));
    }
  };

  // Run AI deep audit
  const runAiAudit = async () => {
    setIsAuditing(true);
    setPanelError(null);
    try {
      const response = await fetch('/api/leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      if (!response.ok) throw new Error("Server failed to run model analysis.");
      const data = await response.json();
      
      if (data.isFallback) {
        localStorage.setItem('hunter_ai_fallback', 'true');
        window.dispatchEvent(new Event('storage'));
      }
      
      const updatedLead: Lead = {
        ...lead,
        aiAnalysis: data.analysis,
        digitalPresenceScore: data.analysis.digitalMaturityScore
      };

      // Automatically update DB
      await updateDbLead(updatedLead);
    } catch (err: any) {
      setPanelError(err.message || "An error occurred during AI analysis.");
    } finally {
      setIsAuditing(false);
    }
  };

  // Run Web Proposal Generator
  const runWebProposal = async () => {
    setIsProposing(true);
    setPanelError(null);
    try {
      // First make sure we have an analysis
      let auditResult = currentAnalysis;
      if (!auditResult) {
        const auditResponse = await fetch('/api/leads/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead }),
        });
        const auditData = await auditResponse.json();
        auditResult = auditData.analysis;
      }

      const response = await fetch('/api/leads/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, analysis: auditResult }),
      });
      if (!response.ok) throw new Error("Could not formulate layout proposal.");
      const data = await response.json();

      // Next generate the pitches matching the proposal
      const pitchResponse = await fetch('/api/leads/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, analysis: auditResult, proposal: data.proposal }),
      });
      const pitchData = await pitchResponse.json();

      if (data.isFallback || pitchData?.isFallback) {
        localStorage.setItem('hunter_ai_fallback', 'true');
        window.dispatchEvent(new Event('storage'));
      }

      const updatedLead: Lead = {
        ...lead,
        aiAnalysis: auditResult,
        webDesignProposal: data.proposal,
        outreachPitch: pitchData.pitch
      };

      await updateDbLead(updatedLead);
      setActiveSubTab('website_offer');
    } catch (err: any) {
      setPanelError(err.message || "Error building layout proposal draft.");
    } finally {
      setIsProposing(false);
    }
  };

  const updateDbLead = async (updated: Lead) => {
    if (user) {
      onUpdateLead(updated);
      return;
    }

    try {
      const response = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (response.ok) {
        onUpdateLead(updated);
      }
    } catch (error) {
      console.error("Failed to sync updated lead state on backend database.", error);
      onUpdateLead(updated); // fallback client sync
    }
  };

  const handleStatusChange = async (newStatus: Lead['status']) => {
    const updated: Lead = { ...lead, status: newStatus };
    await updateDbLead(updated);
  };

  const handleNotesChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated: Lead = { ...lead, notes: e.target.value };
    onUpdateLead(updated); // update UI state instantly
  };

  // Sync notes backend on loss of focus
  const handleNotesBlur = async () => {
    await updateDbLead(lead);
  };

  const handleTagsInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      const val = input.value.trim();
      if (val && !lead.tags.includes(val)) {
        const updated: Lead = { ...lead, tags: [...lead.tags, val] };
        input.value = '';
        await updateDbLead(updated);
      }
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const updated: Lead = { ...lead, tags: lead.tags.filter(t => t !== tagToRemove) };
    await updateDbLead(updated);
  };

  return (
    <div id="side-panel-container" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-zinc-800 bg-[#0C0C0E] p-0 shadow-2xl transition-transform duration-300">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-[#09090B]/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0C0C0E] border border-zinc-800">
            <Building2 className="h-5 w-5 text-zinc-300" />
          </div>
          <div>
            <h4 className="text-sm font-sans font-bold text-white truncate max-w-[280px]" title={lead.name}>{lead.name}</h4>
            <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase">{lead.category}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors duration-150 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        
        {panelError && (
          <div className="flex items-start gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <p>{panelError}</p>
          </div>
        )}

        {/* Status Dropdowns, Core Metadata */}
        <div className="grid grid-cols-2 gap-3.5 bg-[#09090B]/50 p-3.5 border border-zinc-800 rounded-xl">
          <div>
            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block mb-1">Pipeline Status</label>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as Lead['status'])}
              className="w-full bg-[#09090B] border border-zinc-800 text-xs text-zinc-100 rounded-lg p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer outline-none"
            >
              <option value="new">🆕 New Opportunity</option>
              <option value="contacted">🔄 Contacted</option>
              <option value="replied">💬 Replied back</option>
              <option value="interested">🔥 Meeting Booked</option>
              <option value="closed">💼 Closed Won Deal</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block mb-1">Inferred Quality</label>
            <div className="flex h-[38px] items-center px-2.5 text-xs text-zinc-200 border border-zinc-800 bg-[#09090B] rounded-lg font-bold gap-1.5">
              <span className={`h-2 w-2 rounded-full ${lead.website ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'}`}></span>
              <span>{!lead.website ? 'High Value (No Site)' : 'Warm Conversion'}</span>
            </div>
          </div>
        </div>

        {/* Directory Fields */}
        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="truncate">{lead.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="font-mono">{lead.phone || 'No phone listed'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              {lead.website ? (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline flex items-center gap-0.5 truncate max-w-[200px]">
                  {lead.website} <ArrowUpRight className="h-2.5 w-2.5 inline" />
                </a>
              ) : (
                <span className="text-rose-450 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase tracking-wider text-[10px]">No website listed</span>
              )}
            </div>
            {lead.rating && (
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 border border-amber-500/20 rounded">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{lead.rating} ({lead.reviewsCount || 0} reviews)</span>
              </div>
            )}
          </div>
        </div>

        {/* Custom Tags Section */}
        <div>
          <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block mb-1.5">Lead Attributes (Tags)</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {lead.tags.map((tg) => (
              <span key={tg} className="inline-flex items-center gap-1 rounded bg-[#09090B] text-zinc-300 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono leading-normal">
                {tg}
                <button onClick={() => removeTag(tg)} className="hover:text-rose-405 font-bold ml-0.5 cursor-pointer text-[12px] text-zinc-500">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add tag and press Enter..."
            onKeyDown={handleTagsInput}
            className="w-full bg-[#09090B] border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-500 focus:border-zinc-700 outline-none"
          />
        </div>

        {/* Tab Sub-Selector */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`flex-1 py-2 text-center text-xs font-bold cursor-pointer border-b-2 transition-all ${
              activeSubTab === 'audit'
                ? 'border-blue-500 text-white bg-blue-500/5'
                : 'border-transparent text-zinc-500 hover:text-zinc-200'
            }`}
          >
            AI Operational Audit
          </button>
          <button
            onClick={() => setActiveSubTab('website_offer')}
            className={`flex-1 py-2 text-center text-xs font-bold cursor-pointer border-b-2 transition-all ${
              activeSubTab === 'website_offer'
                ? 'border-blue-500 text-white bg-blue-500/5'
                : 'border-transparent text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Web Selling Proposal
          </button>
          <button
            onClick={() => setActiveSubTab('outreach')}
            className={`flex-1 py-2 text-center text-xs font-bold cursor-pointer border-b-2 transition-all ${
              activeSubTab === 'outreach'
                ? 'border-blue-500 text-white bg-blue-500/5'
                : 'border-transparent text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Outreach Channels
          </button>
          <button
            onClick={() => { setActiveSubTab('bi_report'); computePriorityScore(); }}
            className={`flex-1 py-2 text-center text-xs font-bold cursor-pointer border-b-2 transition-all ${
              activeSubTab === 'bi_report'
                ? 'border-blue-500 text-white bg-blue-500/5'
                : 'border-transparent text-zinc-500 hover:text-zinc-200'
            }`}
          >
            BI Report
          </button>
          <button
            onClick={() => { setActiveSubTab('campaigns'); computePriorityScore(); }}
            className={`flex-1 py-2 text-center text-xs font-bold cursor-pointer border-b-2 transition-all ${
              activeSubTab === 'campaigns'
                ? 'border-blue-500 text-white bg-blue-500/5'
                : 'border-transparent text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Campaigns
          </button>
        </div>

        {/* Sub-tab content */}
        <div className="space-y-4 pt-1">
          {activeSubTab === 'audit' && (
            <div className="space-y-4">
              {!currentAnalysis ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0C0C0E]/50 border border-dashed border-zinc-800 rounded-xl p-5">
                  <Sparkles className="h-7 w-7 text-blue-400 animate-pulse mb-2" />
                  <h5 className="text-xs font-sans font-bold text-zinc-200 uppercase tracking-wider">Configure AI Audit Report</h5>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    Processes the business information through Gemini to extract real operational paint points, design deficits, systems gap targets, and a 1-to-100 maturity index.
                  </p>
                  <button
                    onClick={runAiAudit}
                    disabled={isAuditing}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-900/10 disabled:opacity-50"
                  >
                    {isAuditing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Analyzing Business Gaps...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Develop AI Operational Audit
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Digital Maturity */}
                  <div className="flex items-center justify-between rounded-xl bg-[#09090B] p-4 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-zinc-900 text-white border border-zinc-800">
                        <span className="text-lg font-mono font-bold leading-none">{currentAnalysis.digitalMaturityScore}</span>
                        <span className="text-[8px] font-sans text-zinc-500 font-bold uppercase tracking-wider mt-1">Index</span>
                      </div>
                      <div>
                        <span className="text-xs font-sans font-bold text-white block">Digital Maturity Score</span>
                        <span className="text-[10px] text-zinc-500">Based on site presence, contact flow efficiency</span>
                      </div>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider leading-none ${
                      currentAnalysis.presenceStrength === 'high'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : currentAnalysis.presenceStrength === 'medium'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {currentAnalysis.presenceStrength} Presence
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <FileText className="h-3.5 w-3.5 text-blue-400" /> Executive Business Abstract
                      </h5>
                      <p className="text-xs text-zinc-300 leading-relaxed bg-[#09090B] p-3.5 rounded-lg border border-zinc-800">
                        {currentAnalysis.summary}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <WebIcon type="pain" /> Operational Bottlenecks Detected
                      </h5>
                      <ul className="space-y-1.5 pl-0.5">
                        {currentAnalysis.operationalPainPoints.map((p, i) => (
                          <li key={i} className="flex gap-2 text-xs text-zinc-350 bg-[#09090B] p-2.5 border border-zinc-800 rounded-lg">
                            <span className="text-rose-400 font-bold shrink-0">✕</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <h5 className="text-[9px] font-bold text-zinc-450 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Key Systems Needed
                        </h5>
                        <div className="p-2.5 bg-[#09090B] rounded-lg border border-zinc-800 space-y-1.5">
                          {currentAnalysis.systemsNeeded.map((s, i) => (
                            <div key={i} className="text-[10px] text-zinc-300 font-medium flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="truncate">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[9px] font-bold text-[#b6b6bc] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-blue-400" /> AI Growth Leverage
                        </h5>
                        <div className="p-2.5 bg-[#09090B] rounded-lg border border-zinc-800 space-y-1.5">
                          {currentAnalysis.aiOpportunities.map((o, i) => (
                            <div key={i} className="text-[10px] text-zinc-300 font-medium flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></span>
                              <span className="truncate">{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={runWebProposal}
                      disabled={isProposing}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#09090B] hover:bg-zinc-850 text-blue-400 border border-blue-900/40 hover:border-blue-500 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer outline-none"
                    >
                      {isProposing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          Constructing Design Proposal Demos...
                        </>
                      ) : (
                        <>
                          <Layout className="h-4 w-4 text-blue-400" />
                          {currentProposal ? 'Regenerate Selling Offer' : 'Craft Custom Web Design Proposal'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'website_offer' && (
            <div className="space-y-4">
              {!currentProposal ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0C0C0E]/50 border border-dashed border-zinc-800 rounded-xl p-5">
                  <Layout className="h-7 w-7 text-blue-400 animate-pulse mb-2" />
                  <h5 className="text-xs font-sans font-bold text-zinc-200 uppercase tracking-wider">No Custom Proposal Crafted</h5>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    AI analyzes your client gaps to propose custom styling types, exact section layouts, sales hooks, and estimated cash valuation metrics.
                  </p>
                  <button
                    onClick={runWebProposal}
                    disabled={isProposing}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-900/10 disabled:opacity-50"
                  >
                    {isProposing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating Layout Draft...
                      </>
                    ) : (
                      <>
                        <Layout className="h-3.5 w-3.5" />
                        Build Web Proposal
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <span className="text-[10px] text-zinc-450 uppercase tracking-widest font-bold">Recommended Layout</span>
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {currentProposal.suggestedType.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 bg-[#0C0C0E]/50 border border-zinc-800 rounded-lg">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Need Reason</span>
                        <p className="text-[10.5px] text-zinc-350 font-medium mt-1 leading-snug">{currentProposal.needDetectedReason}</p>
                      </div>
                      <div className="p-3 bg-[#0C0C0E]/50 border border-zinc-800 rounded-lg">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Estimated Monthly Impact</span>
                        <p className="text-[11px] text-emerald-400 font-bold mt-1 text-md">{currentProposal.estimatedValue}</p>
                      </div>
                    </div>
                  </div>

                  {/* Wireframe Suggestion */}
                  <div>
                    <h5 className="text-[10px] font-bold text-zinc-455 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Layout className="h-3.5 w-3.5 text-blue-400" /> Suggested Website Wireframe Sections
                    </h5>
                    <div className="space-y-2">
                      {currentProposal.structure.map((sec, idx) => (
                        <div key={idx} className="flex gap-3 bg-[#09090B]/30 border border-zinc-800 p-3.5 rounded-lg hover:border-zinc-700 hover:bg-[#09090B]/60 transition-all duration-155">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-bold text-zinc-400 border border-zinc-800 font-mono">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block leading-none mb-1">{sec.sectionName}</span>
                            <span className="text-[10px] text-zinc-400 block pb-1">{sec.purpose}</span>
                            <span className="text-[10px] text-blue-300 font-semibold leading-normal block italic bg-[#0C0C0E]/45 p-1.5 rounded mt-1 border border-zinc-800/60">
                             💡 CONTENT: {sec.contentHint}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Copy blocks */}
                  <div className="rounded-xl border border-zinc-800 p-4 space-y-3 bg-[#09090B]/30">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold block">Interactive Sales Copywriting</span>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-medium">Suggested Hero Headline</span>
                      <p className="text-xs text-zinc-200 mt-1 font-bold leading-relaxed italic">"{currentProposal.heroHeadline}"</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-medium">Suggested CTA Button Label</span>
                      <div className="text-xs text-white mt-1.5 bg-blue-600 font-bold px-3.5 py-1.5 rounded-md w-fit">
                        {currentProposal.selectedCta}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-blue-950/15 to-zinc-950 border border-blue-900/30 p-4 relative overflow-hidden">
                    <div className="relative z-10">
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-blue-450" /> Copiable Value Ready-To-Sell Pitch
                      </h5>
                      <p className="text-[11px] text-zinc-300 italic mt-2 leading-relaxed bg-[#09090B] p-3 rounded-md border border-zinc-800">
                        "{currentProposal.readyToSellOffer}"
                      </p>
                      <button
                        onClick={() => handleCopy(currentProposal.readyToSellOffer, 'pitch')}
                        className="mt-3 flex items-center gap-1.5 rounded bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-[10px] px-3.5 py-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                      >
                        {copiedText['pitch'] ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {copiedText['pitch'] ? 'Copied Pitch!' : 'Copy Closing Offer'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'outreach' && (
            <div className="space-y-4">
              {/* Outreach History Timeline */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B]/50 p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-blue-400" /> Outreach Activity Log
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">{lead.outreachHistory.length} entries</span>
                </div>
                {lead.outreachHistory.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 italic py-2 text-center">No outreach logged yet. Copy pitch and record interactions below.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {lead.outreachHistory.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 bg-[#0C0C0E] p-2 rounded-lg border border-zinc-800">
                        <span className="text-xs mt-0.5">
                          {entry.channel === 'whatsapp' ? '💬' : entry.channel === 'email' ? '📧' : entry.channel === 'linkedin_dm' ? '💼' : entry.channel === 'physical_visit' ? '🚶' : '📞'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{entry.channel.replace('_', ' ')}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-px rounded-full ${
                              entry.status === 'sent' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              entry.status === 'replied' || entry.status === 'interested' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              entry.status === 'no_response' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>{entry.status.replace('_', ' ')}</span>
                          </div>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{new Date(entry.sentAt).toLocaleDateString()} {entry.notes && `— ${entry.notes}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Quick Add Outreach Entry */}
                <div className="mt-2 pt-2 border-t border-zinc-800">
                  <OutreachQuickEntry lead={lead} onUpdate={onUpdateLead} />
                </div>
              </div>

              {!currentPitch ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0C0C0E]/50 border border-dashed border-zinc-800 rounded-xl p-5">
                  <Send className="h-7 w-7 text-blue-400 animate-pulse mb-2" />
                  <h5 className="text-xs font-sans font-bold text-zinc-200 uppercase tracking-wider">Outreach Copywriter Offline</h5>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    AI automatically writes personalized, human and localized pitches formatted correctly for Email, LinkedIn message, or WhatsApp direct.
                  </p>
                  <button
                    onClick={runWebProposal}
                    disabled={isProposing}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 px-4 py-2 text-xs font-bold cursor-pointer shadow"
                  >
                    Set Up Proposal & Pitch
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Email Channel */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-sans font-bold text-white flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-blue-400" /> High-Rep Email Framework
                      </span>
                      <button
                        onClick={() => handleCopy(currentPitch.email, 'email')}
                        className="text-[10px] text-zinc-400 hover:text-blue-400 flex items-center gap-1 bg-[#09090B] px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
                      >
                        {copiedText['email'] ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                        {copiedText['email'] ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="w-full bg-[#09090B] p-3.5 border border-zinc-800 rounded-xl text-[10px] text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[160px] overflow-y-auto">
                      {currentPitch.email}
                    </pre>
                  </div>

                  {/* WhatsApp Channel */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-sans font-bold text-white flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> Conversational WhatsApp Intro
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* Send via WhatsApp API button */}
                        <button
                          onClick={() => sendWhatsAppMessage(currentPitch.whatsapp, 'whatsapp')}
                          disabled={whatsappSending['whatsapp'] === 'sending'}
                          className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded border cursor-pointer transition-all ${
                            whatsappSending['whatsapp'] === 'sent' || whatsappSending['whatsapp'] === 'delivered' || whatsappSending['whatsapp'] === 'read'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : whatsappSending['whatsapp'] === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : whatsappSending['whatsapp'] === 'sending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {whatsappSending['whatsapp'] === 'sending' ? (
                            <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Sending...</>
                          ) : whatsappSending['whatsapp'] === 'sent' ? (
                            <><Send className="h-2.5 w-2.5" /> Sent ✓</>
                          ) : whatsappSending['whatsapp'] === 'delivered' ? (
                            <><Check className="h-2.5 w-2.5" /> Delivered ✓✓</>
                          ) : whatsappSending['whatsapp'] === 'read' ? (
                            <><Check className="h-2.5 w-2.5" /> Read ✓✓</>
                          ) : whatsappSending['whatsapp'] === 'failed' ? (
                            <><AlertCircle className="h-2.5 w-2.5" /> Failed</>
                          ) : (
                            <><Send className="h-2.5 w-2.5" /> Send</>
                          )}
                        </button>
                        {/* Copy to clipboard button */}
                        <button
                          onClick={() => handleCopy(currentPitch.whatsapp, 'whatsapp')}
                          className="text-[10px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 bg-[#09090B] px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
                        >
                          {copiedText['whatsapp'] ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                          {copiedText['whatsapp'] ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <pre className="w-full bg-[#09090B] p-3.5 border border-zinc-800 rounded-xl text-[10.5px] text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {currentPitch.whatsapp}
                    </pre>
                    {/* Delivery status indicator */}
                    {whatsappSending['whatsapp'] === 'sent' && (
                      <div className="flex items-center gap-1.5 text-[9px] text-amber-400 animate-pulse">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Waiting for delivery confirmation...
                      </div>
                    )}
                    {whatsappSending['whatsapp'] === 'delivered' && (
                      <div className="flex items-center gap-1.5 text-[9px] text-emerald-400">
                        <Check className="h-2.5 w-2.5" />
                        Message delivered to recipient
                      </div>
                    )}
                    {whatsappSending['whatsapp'] === 'read' && (
                      <div className="flex items-center gap-1.5 text-[9px] text-blue-400">
                        <Check className="h-2.5 w-2.5" />
                        Message read by recipient
                      </div>
                    )}
                    {whatsappSending['whatsapp'] === 'failed' && (
                      <div className="flex items-center gap-1.5 text-[9px] text-rose-400">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Delivery failed. Copy the message and send manually.
                      </div>
                    )}
                    {!whatsappConfigured && (
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 italic">
                        <AlertCircle className="h-2.5 w-2.5" />
                        WhatsApp API not configured. Copy to send manually. Set WHATSAPP_PHONE_NUMBER_ID & WHATSAPP_ACCESS_TOKEN in .env
                      </div>
                    )}
                  </div>

                  {/* LinkedIn message */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-sans font-bold text-white flex items-center gap-1.5">
                        <Linkedin className="h-3.5 w-3.5 text-blue-400" /> LinkedIn B2B Network Connection
                      </span>
                      <button
                        onClick={() => handleCopy(currentPitch.linkedin, 'linkedin')}
                        className="text-[10px] text-zinc-400 hover:text-blue-400 flex items-center gap-1 bg-[#09090B] px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
                      >
                        {copiedText['linkedin'] ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                        {copiedText['linkedin'] ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="w-full bg-[#09090B] p-3.5 border border-zinc-800 rounded-xl text-[10.5px] text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {currentPitch.linkedin}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'bi_report' && (
            <div className="space-y-4">
              {/* Priority Score Gauge — always shown */}
              {priorityScore && <PriorityScoreGauge score={priorityScore} />}

              {!lead.biReport ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0C0C0E]/50 border border-dashed border-zinc-800 rounded-xl p-5">
                  <BarChart3 className="h-7 w-7 text-blue-400 animate-pulse mb-2" />
                  <h5 className="text-xs font-sans font-bold text-zinc-200 uppercase tracking-wider">Business Intelligence Report</h5>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    Generate an AI-powered business intelligence report with competitive insights, digital health scoring, and value upside estimation.
                  </p>
                  <button
                    onClick={async () => {
                      setIsAuditing(true);
                      computePriorityScore();
                      try {
                        // Fetch both score breakdown and BI report in parallel
                        const [scoreResp, biResp] = await Promise.all([
                          fetch('/api/leads/score', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lead }),
                          }),
                          fetch('/api/leads/bi-report', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lead }),
                          }),
                        ]);
                        if (scoreResp.ok && biResp.ok) {
                          const [scoreData, biData] = await Promise.all([
                            scoreResp.json(),
                            biResp.json(),
                          ]);
                          const updatedLead: Lead = {
                            ...lead,
                            scoreBreakdown: scoreData.scoreBreakdown,
                            biReport: biData.report,
                          };
                          await updateDbLead(updatedLead);
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsAuditing(false);
                      }
                    }}
                    disabled={isAuditing}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-900/10 disabled:opacity-50"
                  >
                    {isAuditing ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Report...</>
                    ) : (
                      <><BarChart3 className="h-3.5 w-3.5" /> Generate BI Report</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Score Breakdown */}
                  {lead.scoreBreakdown && (
                    <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Target className="h-3 w-3 text-blue-400" /> Lead Score Breakdown
                      </span>
                      <div className="space-y-2">
                        {[
                          { label: 'Website Gap', score: lead.scoreBreakdown.hasWebsite, max: 25, color: 'bg-rose-500' },
                          { label: 'Digital Presence', score: lead.scoreBreakdown.digitalPresence, max: 20, color: 'bg-amber-500' },
                          { label: 'Review Quality', score: lead.scoreBreakdown.reviewQuality, max: 20, color: 'bg-blue-500' },
                          { label: 'Booking Potential', score: lead.scoreBreakdown.bookingPotential, max: 20, color: 'bg-purple-500' },
                          { label: 'Brand Gap', score: lead.scoreBreakdown.brandGap, max: 15, color: 'bg-emerald-500' },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-[10px] mb-0.5">
                              <span className="text-zinc-400">{item.label}</span>
                              <span className="text-zinc-300 font-bold">{item.score}/{item.max}</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${(item.score / item.max) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Total Score</span>
                        <span className="text-sm font-mono font-bold text-white">{lead.scoreBreakdown.total}/100</span>
                      </div>
                    </div>
                  )}

                  {/* BI Report Content */}
                  <div className="rounded-xl border border-zinc-800 bg-[#09090B]/30 p-4 space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="h-3 w-3 text-blue-400" /> Business Intelligence Summary
                    </span>
                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-[#0C0C0E] rounded-lg border border-zinc-800">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Overview</span>
                        <p className="text-[10.5px] text-zinc-300 mt-0.5 leading-relaxed">{lead.biReport.businessOverview}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-[#0C0C0E] rounded-lg border border-zinc-800">
                          <span className="text-[9px] text-zinc-500 uppercase font-bold">Digital Health</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`h-2 w-2 rounded-full ${lead.biReport.digitalHealthScore >= 60 ? 'bg-emerald-500' : lead.biReport.digitalHealthScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                            <span className="text-xs font-bold text-white">{lead.biReport.digitalHealthScore}/100</span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-[#0C0C0E] rounded-lg border border-zinc-800">
                          <span className="text-[9px] text-zinc-500 uppercase font-bold">Value Upside</span>
                          <p className="text-xs font-bold text-emerald-400 mt-0.5">{lead.biReport.estimatedValueUpside}</p>
                        </div>
                      </div>
                      <div className="p-2.5 bg-blue-950/20 rounded-lg border border-blue-900/30">
                        <span className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">Top Opportunity</span>
                        <p className="text-[10.5px] text-blue-300 mt-0.5 leading-relaxed">{lead.biReport.topOpportunity}</p>
                      </div>
                      <div className="p-2.5 bg-[#0C0C0E] rounded-lg border border-zinc-800">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Recommended Action</span>
                        <p className="text-[10.5px] text-zinc-300 mt-0.5">{lead.biReport.recommendedAction}</p>
                      </div>
                      <div className="p-2.5 bg-[#0C0C0E] rounded-lg border border-zinc-800">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Competitive Insight</span>
                        <p className="text-[10.5px] text-zinc-300 mt-0.5 italic">{lead.biReport.competitiveInsight}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Campaign Sequence Tab */}
          {activeSubTab === 'campaigns' && (
            <div className="space-y-4">
              {/* Priority Score always visible */}
              {priorityScore && <PriorityScoreGauge score={priorityScore} />}
              
              {/* Analytics Toggle */}
              <button
                onClick={() => setShowCampaignAnalytics(!showCampaignAnalytics)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-[#09090B]/50 hover:bg-[#09090B] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors uppercase tracking-widest">
                    Campaign Analytics
                  </span>
                  <span className="text-[9px] text-zinc-600 font-mono">{leadCampaigns.length} campaigns</span>
                </div>
                <motion.span
                  animate={{ rotate: showCampaignAnalytics ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                </motion.span>
              </button>

              <AnimatePresence>
                {showCampaignAnalytics && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <CampaignAnalyticsDashboard campaigns={leadCampaigns} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-xl border border-zinc-800 bg-[#09090B]/30 p-3.5">
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="h-3.5 w-3.5 text-blue-400" />
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Multi-Channel Outreach Campaigns
                  </h4>
                </div>
                <CampaignSequence
                  campaigns={leadCampaigns}
                  onUpdateCampaign={(updated) => {
                    setLeadCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
                  }}
                  onDeleteCampaign={(id) => {
                    setLeadCampaigns(prev => prev.filter(c => c.id !== id));
                  }}
                  onCreateCampaign={(newCampaign) => {
                    setLeadCampaigns(prev => [...prev, newCampaign]);
                  }}
                  assignedLeadIds={[lead.id]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes Area */}
        <div className="pt-2 border-t border-zinc-800">
          <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block mb-1">Internal Pipeline CRM Notes</label>
          <textarea
            value={lead.notes || ''}
            onChange={handleNotesChange}
            onBlur={handleNotesBlur}
            placeholder="Log conversation history or update tags/tasks here (saved on focus out)..."
            rows={3}
            className="w-full bg-[#09090B] border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 placeholder-zinc-500 focus:border-zinc-700 outline-none"
          />
        </div>

      </div>

      {/* Drawer Footer controls */}
      <div className="border-t border-zinc-800 bg-[#09090B]/50 px-5 py-3.5 flex items-center justify-between">
        {onDeleteLead ? (
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg border border-red-950 text-red-400 hover:bg-rose-950/20 text-xs font-bold cursor-pointer"
          >
            DELETE LEAD
          </button>
        ) : <div />}
        <button
          onClick={onClose}
          className="rounded px-4 py-1.5 text-xs font-bold cursor-pointer bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 transition-colors border border-zinc-750"
        >
          FINISHED AUDITING
        </button>
      </div>

      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        title="Delete Lead"
        message={`Are you sure you want to permanently delete "${lead.name}"? This action will remove their details and active status from the CRM pipeline setup.`}
        confirmText="Delete Lead"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={() => {
          if (onDeleteLead) {
            onDeleteLead(lead.id);
          }
          setIsDeleteModalOpen(false);
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}

// Sub components
function WebIcon({ type }: { type: string }) {
  if (type === 'pain') {
    return <ShieldAlert className="h-3.5 w-3.5 text-rose-400 inline" />;
  }
  return null;
}

// Outreach Quick Entry Sub-Component
function OutreachQuickEntry({ lead, onUpdate }: { lead: Lead; onUpdate: (l: Lead) => void }) {
  const [channel, setChannel] = useState<OutreachChannel>('whatsapp');
  const [status, setStatus] = useState<OutreachStatus>('sent');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const handleAddEntry = async () => {
    const entry: OutreachEntry = {
      id: `outreach-${Date.now()}`,
      channel,
      status,
      sentAt: new Date().toISOString(),
      notes: notes.trim(),
      followUpDate: followUpDate || null,
      respondedAt: null,
    };
    const updated: Lead = {
      ...lead,
      outreachHistory: [...(lead.outreachHistory || []), entry],
    };
    // Persist locally first
    onUpdate(updated);
    // Persist to backend
    try {
      await fetch('/api/leads/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, entry }),
      });
    } catch (err) {
      console.error('Failed to persist outreach entry to backend:', err);
    }
    setNotes('');
    setFollowUpDate('');
    setStatus('sent');
  };

  return (
    <div className="space-y-2">
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Log New Activity</span>
      <div className="flex flex-wrap gap-1.5">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as OutreachChannel)}
          className="flex-1 min-w-[100px] bg-[#0C0C0E] border border-zinc-800 text-zinc-300 text-[10px] rounded p-1.5 outline-none cursor-pointer"
        >
          <option value="whatsapp">💬 WhatsApp</option>
          <option value="email">📧 Email</option>
          <option value="linkedin_dm">💼 LinkedIn DM</option>
          <option value="physical_visit">🚶 Physical Visit</option>
          <option value="phone_call">📞 Phone Call</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OutreachStatus)}
          className="flex-1 min-w-[80px] bg-[#0C0C0E] border border-zinc-800 text-zinc-300 text-[10px] rounded p-1.5 outline-none cursor-pointer"
        >
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="replied">Replied</option>
          <option value="no_response">No Response</option>
          <option value="interested">Interested</option>
          <option value="not_interested">Not Interested</option>
        </select>
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          className="flex-1 bg-[#0C0C0E] border border-zinc-800 text-zinc-300 text-[10px] rounded p-1.5 outline-none placeholder-zinc-600"
        />
        <input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          className="w-[120px] bg-[#0C0C0E] border border-zinc-800 text-zinc-300 text-[10px] rounded p-1.5 outline-none"
        />
      </div>
      <button
        onClick={handleAddEntry}
        className="w-full text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1"
      >
        <Clock className="h-3 w-3" />
        Log Entry
      </button>
    </div>
  );
}
