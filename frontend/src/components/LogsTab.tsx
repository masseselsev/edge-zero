import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { Terminal, Shield, RefreshCw, Search } from 'lucide-react';

interface SystemLog {
  id: number;
  level: string;
  message: string;
  created_at: string;
}

interface AuditLog {
  id: number;
  username: string;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function LogsTab() {
  const { t } = useTranslation();
  
  // Debug View toggle (false = Audit Logs as primary, true = System Debug Logs)
  const [debugView, setDebugView] = useState(false);
  const [search, setSearch] = useState('');
  
  // Data State
  const [debugLogs, setDebugLogs] = useState<SystemLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (debugView) {
        const res = await fetch('/api/system/debug-logs');
        if (res.ok) {
          const data = await res.json();
          // Reverse to show chronological order inside terminal
          setDebugLogs([...data].reverse());
        }
      } else {
        const res = await fetch('/api/system/audit-logs');
        if (res.ok) {
          setAuditLogs(await res.json());
        }
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, debugView ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [debugView]);

  // Auto-scroll to bottom of terminal when debugView is on
  useEffect(() => {
    const container = containerRef.current;
    if (debugView && container && terminalEndRef.current) {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      if (isAtBottom) {
        terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [debugLogs, debugView]);

  const getLogLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return 'text-rose-450 font-bold';
      case 'WARNING':
        return 'text-amber-400 font-bold';
      case 'DEBUG':
        return 'text-zinc-500';
      default:
        return 'text-emerald-400';
    }
  };

  // Filtered logs
  const filteredAuditLogs = auditLogs.filter(log =>
    log.username.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(search.toLowerCase())) ||
    (log.ip_address && log.ip_address.includes(search))
  );

  const filteredDebugLogs = debugLogs.filter(log =>
    log.message.toLowerCase().includes(search.toLowerCase()) ||
    log.level.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Title & Edge B.R.O. Style DEBUG VIEW Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-50 leading-none flex items-center gap-2">
            <span>{t('systemLogsTitle')}</span>
          </h2>
          <p className="text-xs text-zinc-450 mt-2">{t('systemLogsSub')}</p>
        </div>

        {/* Edge B.R.O. Style DEBUG VIEW Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchLogs}
            className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer outline-none transition-all"
            title="Refresh logs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="flex items-center gap-2.5 bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800/80 shadow-inner">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {t('debugViewLabel')}
            </span>
            <button
              type="button"
              onClick={() => setDebugView(!debugView)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                debugView ? 'bg-indigo-600' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  debugView ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchLogsPlaceholder')}
          className="w-full bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-indigo-500/50 transition-all font-mono"
        />
      </div>

      {/* Primary View: Audit Logs (When DEBUG VIEW is OFF) */}
      {!debugView && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner max-w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/20 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  <th className="px-6 py-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="px-6 py-3.5 whitespace-nowrap">User</th>
                  <th className="px-6 py-3.5 whitespace-nowrap">Action</th>
                  <th className="px-6 py-3.5">Details</th>
                  <th className="px-6 py-3.5 text-right whitespace-nowrap">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic text-xs">
                      {loading ? 'Fetching audit logs...' : 'No audit records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/20 text-zinc-300 text-xs transition-colors">
                      <td className="px-6 py-4 font-mono text-zinc-450 whitespace-nowrap text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-200 whitespace-nowrap">{log.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-mono text-[11px] max-w-md break-all leading-relaxed">
                        {log.details || '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-450 text-right whitespace-nowrap">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Secondary View: System Debug Logs (When DEBUG VIEW is ON) */}
      {debugView && (
        <div className="relative border border-zinc-800 rounded-2xl overflow-hidden shadow-inner flex flex-col bg-zinc-950 h-[500px]">
          <div className="bg-zinc-900/60 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            <span className="flex items-center gap-2">
              <Terminal size={13} className="text-indigo-400" />
              <span>Real-time Daemon Debug Stream</span>
            </span>
            <span>{filteredDebugLogs.length} events</span>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1.5 select-text">
            {filteredDebugLogs.length === 0 ? (
              <div className="text-zinc-650 italic text-center py-16">
                {loading ? 'Connecting to log stream...' : 'No system debug logs found matching your filter.'}
              </div>
            ) : (
              filteredDebugLogs.map((log) => (
                <div key={log.id} className="flex gap-2.5 items-start">
                  <span className="text-zinc-600 shrink-0 font-mono">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                  <span className={`shrink-0 font-bold ${getLogLevelColor(log.level)}`}>[{log.level}]</span>
                  <span className="text-zinc-300 break-all leading-normal">{log.message}</span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
