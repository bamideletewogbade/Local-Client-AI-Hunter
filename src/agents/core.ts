/**
 * AI Client Hunter — Agentic Core
 * 
 * Lightweight, production-grade agent orchestration layer.
 * Pattern: Supervisor loop with tool-calling via OpenRouter.
 * 
 * An agent is defined as:
 *   System Prompt + Tools + LLM → Tool Calls or Final Response
 * 
 * The orchestrator loop:
 * 1. User sends a goal
 * 2. Agent (LLM) decides: respond directly OR call a tool
 * 3. If tool call → execute tool → add result to conversation → go to step 2
 * 4. If response → return to user
 */

import type { Lead, DashboardStats } from '../types.js';
import { getOpenRouterClient } from '../openrouter.js';
import { isGroqConfigured, chatWithGroq } from '../groq.js';
import { agentLogger } from './logger.js';

// ─── Zod-like schema using plain TypeScript for lightweight validation ───

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  items?: { type: 'string' | 'number' | 'object' };
  properties?: Record<string, ToolParameter>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (args: Record<string, any>, context: AgentContext) => Promise<any>;
}

export interface AgentContext {
  leads: Lead[];
  stats: DashboardStats | null;
  leadDatabase: Lead[];
  // Additional runtime context
  [key: string]: any;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface AgentRunResult {
  messages: AgentMessage[];
  finalResponse: string;
  toolCalls: number;
}

export interface TaskProgress {
  step: string;
  status: 'running' | 'completed' | 'error';
  details?: string;
}

type ProgressCallback = (progress: TaskProgress) => void;

// ─── Agent Core ───

export class Agent {
  public name: string;
  public systemPrompt: string;
  public tools: AgentTool[];
  public model: string;

  constructor(config: {
    name: string;
    systemPrompt: string;
    tools?: AgentTool[];
    model?: string;
  }) {
    this.name = config.name;
    this.systemPrompt = config.systemPrompt;
    this.tools = config.tools || [];
    this.model = config.model || 'openrouter/free';
  }

  /**
   * Run the agent with a user message, executing tool calls in a loop.
   * The agent will continue calling tools until it decides to respond.
   */
  async run(
    userMessage: string,
    context: AgentContext,
    onProgress?: ProgressCallback,
    maxIterations = 15,
  ): Promise<AgentRunResult> {
    agentLogger.info(this.name, `Starting execution: "${userMessage.slice(0, 100)}"`);

    const client = getOpenRouterClient();
    if (!client) {
      // Try Groq as fallback
      if (isGroqConfigured()) {
        agentLogger.info(this.name, 'OpenRouter unavailable — falling back to Groq');
        return await this.runWithGroq(userMessage, context, onProgress, maxIterations);
      }

      agentLogger.warn(this.name, 'No LLM provider configured (OpenRouter or Groq)');
      return {
        messages: [
          { role: 'assistant', content: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment.' },
        ],
        finalResponse: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment.',
        toolCalls: 0,
      };
    }

    const messages: AgentMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(context) },
      { role: 'user', content: userMessage },
    ];

    let toolCalls = 0;
    let finalResponse = '';
    let iterationCount = 0;

    agentLogger.info(this.name, 'Planning task strategy...');
    onProgress?.({ step: 'Planning task strategy...', status: 'running' });

