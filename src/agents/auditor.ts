/**
 * AscendSME · Lumi · Hone · AI Client Finder — Auditor Agent
 *
 * The 5th stage in the agent pipeline. Reviews outputs from Scanner, Analyzer,
 * Pitcher, and Converter stages for quality assurance, completeness, and
 * actionable recommendations.
 */

import type { Lead, ScoreBreakdown } from '../types.js';

// ─── Types ───

export interface AuditFinding {
  severity: 'critical' | 'warning' | 'info' | 'success';
  category: string;
  message: string;
  details?: string;
  leadId?: string;
}

export interface AuditReport {
  /** Overall audit score (0-100) */
  overallQuality: number;
  /** Total leads reviewed */
  leadsReviewed: number;
  /** High-priority leads (no website + high opportunity) */
  highPriorityLeads: number;
  /** Leads with contact info issues */
  contactIssues: number;
  /** Quick wins the user can act on immediately */
  quickWins: number;
  /** Readiness score for conversion (0-100) */
  conversionReadiness: number;
  /** All individual findings */
  findings: AuditFinding[];
  /** Summary bullet points for the user */
  summary: string[];
  /** Specific recommendations */
  recommendations: string[];
  /** Stage-by-stage breakdown */
  stageBreakdown: {
    scanner: { score: number; notes: string[] };
    analyzer: { score: number; notes: string[] };
    pitcher: { score: number; notes: string[] };
    converter: { score: number; notes: string[] };
  };
}

// ─── Audit Engine ───

