import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Terminal, Loader2, RefreshCw } from 'lucide-react';

interface LogEntry {
  id: string;
  message: string;
  created_at: string;
}

interface ConsoleDrawerProps {
  boxId: string;
  boxSn: string;
  progress: number;
  onClose: () => void;
}

const getLineClass = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes('error') || lower.includes('fail') || lower.includes('failed')) {
    return 'text-rose-400';
  }
  if (lower.includes('warn')) {
    return 'text-amber-400';
  }
  if (lower.includes('complete') || lower.includes('success') || lower.includes('callback')) {
    return 'text-emerald-400';
  }
  if (lower.includes('subiquity')) {
    return 'text-indigo-300';
  }
  return 'text-green-300';
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour12: false });
};

export default function ConsoleDrawer({ boxId, boxSn, progress, onClose }: ConsoleDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/boxes/${boxId}/provisioning-logs`);
      if (res.ok) {
        setLogs(await res.json());
        setLastFetched(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch provisioning logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [boxId]);

  // Auto-scroll to bottom when new lines arrive (only if already at the bottom)
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      if (isAtBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [logs]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl h-[70vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(99,102,241,0.25)', background: '#09090f' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <Terminal size={14} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100 leading-none">Installation Console</h3>
              <p className="text-[10px] mt-0.5 font-mono text-zinc-500">{boxSn}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress bar */}
            {progress > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: progress >= 95
                        ? 'linear-gradient(90deg,#10b981,#34d399)'
                        : 'linear-gradient(90deg,#6366f1,#818cf8)'
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-zinc-400 w-8">{progress}%</span>
              </div>
            )}
            {loading
              ? <Loader2 size={13} className="animate-spin text-indigo-400" />
              : <RefreshCw size={13} className="text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors" onClick={fetchLogs} />
            }
            <span className="text-[10px] text-zinc-600 font-mono hidden sm:block">{logs.length} lines</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Log body */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 && !loading && (
            <p className="text-zinc-600 italic py-4 text-center">Waiting for installer reports…</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 group hover:bg-white/[0.02] px-1 rounded">
              <span className="shrink-0 text-zinc-600 group-hover:text-zinc-500 transition-colors select-none">
                {formatTime(log.created_at)}
              </span>
              <span className={`${getLineClass(log.message)} break-all`}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-[10px] text-zinc-600 font-mono">
            Live · polling every 2s
            {lastFetched && (
              <span className="ml-2 text-zinc-700">
                · updated {lastFetched.toLocaleTimeString('en-GB', { hour12: false })}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
