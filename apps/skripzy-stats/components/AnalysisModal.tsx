'use client';

import React, { useState } from 'react';
import { useAppStore, Variable } from '@/lib/store';
import { runTTest, runANOVA, runLinearRegression, runReliability } from '@/lib/stats-engine';
import { X, Activity, ChevronRight, Info } from 'lucide-react';

type AnalysisType = 'ttest' | 'anova' | 'regression' | 'reliability' | null;

interface AnalysisModalProps {
  type: AnalysisType;
  onClose: () => void;
}

export function AnalysisModal({ type, onClose }: AnalysisModalProps) {
  const { dataset, variables, addOutput } = useAppStore();
  
  const [dependent, setDependent] = useState('');
  const [independent, setIndependent] = useState('');
  const [multiVars, setMultiVars] = useState<string[]>([]);

  if (!type) return null;

  const numericVars = variables.filter(v => v.type === 'Numeric');
  const categoricalVars = variables.filter(v => v.type === 'String' || v.measure === 'Nominal');

  const handleRun = () => {
    try {
      let output;
      if (type === 'ttest') {
        if (!dependent || !independent) throw new Error("Pilih variabel numerik dan grup");
        output = runTTest(dataset, dependent, independent);
      } else if (type === 'anova') {
        if (!dependent || !independent) throw new Error("Pilih variabel numerik dan grup");
        output = runANOVA(dataset, dependent, independent);
      } else if (type === 'regression') {
        if (!dependent || !independent) throw new Error("Pilih variabel Y dan X");
        output = runLinearRegression(dataset, dependent, independent);
      } else if (type === 'reliability') {
        if (multiVars.length < 2) throw new Error("Pilih minimal 2 variabel");
        output = runReliability(dataset, multiVars);
      }
      
      if (output) {
        addOutput({
          ...output,
          id: `out_${Date.now()}`,
          timestamp: Date.now()
        });
        onClose();
      }
    } catch (err: any) {
      alert("Gagal menjalankan analisis: " + err.message);
    }
  };

  const title = {
    ttest: 'Uji T (T-Test)',
    anova: 'One-Way ANOVA',
    regression: 'Regresi Linier',
    reliability: 'Uji Reliabilitas (Cronbach Alpha)'
  }[type];

  const toggleMultiVar = (name: string) => {
    setMultiVars(prev => 
      prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-indigo-600">
            <Activity className="w-5 h-5" />
            <h3 className="font-bold text-slate-800">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          {(type === 'ttest' || type === 'anova') && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Variabel Dependen (Numerik)</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                  value={dependent}
                  onChange={e => setDependent(e.target.value)}
                >
                  <option value="">-- Pilih Variabel --</option>
                  {numericVars.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Variabel Pengelompokan (Kategorikal)</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                  value={independent}
                  onChange={e => setIndependent(e.target.value)}
                >
                  <option value="">-- Pilih Variabel --</option>
                  {variables.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
            </>
          )}

          {type === 'regression' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Variabel Terikat / Y (Numerik)</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                  value={dependent}
                  onChange={e => setDependent(e.target.value)}
                >
                  <option value="">-- Pilih Variabel --</option>
                  {numericVars.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Variabel Bebas / X (Numerik)</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                  value={independent}
                  onChange={e => setIndependent(e.target.value)}
                >
                  <option value="">-- Pilih Variabel --</option>
                  {numericVars.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
            </>
          )}

          {type === 'reliability' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pilih Item (Minimal 2)</label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-1">
                {numericVars.map(v => (
                  <label key={v.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      checked={multiVars.includes(v.name)}
                      onChange={() => toggleMultiVar(v.name)}
                    />
                    <span className="text-sm font-medium text-slate-700">{v.name}</span>
                  </label>
                ))}
                {numericVars.length === 0 && <p className="text-sm text-slate-500 p-2 text-center">Tidak ada variabel numerik.</p>}
              </div>
            </div>
          )}

          {type && (
            <div className="flex gap-2.5 bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-xl text-xs sm:text-sm">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5 text-blue-900">Catatan Asumsi Statistik:</span>
                {(type === 'ttest' || type === 'anova') && (
                  <span>Pastikan data Anda terdistribusi normal dan memiliki varians yang homogen.</span>
                )}
                {type === 'regression' && (
                  <span>Pastikan hubungan variabel bersifat linier dan data bebas dari outlier ekstrem.</span>
                )}
                {type === 'reliability' && (
                  <span>Pastikan semua item yang dipilih mengukur konstruk yang sama (unidimensional).</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleRun}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center gap-2"
          >
            Jalankan <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
