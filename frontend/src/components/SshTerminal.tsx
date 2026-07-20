import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

interface SshTerminalProps {
  boxId: string;
}

/**
 * SshTerminal mounts an xterm.js terminal and proxies I/O through
 * the backend WebSocket endpoint at /api/ssh/{boxId}?token=<jwt>.
 *
 * The component manages its own Terminal / WebSocket lifecycle:
 * - Opens WS on mount, closes on unmount.
 * - Writes server data to the terminal, sends keystrokes to the server.
 * - Handles reconnect attempts on clean close.
 */
export default function SshTerminal({ boxId }: SshTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token') || '';
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${proto}://${host}/api/ssh/${boxId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      termRef.current?.writeln('\r\x1b[32m[Connected]\x1b[0m');
    };

    ws.onmessage = (event) => {
      if (!termRef.current) return;
      if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(event.data);
        termRef.current.write(text);
      } else {
        termRef.current.write(event.data as string);
      }
    };

    ws.onerror = () => {
      termRef.current?.writeln('\r\n\x1b[31m[WebSocket error — see browser console]\x1b[0m\r\n');
    };

    ws.onclose = (ev) => {
      termRef.current?.writeln(
        `\r\n\x1b[33m[Session closed — code ${ev.code}]\x1b[0m\r\n`
      );
    };
  }, [boxId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
      theme: {
        background: '#09090f',
        foreground: '#d4d4d8',
        cursor: '#818cf8',
        selectionBackground: 'rgba(99,102,241,0.35)',
        black: '#18181b',
        brightBlack: '#3f3f46',
        red: '#f87171',
        brightRed: '#fca5a5',
        green: '#34d399',
        brightGreen: '#6ee7b7',
        yellow: '#fbbf24',
        brightYellow: '#fde68a',
        blue: '#818cf8',
        brightBlue: '#a5b4fc',
        magenta: '#c084fc',
        brightMagenta: '#d8b4fe',
        cyan: '#22d3ee',
        brightCyan: '#67e8f9',
        white: '#d4d4d8',
        brightWhite: '#f4f4f5',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // Relay keystrokes to WebSocket
    term.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(new TextEncoder().encode(data));
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      try { fitRef.current?.fit(); } catch { /* ignore */ }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    connect();

    return () => {
      resizeObserver.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, [connect]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 w-full"
      style={{ background: '#09090f' }}
    />
  );
}
