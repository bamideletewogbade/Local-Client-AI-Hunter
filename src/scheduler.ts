/**
 * AI Client Hunter — Automated Follow-Up Scheduler
 *
 * Lightweight, persistent job scheduler designed for multi-lead WhatsApp
 * outreach and follow-up automation. Jobs are persisted to disk so they
 * survive server restarts.
 *
 * Architecture:
 *   - In-memory job queue (loaded from disk on startup)
 *   - Interval-based worker checks every 30s for due jobs
 *   - Due jobs are delegated to the WhatsApp Business API
 *   - Agentic hooks allow Bishop to create/manage jobs
 *
 * Job Lifecycle:
 *   pending → executing → completed / failed / cancelled
 */

import fs from 'fs';
import path from 'path';
import { sendTextMessage, isWhatsAppConfigured } from './whatsapp.js';
import type { Lead } from './types.js';

// ─── Types ───

export type FollowUpType = 'whatsapp_followup' | 'whatsapp_reengagement' | 'whatsapp_reminder';
export type FollowUpStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

export interface FollowUpJob {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  type: FollowUpType;
  status: FollowUpStatus;
  scheduledAt: string;       // ISO timestamp of when to execute
  createdAt: string;
  message: string;           // The message to send
  attemptNumber: number;     // Which follow-up attempt this is
  maxAttempts: number;       // Max retries if send fails
  result?: {
    messageId?: string;
    status?: string;
    sentAt?: string;
    error?: string;
  };
  metadata?: Record<string, any>;
}

// ─── Scheduler ───

const SCHEDULER_DB_FILE = path.join(process.cwd(), 'scheduler_jobs.json');
const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds
const MAX_RETRIES = 3;

// Broadcast function to be injected by server.ts for real-time UI updates
type BroadcastFn = (data: any) => void;
let broadcastFn: BroadcastFn | null = null;

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastFn = fn;
}

