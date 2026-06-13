'use client';

import React, { useEffect, useState } from 'react';
import { TopMenuBar } from '@/components/TopMenuBar';
import { DataView } from '@/components/DataView';
import { VariableView } from '@/components/VariableView';
import { OutputViewer } from '@/components/OutputViewer';
import { OnboardingOverlay } from '@/components/OnboardingOverlay';
import { useAppStore } from '@/lib/store';
import { Database, ListTree, PieChart, Loader2 } from 'lucide-react';
import { getCookie } from '@/lib/api';

import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function App() {
  const { activeTab, setActiveTab } = useAppStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Auth guard: redirect to app-main form-redirect (which handles Firebase token sync)
  useEffect(() => {
    const token = getCookie("skripzy_token");
    if (!token) {
      // Redirect ke statszy-redirect di app-main yang akan sync token lalu redirect kembali
      window.location.href = "https://app.skripzy.id/dashboard/tools/statszy-redirect";
      return;
    }
    setIsAuthenticated(true);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner sizePixel={32} className="text-indigo-600" />
          <p className="text-slate-500 font-medium animate-pulse">Memverifikasi akun...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <OnboardingOverlay />
      <TopMenuBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Workspace */}
        <main className="flex-1 flex flex-col min-w-0 p-2 sm:p-4 pb-16 sm:pb-4">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col relative z-0">
            {activeTab === 'data' && <DataView />}
            {activeTab === 'variable' && <VariableView />}
            {activeTab === 'output' && <OutputViewer />}
          </div>
        </main>
      </div>

      {/* Status Bar / Tab Switcher (SPSS-like bottom bar) */}
      <footer className="absolute sm:relative bottom-0 left-0 right-0 h-14 sm:h-12 bg-white border-t border-slate-200 flex items-center shrink-0 z-10 sm:justify-start justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:shadow-none">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex flex-col sm:flex-row items-center justify-center h-full gap-1 sm:gap-2 w-full sm:w-auto px-2 sm:px-6 py-2 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold sm:border-r border-slate-200 transition-colors ${activeTab === 'data' ? 'text-indigo-600 sm:border-t-2 border-t-indigo-500 bg-indigo-50/50' : 'text-slate-500 hover:text-indigo-500 sm:border-t-2 border-t-transparent hover:bg-slate-50'}`}
        >
          <Database className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Data View</span><span className="sm:hidden">Data</span>
        </button>
        <button
          onClick={() => setActiveTab('variable')}
          className={`flex flex-col sm:flex-row items-center justify-center h-full gap-1 sm:gap-2 w-full sm:w-auto px-2 sm:px-6 py-2 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold sm:border-r border-slate-200 transition-colors ${activeTab === 'variable' ? 'text-indigo-600 sm:border-t-2 border-t-indigo-500 bg-indigo-50/50' : 'text-slate-500 hover:text-indigo-500 sm:border-t-2 border-t-transparent hover:bg-slate-50'}`}
        >
          <ListTree className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Variable View</span><span className="sm:hidden">Variabel</span>
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`flex flex-col sm:flex-row items-center justify-center h-full gap-1 sm:gap-2 w-full sm:w-auto px-2 sm:px-6 py-2 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold sm:border-r border-slate-200 transition-colors ${activeTab === 'output' ? 'text-indigo-600 sm:border-t-2 border-t-indigo-500 bg-indigo-50/50' : 'text-slate-500 hover:text-indigo-500 sm:border-t-2 border-t-transparent hover:bg-slate-50'}`}
        >
          <PieChart className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Output Viewer</span><span className="sm:hidden">Output</span>
        </button>
      </footer>
    </div>
  );
}