    while (iterationCount < maxIterations) {
      iterationCount++;
      
      agentLogger.iteration(this.name, iterationCount, 'Sending to LLM');
      const startTime = Date.now();
      const response = await this.callLLM(client, messages);
      const llmTime = Date.now() - startTime;
      
      if (!response) {
        agentLogger.error(this.name, 'LLM returned null response', { iteration: iterationCount });
        finalResponse = 'The agent encountered an error processing your request. Please try again.';
        break;
      }

      agentLogger.debug(this.name, `LLM responded (${llmTime}ms)`, { details: response.slice(0, 150) });

      // Check if the response contains a tool call
      const toolCall = this.parseToolCall(response);

      if (toolCall) {
        toolCalls++;
        
        agentLogger.info(this.name, `Calling tool: ${toolCall.name}`, {
          toolName: toolCall.name,
          toolArgs: toolCall.args,
          iteration: iterationCount,
        });

        onProgress?.({
          step: `Executing: ${toolCall.name}...`,
          status: 'running',
          details: JSON.stringify(toolCall.args),
        });

        // Find and execute the tool
        const tool = this.tools.find(t => t.name === toolCall.name);
        if (!tool) {
          const errMsg = `Tool "${toolCall.name}" not found. Available tools: ${this.tools.map(t => t.name).join(', ')}`;
          agentLogger.error(this.name, errMsg);
          messages.push({
            role: 'tool',
            content: `Error: ${errMsg}`,
            tool_call_id: toolCall.name,
          });
          continue;
        }

        const toolStart = Date.now();
        try {
          const result = await tool.execute(toolCall.args, context);
          const toolDuration = Date.now() - toolStart;
          
          agentLogger.toolCall(this.name, toolCall.name, toolCall.args, toolDuration, result);

          // Truncate result if too long for the LLM context
          const resultStr = typeof result === 'string' 
            ? result 
            : JSON.stringify(result, null, 2);
          const truncatedResult = resultStr.length > 12000 
            ? resultStr.slice(0, 12000) + '\n... [result truncated]' 
            : resultStr;

          messages.push({
            role: 'tool',
            content: truncatedResult,
            tool_call_id: toolCall.name,
            name: toolCall.name,
          });

          onProgress?.({
            step: `Completed: ${toolCall.name}`,
            status: 'completed',
          });

        } catch (err: any) {
          const errorMsg = `Tool "${toolCall.name}" execution failed: ${err.message || String(err)}`;
          agentLogger.toolCall(this.name, toolCall.name, toolCall.args, Date.now() - toolStart, null, err.message || String(err));

          messages.push({
            role: 'tool',
            content: errorMsg,
            tool_call_id: toolCall.name,
          });
          
          onProgress?.({
            step: `Error: ${toolCall.name} failed`,
            status: 'error',
            details: errorMsg,
          });
        }
      } else {
        // No tool call — this is the final response
        agentLogger.info(this.name, 'LLM provided final response (no tool call)');
        finalResponse = response;
        break;
      }
    }

    if (iterationCount >= maxIterations && !finalResponse) {
      finalResponse = 'Task required too many steps. The orchestrator should simplify the request or check the last results.';
      agentLogger.warn(this.name, `Reached max iterations (${maxIterations})`);
    }

    agentLogger.info(this.name, `Execution complete. ${toolCalls} tool calls in ${iterationCount} iterations.`);
    onProgress?.({ step: 'Task complete', status: 'completed' });

    return {
      messages,
      finalResponse,
      toolCalls,
    };
  }

