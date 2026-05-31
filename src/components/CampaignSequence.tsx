import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';

// Fallback for crypto.randomUUID() for non-HTTPS environments
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
};
import {
  Plus, Trash2, GripVertical, MessageSquare, Mail, Linkedin,
  PhoneCall, Send, Clock, Calendar, Settings, CheckCircle2,
  AlertCircle, Zap, Target, Users, Play, Pause, ChevronDown,
  ChevronUp, Copy, BarChart3, Sparkles
} from 'lucide-react';
import { Campaign, CampaignStep, OutreachChannel } from '../types';

// ─── Channel Config ───

const CHANNEL_CONFIG: Record<OutreachChannel, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: { 
    label: 'WhatsApp', 
    icon: <MessageSquare className="h-3.5 w-3.5" />, 
    color: '#25D366' 
  },
  email: { 
    label: 'Email', 
    icon: <Mail className="h-3.5 w-3.5" />, 
    color: '#3B82F6' 
  },
  linkedin_dm: { 
    label: 'LinkedIn DM', 
    icon: <Linkedin className="h-3.5 w-3.5" />, 
    color: '#0A66C2' 
  },
  phone_call: { 
    label: 'Phone Call', 
    icon: <PhoneCall className="h-3.5 w-3.5" />, 
    color: '#8B5CF6' 
  },
  physical_visit: { 
    label: 'Physical Visit', 
    icon: <Send className="h-3.5 w-3.5" />, 
    color: '#F59E0B' 
  },
};

// ─── Step Editor ───

interface StepEditorProps {
  step: CampaignStep;
  index: number;
  onChange: (step: CampaignStep) => void;
  onDelete: () => void;
  isFirst: boolean;
}

