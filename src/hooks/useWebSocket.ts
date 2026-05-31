/**
 * AI Client Hunter — WebSocket Real-Time Client Hook
 *
 * Connects to the server's WebSocket and pipes agent log entries
 * and lead events into the local agentLogger and dispatches CustomEvents
 * for real-time UI updates.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { agentLogger } from '../agents/logger';

interface WSStatus {
  connected: boolean;
  lastPong: string | null;
  eventsReceived: number;
  reconnectCount: number;
}

/**
 * useWebSocket — Establishes a persistent WebSocket connection to the server
 * and relays real-time agent log events into the local agentLogger.
 * Also dispatches CustomEvents for lead updates and pipeline events.
 */
export function useWebSocket() {
  const [status, setStatus] = useState<WSStatus>({
    connected: false,
    lastPong: null,
    eventsReceived: 0,
    reconnectCount: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttemptRef = useRef(0);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        console.log('[WS] Connected to real-time agent log stream');
        reconnectAttemptRef.current = 0;
        setStatus(prev => ({ ...prev, connected: true, reconnectCount: reconnectAttemptRef.current }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'pong') {
            setStatus(prev => ({ ...prev, lastPong: new Date().toISOString() }));
            return;
          }

          if (message.type === 'agent_log' && message.entry) {
            const entry = message.entry;
            // Push the log entry into the local agentLogger so all subscribers get it
            agentLogger.log(
              entry.level || 'info',
              entry.agentName || 'Server',
              entry.message || '',
              {
                toolName: entry.toolName,
                toolArgs: entry.toolArgs,
                toolResult: entry.toolResult,
                durationMs: entry.durationMs,
                iteration: entry.iteration,
                error: entry.error,
                details: entry.details,
                kind: entry.kind,
                method: entry.method,
                path: entry.path,
                statusCode: entry.statusCode,
              }
            );
            setStatus(prev => ({ ...prev, eventsReceived: prev.eventsReceived + 1 }));
            return;
          }

          // Dispatch lead events as CustomEvents for other components
          if (message.type === 'lead_created' || message.type === 'lead_updated' || message.type === 'lead_deleted') {
            window.dispatchEvent(new CustomEvent('ws-lead-event', { detail: message }));
          }

          if (message.type === 'leads_updated') {
            window.dispatchEvent(new CustomEvent('ws-leads-updated', { detail: message }));
          }
        } catch (err) {
          // Ignore parse errors for non-JSON messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        console.warn('[WS] Disconnected. Reconnecting in 5s...');
        setStatus(prev => ({ ...prev, connected: false }));
        wsRef.current = null;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current++;
        setStatus(prev => ({ ...prev, reconnectCount: reconnectAttemptRef.current }));

        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after this
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection error:', err);
      // Retry after delay
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
      reconnectAttemptRef.current++;
      reconnectTimerRef.current = setTimeout(connect, delay);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Ping every 25s to keep connection alive
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { ...status, ws: wsRef };
}

/**
 * useWebSocketStatus — Lightweight hook that returns just the connection status.
 */
export function useWebSocketStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let pingInterval: ReturnType<typeof setInterval>;
    let mounted = true;

    const connect = () => {
      if (!mounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (mounted) setConnected(true);
        };

        ws.onclose = () => {
          if (mounted) {
            setConnected(false);
            reconnectTimer = setTimeout(connect, 10000);
          }
        };

        ws.onerror = () => {};

        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      } catch {
        reconnectTimer = setTimeout(connect, 10000);
      }
    };

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, []);

  return connected;
}