class Scheduler {
  private jobs: FollowUpJob[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private counter = 0;

  constructor() {
    this.loadFromDisk();
  }

  // ─── Persistence ───

  private get dbPath(): string {
    return SCHEDULER_DB_FILE;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        this.jobs = JSON.parse(raw);
        console.log(`[Scheduler] Loaded ${this.jobs.length} jobs from disk`);
      }
    } catch (err) {
      console.error('[Scheduler] Failed to load jobs from disk:', err);
      this.jobs = [];
    }
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.jobs, null, 2));
    } catch (err) {
      console.error('[Scheduler] Failed to persist jobs:', err);
    }
  }

  // ─── CRUD ───

  /**
   * Create a new follow-up job.
   */
  createJob(params: {
    leadId: string;
    leadName: string;
    leadPhone: string;
    type?: FollowUpType;
    message: string;
    scheduledAt: string;
    attemptNumber?: number;
    maxAttempts?: number;
    metadata?: Record<string, any>;
  }): FollowUpJob {
    const job: FollowUpJob = {
      id: `fj-${++this.counter}-${Date.now()}`,
      leadId: params.leadId,
      leadName: params.leadName,
      leadPhone: params.leadPhone,
      type: params.type || 'whatsapp_followup',
      status: 'pending',
      scheduledAt: params.scheduledAt,
      createdAt: new Date().toISOString(),
      message: params.message,
      attemptNumber: params.attemptNumber || 1,
      maxAttempts: params.maxAttempts || MAX_RETRIES,
      metadata: params.metadata,
    };

    this.jobs.push(job);
    this.saveToDisk();
    this.broadcastUpdate(job);

    console.log(`[Scheduler] Created job ${job.id}: ${params.leadName} — ${new Date(params.scheduledAt).toLocaleString()}`);
    return job;
  }

  /**
   * Cancel a pending job.
   */
  cancelJob(jobId: string): FollowUpJob | null {
    const idx = this.jobs.findIndex(j => j.id === jobId);
    if (idx === -1) return null;

    const job = this.jobs[idx];
    if (job.status !== 'pending') {
      return null; // Can only cancel pending jobs
    }

    job.status = 'cancelled';
    this.jobs[idx] = job;
    this.saveToDisk();
    this.broadcastUpdate(job);

    return job;
  }

  /**
   * Get all jobs, optionally filtered by status.
   */
  getJobs(status?: FollowUpStatus): FollowUpJob[] {
    if (status) {
      return this.jobs.filter(j => j.status === status);
    }
    return [...this.jobs];
  }

  /**
   * Get jobs for a specific lead.
   */
  getJobsForLead(leadId: string): FollowUpJob[] {
    return this.jobs
      .filter(j => j.leadId === leadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ─── Worker ───

  /**
   * Start the scheduler worker. Checks for due jobs every N seconds.
   */
  start(): void {
    if (this.interval) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log(`[Scheduler] Starting — checking every ${CHECK_INTERVAL_MS / 1000}s`);
    this.interval = setInterval(() => this.tick(), CHECK_INTERVAL_MS);

    // Also do an immediate tick
    setTimeout(() => this.tick(), 1000);
  }

  /**
   * Stop the scheduler worker.
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[Scheduler] Stopped');
    }
  }

  /**
   * Check for and execute due jobs.
   */
  private async tick(): Promise<void> {
    const now = new Date().toISOString();
    const dueJobs = this.jobs.filter(
      j => j.status === 'pending' && j.scheduledAt <= now
    );

    if (dueJobs.length === 0) return;

    console.log(`[Scheduler] Tick — ${dueJobs.length} due job(s)`);

    for (const job of dueJobs) {
      await this.executeJob(job);
    }
  }

  /**
   * Execute a single job by sending the WhatsApp message.
   */
  private async executeJob(job: FollowUpJob): Promise<void> {
    // Mark as executing
    job.status = 'executing';
    this.saveToDisk();
    this.broadcastUpdate(job);

    try {
      if (!isWhatsAppConfigured()) {
        console.warn(`[Scheduler] WhatsApp not configured — skipping job ${job.id}`);
        job.status = 'failed';
        job.result = {
          error: 'WhatsApp API not configured',
          sentAt: new Date().toISOString(),
        };
        this.saveToDisk();
        this.broadcastUpdate(job);
        return;
      }

      console.log(`[Scheduler] Executing job ${job.id}: WhatsApp to ${job.leadName} (${job.leadPhone})`);

      const result = await sendTextMessage(job.leadPhone, job.message);

      if (!result) {
        throw new Error('sendTextMessage returned null');
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'WhatsApp send failed');
      }

      // Success
      job.status = 'completed';
      job.result = {
        messageId: result.messageId,
        status: result.status,
        sentAt: result.timestamp,
      };

      console.log(`[Scheduler] Job ${job.id} completed — Message ID: ${result.messageId}`);
    } catch (err: any) {
      console.error(`[Scheduler] Job ${job.id} failed:`, err.message);

      if (job.attemptNumber < job.maxAttempts) {
        // Retry: reschedule for 30 minutes later with incremented attempt
        job.status = 'pending';
        job.attemptNumber++;
        job.scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        job.result = {
          error: `Attempt ${job.attemptNumber - 1} failed: ${err.message}. Retrying at ${new Date(job.scheduledAt).toLocaleString()}`,
          sentAt: new Date().toISOString(),
        };
        console.log(`[Scheduler] Job ${job.id} rescheduled to ${new Date(job.scheduledAt).toLocaleString()} (attempt ${job.attemptNumber}/${job.maxAttempts})`);
      } else {
        job.status = 'failed';
        job.result = {
          error: `Failed after ${job.maxAttempts} attempts. Last error: ${err.message}`,
          sentAt: new Date().toISOString(),
        };
        console.log(`[Scheduler] Job ${job.id} permanently failed after ${job.maxAttempts} attempts`);
      }
    }

    this.saveToDisk();
    this.broadcastUpdate(job);
  }

  // ─── Broadcast ───

  private broadcastUpdate(job: FollowUpJob): void {
    if (broadcastFn) {
      broadcastFn({ type: 'scheduler_job_update', job });
    }
  }
}

// Singleton instance
export const scheduler = new Scheduler();

/**
 * Helper: Generate a follow-up message based on the lead and previous outreach.
 */
export function generateFollowUpMessage(
  lead: Lead,
  attemptNumber: number,
  previousMessage?: string
): string {
  const name = lead.name.replace(/[&\\/\\#,+()$~%.'":*?<>{}]/g, '').split(' ').slice(0, 2).join(' ');
  const category = lead.category || 'business';

  const followUps = [
    // Attempt 1: Gentle nudge
    `Hi ${name} team! 👋 Just following up on my previous message about building a professional website & booking system for your ${category}. Did you have a chance to look at the concept I mentioned? Happy to share a quick visual preview — no obligation at all. 🚀`,

    // Attempt 2: Value-add
    `Hello ${name} 👋 I know you're busy running your ${category}! Quick question — are you currently losing customers who can't find you online? I built a simple booking page concept for your business that could capture those leads automatically. Want to see it?`,

    // Attempt 3: Social proof + urgency
    `Hi ${name} 👋 Quick observation: most successful ${category} businesses in your area now have online booking systems. I have a ready-to-use template designed for your specific services. It takes 2 minutes to review. Would tomorrow work?`,

    // Attempt 4: Final attempt
    `Hi ${name} — last check-in from me! I help local ${category} businesses automate their customer intake. If you're interested in seeing how a booking website could work for you, let me know and I'll send over the free mockup. No pressure at all! 🙂`,
  ];

  const idx = Math.min(attemptNumber - 1, followUps.length - 1);
  return followUps[idx];
}