  /**
   * Fallback: Run the agent using Groq instead of OpenRouter.
   * Uses chatWithGroq to maintain full conversation context.
   */
  private async runWithGroq(
    userMessage: string,
    context: AgentContext,
    onProgress?: ProgressCallback,
    maxIterations = 15,
  ): Promise<AgentRunResult> {
    agentLogger.info(this.name, 'Starting Groq fallback execution');

    const messages: AgentMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(context) },
      { role: 'user', content: userMessage },
    ];

    let toolCalls = 0;
    let finalResponse = '';
    let iterationCount = 0;

    onProgress?.({ step: 'Planning via Groq...', status: 'running' });

    while (iterationCount < maxIterations) {
      iterationCount++;
      
      // Convert messages to Groq format, preserving full conversation context
      const groqMessages: { role: string; content: string }[] = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content }));

      const systemMsg = messages.find(m => m.role === 'system');
      
      const startTime = Date.now();
      const response = await chatWithGroq(
        groqMessages,
        systemMsg?.content || '',
        { temperature: 0.7 }
      );
      
      if (!response) {
        finalResponse = 'Agent execution failed via Groq fallback. Please check your API keys.';
        break;
      }

      // In Groq fallback mode, we respond directly without tool calls
      // (Groq has different tool-calling format, simplified here)
      finalResponse = response;
      break;
    }

    agentLogger.info(this.name, `Groq fallback complete (${iterationCount} iterations)`);
    onProgress?.({ step: 'Task complete', status: 'completed' });

    return {
      messages,
      finalResponse,
      toolCalls,
    };
  }

  /**
   * Build the full system prompt with tool descriptions for the LLM.
   */
  private buildSystemPrompt(context: AgentContext): string {
    let prompt = this.systemPrompt;

    prompt += `\n\n## Current CRM State
Total leads in database: ${context.leadDatabase.length}
`;

    if (context.stats) {
      const stats = context.stats;
      prompt += `- Total Leads: ${stats.totalLeads}
- Leads with no website: ${stats.noWebsite}
- Contacted: ${stats.contactedLeads}
- Interested/Closed: ${stats.meetingsBooked}
- Avg lead opportunity score: ${stats.avgLeadScore}/100
- Estimated pipeline revenue: $${stats.estimatedPipelineRevenue}
`;
    }

    if (this.tools.length > 0) {
      prompt += `\n## Available Tools\nYou have access to the following tools. When you need to perform an action, respond with a tool call in this exact JSON format:\n\`\`\`json\n{"tool": "tool_name", "args": { ... }}\n\`\`\`\n\nAfter a tool returns results, use them to decide next steps — call another tool or give a final response.\n\n`;
      
      for (const tool of this.tools) {
        prompt += `### ${tool.name}\n${tool.description}\nParameters:\n\`\`\`json\n${JSON.stringify(tool.parameters, null, 2)}\n\`\`\`\n\n`;
      }

      prompt += `\n## Rules\n`;
      prompt += `- When you need data or want to perform an action, call a tool.\n`;
      prompt += `- After receiving tool results, analyze them and either call another tool or give a final response.\n`;
      prompt += `- NEVER make up data. Always use tools to get real information.\n`;
      prompt += `- Your final response should summarize what was accomplished in a helpful, conversational way.\n`;
      prompt += `- When giving your final response, do NOT include JSON tool calls — just natural language.\n`;
    }

    return prompt;
  }

  /**
   * Call the LLM with the current message list.
   */
  private async callLLM(client: ReturnType<typeof getOpenRouterClient>, messages: AgentMessage[]): Promise<string | null> {
    if (!client) return null;

    try {
      // Convert our messages to OpenAI SDK format
      const apiMessages: any[] = messages
        .filter(m => m.role !== 'system') // system prompt is separate
        .map(m => {
          if (m.role === 'tool') {
            return {
              role: 'tool' as const,
              content: m.content,
              tool_call_id: m.tool_call_id || m.name || 'unknown',
            };
          }
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content,
          };
        });

      // Find system prompt
      const systemMsg = messages.find(m => m.role === 'system');
      
      const response = await client.chat.completions.create({
        model: this.model,
        messages: [
          ...(systemMsg ? [{ role: 'system' as const, content: systemMsg.content }] : []),
          ...apiMessages,
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });

      return response.choices[0]?.message?.content ?? null;
    } catch (err: any) {
      agentLogger.error(this.name, `LLM call failed: ${err.message}`, { error: err.message });
      return null;
    }
  }

  /**
   * Parse a response to check if it contains a tool call in JSON format.
   */
  private parseToolCall(response: string): { name: string; args: Record<string, any> } | null {
    // Try to find JSON block with tool call
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.tool && parsed.args) {
          return { name: parsed.tool, args: parsed.args };
        }
      } catch {}
    }

    // Try parsing the entire response as JSON
    try {
      const trimmed = response.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.tool && parsed.args) {
          return { name: parsed.tool, args: parsed.args };
        }
      }
    } catch {}

    return null;
  }
}

/**
 * Helper to create a simple progress callback that accumulates steps.
 */
export function createProgressTracker(): { 
  onProgress: ProgressCallback; 
  steps: TaskProgress[];
} {
  const steps: TaskProgress[] = [];
  return {
    onProgress: (progress: TaskProgress) => {
      steps.push(progress);
      console.log(`[Agent] ${progress.step} — ${progress.status}`);
    },
    steps,
  };
}
