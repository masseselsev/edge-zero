import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import LanguageSelector from './LanguageSelector';
import { Sun, Moon, Eye, User, ArrowDown, ArrowUp } from 'lucide-react';

interface BandwidthInfo {
  cpu_utilization: number;
  ram_utilization: number;
  rx_speed: number;
  tx_speed: number;
  rx_percent: number;
  tx_percent: number;
}

export default function Header() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const [metrics, setMetrics] = useState<BandwidthInfo>({
    cpu_utilization: 0,
    ram_utilization: 0,
    rx_speed: 0,
    tx_speed: 0,
    rx_percent: 0,
    tx_percent: 0
  });

  // Toggle Theme
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Sync theme class on load
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  // Poll system diagnostics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/system/bandwidth');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Failed to fetch diagnostics:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  };

  const getMetricColor = (val: number) => {
    if (val > 80) return 'text-rose-450';
    if (val > 50) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <header className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/80 z-30 px-6 py-2.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand logo & version badge */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-650/10 border border-indigo-500/20 rounded-xl text-indigo-400 flex items-center justify-center">
            <Eye size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-widest text-zinc-200 uppercase">edge.OVERWATCH</span>
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider">v1.0.0</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
              Edge Provisioning & Orchestrator
            </div>
          </div>
        </div>

        {/* Center: System Performance Metrics tag bar */}
        <div className="flex items-center gap-3.5 bg-zinc-950 px-4 py-1.8 rounded-xl border border-zinc-800/80 text-[10px] font-bold text-zinc-400">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">CPU</span>
            <span className={`font-mono ${getMetricColor(metrics.cpu_utilization)}`}>
              {metrics.cpu_utilization.toFixed(0)}%
            </span>
          </div>

          <span className="text-zinc-850">|</span>

          <div className="flex items-center gap-1">
            <span className="text-zinc-500">RAM</span>
            <span className={`font-mono ${getMetricColor(metrics.ram_utilization)}`}>
              {metrics.ram_utilization.toFixed(0)}%
            </span>
          </div>

          <span className="text-zinc-850">|</span>

          <div className="flex items-center gap-1.5">
            <ArrowDown size={11} className="text-zinc-500" />
            <span className="text-zinc-500">RX</span>
            <span className={`font-mono ${getMetricColor(metrics.rx_percent)}`}>
              {formatSpeed(metrics.rx_speed)} <span className="text-[9px] opacity-75 font-normal">({metrics.rx_percent.toFixed(1)}%)</span>
            </span>
          </div>

          <span className="text-zinc-850">|</span>

          <div className="flex items-center gap-1.5">
            <ArrowUp size={11} className="text-zinc-500" />
            <span className="text-zinc-500">TX</span>
            <span className={`font-mono ${getMetricColor(metrics.tx_percent)}`}>
              {formatSpeed(metrics.tx_speed)} <span className="text-[9px] opacity-75 font-normal font-sans">({metrics.tx_percent.toFixed(1)}%)</span>
            </span>
          </div>
        </div>

        {/* Right: Controllers */}
        <div className="flex items-center gap-3">
          {/* User profile dropdown button */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-bold cursor-pointer transition-all outline-none"
          >
            <User size={13} className="text-zinc-500" />
            <span>Administrator</span>
          </button>

          <LanguageSelector />
          <button
            onClick={toggleTheme}
            className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center justify-center outline-none"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>
    </header>
  );
}
