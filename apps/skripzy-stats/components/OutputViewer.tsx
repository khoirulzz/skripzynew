'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Trash2, Sparkles, Loader2, Info } from 'lucide-react';
import { interpretWithAI } from '@/lib/ai-assistant';

export function OutputViewer() {
  const { outputs, clearOutputs, addOutput } = useAppStore();
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);

  const handleInterpretAI = async (output: any) => {
    if (!confirm("Fitur ini akan menggunakan 3 kredit Anda. Lanjutkan?")) return;
    
    setLoadingAiId(output.id);
    try {
      const interpretation = await interpretWithAI(output);
      // Append interpretation to the output viewer as a new text block
      addOutput({
        id: `ai_${Date.now()}`,
        type: 'text',
        title: `Interpretasi AI: ${output.title}`,
        content: interpretation,
        timestamp: Date.now()
      });
      // Scroll to bottom
      setTimeout(() => {
        const viewer = document.getElementById('output-scroll-container');
        if (viewer) viewer.scrollTop = viewer.scrollHeight;
      }, 100);
    } catch (e: any) {
      alert("Gagal memproses AI: " + e.message);
    } finally {
      setLoadingAiId(null);
    }
  };

  if (outputs.length === 0) {
    return (
      <div className="flex flex-col bg-slate-50 h-full w-full items-center justify-center text-slate-500 p-6 text-center">
        <Info className="w-10 h-10 mb-4 text-slate-300" />
        <p className="font-medium text-sm sm:text-base">Belum ada output analisis.</p>
        <p className="text-xs sm:text-sm mt-1 text-slate-400">Jalankan analisis melalui menu <b>Analisis</b> di atas untuk melihat hasilnya di sini.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white pt-2 sm:pt-4">
      <div className="flex justify-between sm:justify-end items-center px-4 sm:px-6 pb-3 sm:pb-4 border-b border-slate-200">
        <h2 className="sm:hidden font-bold text-slate-700">Hasil Analisis</h2>
        <button
          onClick={clearOutputs}
          className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs sm:text-sm font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-colors uppercase tracking-wider shadow-sm"
        >
          <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Hapus Semua Output</span><span className="sm:hidden">Hapus</span>
        </button>
      </div>
      
      <div id="output-scroll-container" className="flex-1 overflow-auto p-3 sm:p-6 space-y-6 sm:space-y-8 bg-slate-50/50">
        {outputs.map((output) => (
          <div key={output.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 relative group overflow-hidden">
            {output.id.startsWith('ai_') && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-800 leading-tight">
                {output.id.startsWith('ai_') ? <Sparkles className="text-indigo-500 w-5 h-5" /> : <span className="text-indigo-500 w-5 h-5 flex items-center justify-center bg-indigo-50 rounded-full text-xs">⚡</span>} 
                {output.title}
              </h3>
              
              {output.type === 'table' && (
                <button
                  onClick={() => handleInterpretAI(output)}
                  disabled={loadingAiId === output.id}
                  className="shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                >
                  {loadingAiId === output.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sedang Menganalisis...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Interpretasikan AI (3 Kredit)</>
                  )}
                </button>
              )}
            </div>
            
            {output.type === 'table' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-xs sm:text-sm font-sans border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      {output.content.columns.map((col: string) => (
                        <th key={col} className="border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 font-bold text-left text-slate-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {output.content.data.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        {output.content.columns.map((col: string) => {
                          const val = row[col];
                          // format numbers nicely
                          const displayVal = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(4)) : val;
                          return (
                            <td key={col} className="px-3 sm:px-4 py-2 sm:py-2.5 text-slate-700 whitespace-nowrap">
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {output.type === 'text' && (
              <div className="text-sm bg-indigo-50/30 text-slate-700 p-4 sm:p-5 rounded-xl border border-indigo-100/50 leading-relaxed prose prose-sm max-w-none">
                {output.content.split('\n').map((line: string, i: number) => {
                  // Basic markdown bold support for AI text
                  if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <p key={i} className="mb-2 last:mb-0">
                        {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-slate-900">{part}</strong> : part)}
                      </p>
                    );
                  }
                  return <p key={i} className="mb-2 last:mb-0">{line}</p>;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
