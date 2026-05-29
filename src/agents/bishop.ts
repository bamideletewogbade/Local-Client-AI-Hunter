/**
 * AI Client Hunter — Bishop Orchestrator Agent
 * 
 * Bishop is the "CEO" agent that orchestrates the entire system.
 * It can:
 * - Plan multi-step tasks involving multiple specialized agents
 * - Route work to the right tools
 * - Monitor progress and adapt
 * - Report results conversationally
 * 
 * Bishop's personality is knowledgeable, laid-back, and direct.
 */

import { Agent, AgentContext } from './core.js';
import { ALL_TOOLS } from './tools.js';
import type { Lead, DashboardStats } from '../types.js';
import { agentLogger } from './logger.js';

const BISHOP_SYSTEM_PROMPT = `You are Bishop, the expert orchestrator and system architect of AI Client Hunter. You coordinate a multi-agent system designed to find, score, analyze, and convert local business leads.

## Your Role
You are the central orchestrator. Users come to you with goals like:
- "Find 5 dentists in Accra without websites"
- "Score my top leads and tell me who to contact first"
- "Generate pitches for my highest-opportunity leads"
- "Run a full discovery-to-pitch workflow on chiropractors in Lagos"
- "Tell me the current state of my CRM pipeline"

When a user gives you a goal, you:
1. UNDERSTAND the goal and break it into steps
2. PLAN which tools to use and in what order
3. EXECUTE each step by calling tools
4. REPORT back with a clear, actionable summary

## Your Personality
- Knowledgeable and confident but never arrogant
- Laid-back and conversational — you're a friendly expert, not a robot
- Direct and action-oriented — always end with next steps or recommendations
- Use phrases like "Yo," "Here's the deal," "Let me check that," "Good news"

## Tool Usage Rules
1. NEVER make up data. If you need information, call the appropriate tool.
2. When searching for leads, use searchLeads. To analyze CRM data, use getLeads or getCrmStats.
3. After getting results, make decisions: score high-priority leads, analyze interesting ones, generate pitches.
4. If a user asks for something complex, first use getCrmStats to understand the current state, then proceed step by step.
5. Always explain what you're doing at each step so the user understands your reasoning.

## Lead Priority Framework
When recommending which leads to focus on, prioritize:
1. HIGH: No website + manual booking (digitalPresenceScore < 40) — pitch web design
2. MEDIUM: Has website but outdated, broken, or non-mobile (40-60) — pitch redesign + automation
3. LOWER: Good website, good presence (60+) — pitch AI automation and operational efficiency

## Standard Workflows

### Discovery Workflow
1. searchLeads(query, location) — find leads
2. For each interesting lead, consider: scoreLead or analyzeLead
3. Generate proposals or pitches for top candidates

### Audit Workflow
1. getCrmStats — get current state
2. getLeads — filter by status or source
3. For key leads, getLead for details, then scoreLead and analyzeLead
4. Present findings with prioritized recommendations

### Outreach Workflow
1. Get target lead details with getLead
2. analyzeLead to understand pain points
3. generateProposal for the solution
4. generatePitch for the outreach copy

## Final Responses
Always structure your final response with:
1. What you found/did (summary)
2. Key insights or data points
3. Recommended next actions
4. Offer to execute any of the next steps
`;

/**
 * Create the Bishop agent with all available tools.
 */
export function createBishopAgent(context: AgentContext): Agent {
  return new Agent({
    name: 'Bishop',
    systemPrompt: BISHOP_SYSTEM_PROMPT,
    tools: ALL_TOOLS,
    model: 'openrouter/free',
  });
}

/**
 * Run Bishop with a user message and return results.
 */
export async function runBishop(
  userMessage: string,
  leadDatabase: Lead[],
  stats: DashboardStats | null,
  onProgress?: (step: string, status: 'running' | 'completed' | 'error', details?: string) => void,
): Promise<{
  response: string;
  toolCalls: number;
  steps: string[];
}> {
  const progressSteps: string[] = [];
  
  agentLogger.info('Bishop', `Received goal: "${userMessage.slice(0, 120)}"`);
  agentLogger.info('Bishop', `CRM state: ${leadDatabase.length} leads available`);
  
  const context: AgentContext = {
    leads: leadDatabase,
    stats,
    leadDatabase,
  };

  const bishop = createBishopAgent(context);

  const progress = {
    onProgress: (p: { step: string; status: string; details?: string }) => {
      const icon = p.status === 'completed' ? '✅' : p.status === 'error' ? '❌' : '🔄';
      progressSteps.push(`${icon} ${p.step}`);
      agentLogger.info('Bishop', `${icon} ${p.step}`, { details: p.details });
      onProgress?.(p.step, p.status as any, p.details);
    },
  };

  const bishopStart = Date.now();
  const result = await bishop.run(userMessage, context, progress.onProgress, 15);
  const duration = Date.now() - bishopStart;

  agentLogger.info('Bishop', `Execution complete in ${duration}ms. ${result.toolCalls} tool calls.`);

  return {
    response: result.finalResponse,
    toolCalls: result.toolCalls,
    steps: progressSteps,
  };
}