function StepEditor({ step, index, onChange, onDelete, isFirst }: StepEditorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      {/* Timeline connector */}
      {!isFirst && (
        <div className="absolute -top-4 left-5 w-px h-4 bg-gradient-to-b from-zinc-700 to-zinc-800" />
      )}

      <div className="flex items-start gap-3 p-3 rounded-xl bg-[#09090B] border border-zinc-800 group hover:border-zinc-700 transition-all">
        {/* Drag handle + step number */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <div className="text-[9px] font-bold font-mono text-zinc-500 bg-zinc-900 w-5 h-5 rounded flex items-center justify-center border border-zinc-800">
            {index + 1}
          </div>
          <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100">
            <GripVertical className="h-3 w-3" />
          </div>
        </div>

        <div className="flex-1 space-y-2.5 min-w-0">
          {/* Channel selector + delay */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                Channel
              </label>
              <select
                value={step.channel}
                onChange={(e) => onChange({ ...step, channel: e.target.value as OutreachChannel })}
                className="w-full bg-[#0C0C0E] border border-zinc-800 text-zinc-200 text-[10px] rounded-lg p-2 outline-none focus:border-blue-500 cursor-pointer"
              >
                {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                Delay After Previous
              </label>
              <div className="relative">
                <Clock className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={step.delayDays}
                  onChange={(e) => onChange({ ...step, delayDays: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0C0C0E] border border-zinc-800 text-zinc-200 text-[10px] rounded-lg p-2 pl-7 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Subject / Label */}
          <div>
            <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
              Subject / Label
            </label>
            <input
              type="text"
              value={step.subject}
              onChange={(e) => onChange({ ...step, subject: e.target.value })}
              placeholder="e.g. Initial Introduction, Follow-up, Final Offer..."
              className="w-full bg-[#0C0C0E] border border-zinc-800 text-zinc-200 text-[10px] rounded-lg p-2 outline-none focus:border-blue-500 placeholder-zinc-600"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
              Message Template
            </label>
            <textarea
              value={step.message}
              onChange={(e) => onChange({ ...step, message: e.target.value })}
              placeholder="Write your message template... Use {{name}}, {{business}} for personalization"
              rows={2}
              className="w-full bg-[#0C0C0E] border border-zinc-800 text-zinc-200 text-[10px] rounded-lg p-2 outline-none focus:border-blue-500 placeholder-zinc-600 resize-none"
            />
          </div>

          {/* Conditions */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={step.conditions?.skipIfReplied ?? true}
                onChange={(e) => onChange({
                  ...step,
                  conditions: { ...step.conditions, skipIfReplied: e.target.checked }
                })}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 accent-blue-500"
              />
              <span className="text-[9px] text-zinc-400 font-medium">Skip if replied</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={step.conditions?.skipIfInterested ?? true}
                onChange={(e) => onChange({
                  ...step,
                  conditions: { ...step.conditions, skipIfInterested: e.target.checked }
                })}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 accent-blue-500"
              />
              <span className="text-[9px] text-zinc-400 font-medium">Skip if interested</span>
            </label>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Campaign Card ───

interface CampaignCardProps {
  campaign: Campaign;
  onUpdate: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  isExpanded?: boolean;
}

function CampaignCard({ campaign, onUpdate, onDelete, isExpanded: defaultExpanded }: CampaignCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(campaign.name);

  const totalDuration = campaign.steps.reduce((sum, s) => sum + s.delayDays, 0);

  const handleAddStep = () => {
    const newStep: CampaignStep = {        id: `step-${generateId()}`,
      channel: 'whatsapp',
      delayDays: 3,
      subject: 'Follow-up',
      message: '',
      conditions: { skipIfReplied: true, skipIfInterested: true },
    };
    onUpdate({ ...campaign, steps: [...campaign.steps, newStep] });
  };

  const handleStepChange = (index: number, updated: CampaignStep) => {
    const newSteps = [...campaign.steps];
    newSteps[index] = updated;
    onUpdate({ ...campaign, steps: newSteps });
  };

  const handleDeleteStep = (index: number) => {
    const newSteps = campaign.steps.filter((_, i) => i !== index);
    onUpdate({ ...campaign, steps: newSteps });
  };

  const handleReorder = (reordered: CampaignStep[]) => {
    onUpdate({ ...campaign, steps: reordered });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden"
    >
      {/* Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-zinc-800/60">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`h-2 w-2 rounded-full ${campaign.isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => {
                onUpdate({ ...campaign, name: nameInput });
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdate({ ...campaign, name: nameInput });
                  setEditingName(false);
                }
              }}
              className="bg-[#09090B] border border-zinc-700 text-xs text-white rounded px-2 py-0.5 font-bold outline-none focus:border-blue-500"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-xs font-bold text-white hover:text-blue-400 transition-colors truncate cursor-pointer"
            >
              {campaign.name}
            </button>
          )}
          <span className="text-[9px] text-zinc-500 font-mono shrink-0">
            {campaign.steps.length} steps · {totalDuration}d total
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle active */}
          <button
            onClick={() => onUpdate({ ...campaign, isActive: !campaign.isActive })}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              campaign.isActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title={campaign.isActive ? 'Pause Campaign' : 'Activate Campaign'}
          >
            {campaign.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>

          {/* Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(campaign.id)}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Stats row (collapsed view) */}
      {!isExpanded && campaign.stats && (
        <div className="px-3.5 py-2 flex items-center gap-4 text-[9px] text-zinc-500">
          <span>📤 Sent: {campaign.stats.sent}</span>
          <span>✅ Delivered: {campaign.stats.delivered}</span>
          <span>💬 Replied: {campaign.stats.replied}</span>
          <span>🎯 Converted: {campaign.stats.converted}</span>
        </div>
      )}

      {/* Expanded steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-3.5 space-y-2.5">
              {/* Steps timeline */}
              <Reorder.Group
                axis="y"
                values={campaign.steps}
                onReorder={handleReorder}
                className="space-y-2.5"
              >
                {campaign.steps.map((step, index) => (
                  <Reorder.Item key={step.id} value={step}>
                    <StepEditor
                      step={step}
                      index={index}
                      onChange={(s) => handleStepChange(index, s)}
                      onDelete={() => handleDeleteStep(index)}
                      isFirst={index === 0}
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Add Step */}
              <button
                onClick={handleAddStep}
                className="w-full flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 text-[10px] font-bold transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Campaign Step
              </button>

              {/* Stats */}
              {campaign.stats && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="p-2 rounded-lg bg-[#09090B] border border-zinc-800 text-center">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Sent</p>
                    <p className="text-xs font-bold text-white">{campaign.stats.sent}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#09090B] border border-zinc-800 text-center">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Delivered</p>
                    <p className="text-xs font-bold text-white">{campaign.stats.delivered}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#09090B] border border-zinc-800 text-center">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Replied</p>
                    <p className="text-xs font-bold text-white">{campaign.stats.replied}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#09090B] border border-zinc-800 text-center">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Converted</p>
                    <p className="text-xs font-bold text-white">{campaign.stats.converted}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Campaign Manager (Main Component) ───

interface CampaignSequenceProps {
  campaigns: Campaign[];
  onUpdateCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (id: string) => void;
  onCreateCampaign: (campaign: Campaign) => void;
  assignedLeadIds?: string[];
}

export default function CampaignSequence({
  campaigns,
  onUpdateCampaign,
  onDeleteCampaign,
  onCreateCampaign,
  assignedLeadIds,
}: CampaignSequenceProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const campaign: Campaign = {
      id: `campaign-${generateId()}`,
      name: newName.trim(),
      description: newDescription.trim(),
      steps: [{
        id: `step-${generateId()}`,
        channel: 'whatsapp',
        delayDays: 0,
        subject: 'Initial Outreach',
        message: '',
        conditions: { skipIfReplied: false, skipIfInterested: false },
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      assignedLeadIds: assignedLeadIds || [],
      stats: { sent: 0, delivered: 0, replied: 0, converted: 0 },
    };
    onCreateCampaign(campaign);
    setNewName('');
    setNewDescription('');
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-3.5">
      {/* Header metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-950/30 to-zinc-950 border border-blue-900/30">
          <p className="text-[8px] sm:text-[9px] text-blue-400 uppercase tracking-widest font-bold">Total Campaigns</p>
          <p className="text-base sm:text-lg font-bold text-white mt-0.5 sm:mt-1">{campaigns.length}</p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-[#09090B] border border-zinc-800">
          <p className="text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Total Steps</p>
          <p className="text-base sm:text-lg font-bold text-white mt-0.5 sm:mt-1">
            {campaigns.reduce((sum, c) => sum + c.steps.length, 0)}
          </p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-[#09090B] border border-zinc-800">
          <p className="text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Active</p>
          <p className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 sm:mt-1">
            {campaigns.filter(c => c.isActive).length}
          </p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-[#09090B] border border-zinc-800">
          <p className="text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Assigned Leads</p>
          <p className="text-base sm:text-lg font-bold text-white mt-0.5 sm:mt-1">
            {campaigns.reduce((sum, c) => sum + c.assignedLeadIds.length, 0)}
          </p>
        </div>
      </div>

      {/* Campaign list */}
      <div className="space-y-2.5">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            onUpdate={onUpdateCampaign}
            onDelete={onDeleteCampaign}
          />
        ))}

        {campaigns.length === 0 && !showCreateForm && (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-[#0C0C0E]/50 border border-dashed border-zinc-800 rounded-xl px-5">
            <Target className="h-8 w-8 text-zinc-700 mb-2" />
            <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">No Campaigns Yet</h5>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
              Create multi-channel outreach sequences. Schedule WhatsApp, Email, LinkedIn, and more — all in one campaign.
            </p>
          </div>
        )}

        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 space-y-3"
          >
            <h4 className="text-xs font-bold text-white">Create New Campaign</h4>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Campaign Name (e.g. Q4 Real Estate Outreach)"
              className="w-full bg-[#09090B] border border-zinc-800 text-zinc-200 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 placeholder-zinc-600"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full bg-[#09090B] border border-zinc-800 text-zinc-200 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 placeholder-zinc-600"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                Create Campaign
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Campaign Button */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 text-[10px] font-bold transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Multi-Channel Campaign
        </button>
      )}
    </div>
  );
}
