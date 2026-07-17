import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col transition-colors duration-200">
      {/* Header handles double-row identity and navigation */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div key={activeTab} className="animate-tab-in">
          {children}
        </div>
      </main>
    </div>
  );
}