export function auditPipeline(
  leads: Lead[],
  scanResults?: { query: string; location: string; count: number },
  scoreResults?: Map<string, ScoreBreakdown>,
  pitchResults?: Map<string, boolean>,
  conversionResults?: { total: number; succeeded: number; failed: number }
): AuditReport {
  const findings: AuditFinding[] = [];
  const summary: string[] = [];
  const recommendations: string[] = [];
  const scannerNotes: string[] = [];
  const analyzerNotes: string[] = [];
  const pitcherNotes: string[] = [];
  const converterNotes: string[] = [];

  // ─── Scanner Audit ───
  if (scanResults) {
    scannerNotes.push(`Found ${scanResults.count} leads for "${scanResults.query}" in ${scanResults.location}`);
    if (scanResults.count === 0) {
      findings.push({
        severity: 'critical',
        category: 'Scanner',
        message: 'No leads found — search returned zero results',
        details: `Query: "${scanResults.query}" in ${scanResults.location} returned no businesses. Try broadening the search term or changing location.`,
      });
      scannerNotes.push('CRITICAL: Zero leads found');
    } else if (scanResults.count < 3) {
      findings.push({
        severity: 'warning',
        category: 'Scanner',
        message: `Only ${scanResults.count} leads found — consider broadening search`,
        details: `A broader query like "${scanResults.query.split(' ')[0]}" may yield more results.`,
      });
      scannerNotes.push(`Low volume: only ${scanResults.count} leads`);
    } else {
      findings.push({
        severity: 'success',
        category: 'Scanner',
        message: `Successfully discovered ${scanResults.count} local businesses`,
      });
      scannerNotes.push(`Good discovery: ${scanResults.count} leads`);
    }
  }

  // ─── Analyzer Audit ───
  const noWebsite = leads.filter(l => !l.website);
  const highScore = leads.filter(l => {
    const score = l.scoreBreakdown?.total || l.digitalPresenceScore || 0;
    return score > 60;
  });
  const lowScore = leads.filter(l => {
    const score = l.scoreBreakdown?.total || l.digitalPresenceScore || 0;
    return score <= 40;
  });
  const withPhone = leads.filter(l => l.phone && l.phone !== 'No phone listed');
  const withRating = leads.filter(l => l.rating && l.rating > 0);

  analyzerNotes.push(`${noWebsite.length}/${leads.length} leads have NO website (high-value targets)`);
  analyzerNotes.push(`Average digital score: ~${leads.length > 0 ? Math.round(leads.reduce((s, l) => s + (l.digitalPresenceScore || 50), 0) / leads.length) : 0}/100`);

  if (noWebsite.length > 0) {
    findings.push({
      severity: 'success',
      category: 'Analyzer',
      message: `${noWebsite.length} leads have no website — prime opportunities for web design outreach`,
      details: noWebsite.slice(0, 3).map(l => `• ${l.name} — ${l.category || 'local business'} in ${l.address?.split(',').pop()?.trim() || 'unknown area'}`).join('\n'),
    });
  }

  if (highScore.length > 0) {
    findings.push({
      severity: 'info',
      category: 'Analyzer',
      message: `${highScore.length} leads already have decent digital presence (score > 60) — focus on upselling AI automation`,
    });
  }

  if (lowScore.length > 0) {
    findings.push({
      severity: 'warning',
      category: 'Analyzer',
      message: `${lowScore.length} leads have very low digital presence (score ≤ 40) — easy wins for web design`,
    });
  }

  if (!withPhone.length) {
    findings.push({
      severity: 'critical',
      category: 'Analyzer',
      message: 'No leads have phone numbers — WhatsApp outreach will be blocked',
    });
  }

  if (withRating.length < leads.length * 0.5) {
    findings.push({
      severity: 'warning',
      category: 'Analyzer',
      message: `${leads.length - withRating.length} leads have no rating data — less social proof for pitching`,
    });
  }

  // ─── Pitcher Audit ───
  if (pitchResults) {
    const pitched = Array.from(pitchResults.values()).filter(Boolean).length;
    pitcherNotes.push(`Generated pitches for ${pitched} leads`);

    if (pitched > 0) {
      findings.push({
        severity: 'success',
        category: 'Pitcher',
        message: `Custom outreach proposals ready for ${pitched} leads across email, LinkedIn, and WhatsApp`,
        details: pitched === 1
          ? '1 pitch package generated with 3 channel variants (email, LinkedIn, WhatsApp)'
          : `${pitched} pitch packages generated, each with 3 channel variants`,
      });
    }
  } else {
    // Even without explicit pitch results, check if leads have outreachPitch
    const withPitch = leads.filter(l => l.outreachPitch);
    if (withPitch.length > 0) {
      pitcherNotes.push(`${withPitch.length} leads have generated pitches`);
    }
  }

  // ─── Converter Audit ───
  if (conversionResults) {
    converterNotes.push(`${conversionResults.succeeded}/${conversionResults.total} leads ready for outreach`);

    if (conversionResults.succeeded > 0) {
      findings.push({
        severity: 'success',
        category: 'Converter',
        message: `${conversionResults.succeeded} leads ready for immediate outreach`,
        details: `Pipeline readiness: ${conversionResults.succeeded} leads can be contacted now. ${conversionResults.failed} have issues blocking contact.`,
      });
    }
  }

  // ─── Cross-Stage Analysis ───

  // Check for critical path issues
  const noPhone = leads.filter(l => !l.phone || l.phone === 'No phone listed');
  if (noPhone.length > 0 && (noPhone.length / leads.length) > 0.3) {
    findings.push({
      severity: 'critical',
      category: 'Pipeline',
      message: `${noPhone.length}/${leads.length} leads missing phone numbers — consider alternative outreach channels (email, LinkedIn)`,
    });
  }

  // No website + high score = good tech adopters
  const techAdopters = leads.filter(l => !l.website && (l.digitalPresenceScore || 0) > 50);
  if (techAdopters.length > 0) {
    findings.push({
      severity: 'success',
      category: 'Pipeline',
      message: `${techAdopters.length} leads have no website but some digital awareness — prime candidates for web design pitch`,
      details: techAdopters.map(l => `• ${l.name}`).join('\n'),
    });
    recommendations.push(`Prioritize ${techAdopters.map(l => l.name.split(' ')[0]).join(', ')} for immediate outreach — they have digital awareness but no website.`);
  }

  // Leads with high score and phone = ready for conversion
  const readyForConversion = leads.filter(l => {
    const score = l.scoreBreakdown?.total || l.digitalPresenceScore || 0;
    return score > 50 && l.phone && l.phone !== 'No phone listed';
  });
  if (readyForConversion.length > 0) {
    findings.push({
      severity: 'success',
      category: 'Pipeline',
      message: `${readyForConversion.length} leads flagged as 'conversion-ready' — highest ROI targets`,
    });
  }

  // ─── Summary ───

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const successCount = findings.filter(f => f.severity === 'success').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;

  if (criticalCount > 0) {
    summary.push(`⚠️ ${criticalCount} critical issues found — address before proceeding`);
  }
  if (warningCount > 0) {
    summary.push(`⚡ ${warningCount} warnings — review for optimal results`);
  }
  summary.push(`✅ ${successCount} positive findings — ${noWebsite.length} leads without website, ${readyForConversion.length} conversion-ready`);

  recommendations.push(
    readyForConversion.length > 0
      ? `Start outreach with ${readyForConversion.slice(0, 2).map(l => l.name).join(' and ')} — highest conversion probability`
      : 'Save leads to CRM first, then run a score to identify high-priority targets',
  );

  if (noWebsite.length > 0) {
    recommendations.push(`Target ${noWebsite.slice(0, 3).map(l => l.name.split(' ')[0]).join(', ')} with web design proposals — no existing site means no switching cost`);
  }

  recommendations.push(
    noPhone.length > 0
      ? `${noPhone.length} leads need phone numbers for WhatsApp — try finding them via Google or social media`
      : 'All leads have contact info — full WhatsApp outreach is possible',
  );

  // ─── Scores ───

  const scannerScore = scanResults && scanResults.count > 0
    ? Math.min(100, 50 + scanResults.count * 10)
    : 0;

  const analyzerScore = leads.length > 0
    ? Math.round(
        (noWebsite.length / leads.length) * 40 +
        (withPhone.length / leads.length) * 30 +
        (withRating.length / leads.length) * 30
      )
    : 0;

  const pitcherScore = pitchResults
    ? Math.round((Array.from(pitchResults.values()).filter(Boolean).length / Math.max(1, pitchResults.size)) * 100)
    : leads.filter(l => l.outreachPitch).length > 0
      ? 70
      : 30;

  const converterScore = conversionResults
    ? Math.round((conversionResults.succeeded / Math.max(1, conversionResults.total)) * 100)
    : withPhone.length > 0
      ? Math.round((withPhone.length / leads.length) * 100)
      : 0;

  const overallQuality = Math.round(
    (scannerScore * 0.2) +
    (analyzerScore * 0.3) +
    (pitcherScore * 0.25) +
    (converterScore * 0.25)
  );

  const conversionReadiness = Math.round(
    (readyForConversion.length / Math.max(1, leads.length)) * 100
  );

  const quickWinsCount = noWebsite.filter(l => l.phone && l.phone !== 'No phone listed').length;

  return {
    overallQuality,
    leadsReviewed: leads.length,
    highPriorityLeads: noWebsite.length,
    contactIssues: noPhone.length,
    quickWins: quickWinsCount,
    conversionReadiness,
    findings,
    summary,
    recommendations,
    stageBreakdown: {
      scanner: { score: scannerScore, notes: scannerNotes },
      analyzer: { score: analyzerScore, notes: analyzerNotes },
      pitcher: { score: pitcherScore, notes: pitcherNotes },
      converter: { score: converterScore, notes: converterNotes },
    },
  };
}

/**
 * Generate a human-readable audit summary string.
 */
export function formatAuditSummary(report: AuditReport): string {
  const lines = [
    `📋 Audit Report — ${report.leadsReviewed} leads reviewed`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Overall Quality: ${report.overallQuality}/100`,
    `Conversion Readiness: ${report.conversionReadiness}/100`,
    ``,
    `📊 Findings: ${report.findings.length}`,
    ...report.findings.filter(f => f.severity === 'critical').map(f => `  🔴 [CRITICAL] ${f.message}`),
    ...report.findings.filter(f => f.severity === 'warning').map(f => `  🟡 [WARNING] ${f.message}`),
    ...report.findings.filter(f => f.severity === 'success').map(f => `  🟢 ${f.message}`),
    ``,
    `🎯 Recommendations:`,
    ...report.recommendations.map(r => `  → ${r}`),
    ``,
    `📈 Stage Scores:`,
    `  Scanner:   ${report.stageBreakdown.scanner.score}/100`,
    `  Analyzer:  ${report.stageBreakdown.analyzer.score}/100`,
    `  Pitcher:   ${report.stageBreakdown.pitcher.score}/100`,
    `  Converter: ${report.stageBreakdown.converter.score}/100`,
  ];

  return lines.join('\n');
}
