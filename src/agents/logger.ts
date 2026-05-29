/**
 * AI Client Hunter — Agent Logging System
 *
 * Centralized logging for all agent interactions.
 * Logs are emitted to console and broadcast via WebSocket for real-time UI display.
 *
 * Log levels: DEBUG, INFO, WARN, ERROR
 * Each log entry includes: timestamp, agent name, tool name, args, result, duration, level
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AgentLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  agentName: string;
  message: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;
  durationMs?: number;
  iteration?: number;
  error?: string;
  details?: string;
}

type LogListener = (entry: AgentLogEntry) => void;

// ─── Logger singleton ───

class AgentLogger {
  private listeners: LogListener[] = [];
  private history: AgentLogEntry[] = [];
  private maxHistory = 500;
  private counter = 0;

  /**
   * Subscribe to real-time log entries.
   * Returns an unsubscribe function.
   */
  subscribe(listener: LogListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get full log history.
   */
  getHistory(): AgentLogEntry[] {
    return [...this.history];
  }

  /**
   * Clear log history.
   */
  clear(): void {
    this.history = [];
    this.counter = 0;
  }

  /**
   * Core log method.
   */
  log(level: LogLevel, agentName: string, message: string, meta?: Partial<AgentLogEntry>): AgentLogEntry {
    const entry: AgentLogEntry = {
      id: `log-${++this.counter}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level,
      agentName,
      message,
      ...meta,
    };

    // Console output with styling
    const prefix = `[${entry.timestamp.split('T')[1]?.split('.')[0] || ''}] [${agentName}]`;
    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, meta?.details || '');
        break;
      case 'info':
        console.info(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠ ${message}`, meta?.error || '');
        break;
      case 'error':
        console.error(`${prefix} ✗ ${message}`, meta?.error || '');
        break;
    }

    // Store in history
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Broadcast to listeners
    this.listeners.forEach(l => l(entry));

    return entry;
  }

  debug(agentName: string, message: string, meta?: Partial<AgentLogEntry>) {
    return this.log('debug', agentName, message, meta);
  }

  info(agentName: string, message: string, meta?: Partial<AgentLogEntry>) {
    return this.log('info', agentName, message, meta);
  }

  warn(agentName: string, message: string, meta?: Partial<AgentLogEntry>) {
    return this.log('warn', agentName, message, meta);
  }

  error(agentName: string, message: string, meta?: Partial<AgentLogEntry>) {
    return this.log('error', agentName, message, meta);
  }

  /**
   * Log a tool call with timing.
   */
  toolCall(agentName: string, toolName: string, args: Record<string, any>, durationMs: number, result: any, error?: string) {
    const level: LogLevel = error ? 'error' : 'info';
    return this.log(level, agentName, `Tool: ${toolName}`, {
      toolName,
      toolArgs: args,
      toolResult: result,
      durationMs,
      error,
      details: `Args: ${JSON.stringify(args).slice(0, 200)}${error ? ` | Error: ${error}` : ` | Result: ${JSON.stringify(result).slice(0, 200)}`}`,
    });
  }

  /**
   * Log an agent iteration step.
   */
  iteration(agentName: string, iteration: number, message: string) {
    return this.log('info', agentName, `[Iter ${iteration}] ${message}`, { iteration });
  }
}

// Singleton instance
export const agentLogger = new AgentLogger();

/**
 * WebSocket broadcast helper — sends log entries to connected clients.
 * Call this from server-side code when a log entry is created.
 */
export function broadcastLogEntry(entry: AgentLogEntry): void {
  // The server will inject a global broadcast function at runtime
  if (typeof globalThis !== 'undefined' && (globalThis as any).__agentLogBroadcast) {
    (globalThis as any).__agentLogBroadcast(entry);
  }
}
