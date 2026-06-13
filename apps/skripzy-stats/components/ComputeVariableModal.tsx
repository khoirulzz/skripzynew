'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { X, Calculator, Plus, Divide } from 'lucide-react';

interface ComputeVariableModalProps {
  onClose: () => void;
}

export function ComputeVariableModal({ onClose }: ComputeVariableModalProps) {
  const { variables, addComputedVariable } = useAppStore();
  const [name, setName] = useState('');
  const [operation, setOperation] = useState<'sum' | 'average'>('sum');
  const [selectedVars, setSelectedVars] = useState<string[]>([]);

  const numericVars = variables.filter(v => v.type === 'Numeric');

  const handleRun = () => {
    if (!name.trim()) {
      alert("Nama variabel tujuan tidak boleh kosong");
      return;
    }
    if (selectedVars.length === 0) {
      alert("Pilih setidaknya satu variabel untuk dihitung");
      return;
    }
    addComputedVariable(name, operation, selectedVars);
    onClose();
  };

  const toggleVar = (vName: string) => {
    setSelectedVars(prev => 
      prev.includes(vName) ? prev.filter(v => v !== vName) : [...prev, vName]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-indigo-600">
            <Calculator className="w-5 h-5" />
            <h3 className="font-bold text-slate-800">Compute Variable</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Variabel Baru</label>
            <input 
              type="text"
              placeholder="Contoh: Total_Skor"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Operasi Perhitungan</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl cursor-pointer transition-all ${operation === 'sum' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input type="radio" className="hidden" checked={operation === 'sum'} onChange={() => setOperation('sum')} />
                <Plus className="w-4 h-4" /> Jumlah (Sum)
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl cursor-pointer transition-all ${operation === 'average' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input type="radio" className="hidden" checked={operation === 'average'} onChange={() => setOperation('average')} />
                <Divide className="w-4 h-4" /> Rata-rata (Avg)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Variabel Sumber Numerik</label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-1">
              {numericVars.map(v => (
                <label key={v.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    checked={selectedVars.includes(v.name)}
                    onChange={() => toggleVar(v.name)}
                  />
                  <span className="text-sm font-medium text-slate-700">{v.name}</span>
                </label>
              ))}
              {numericVars.length === 0 && <p className="text-sm text-slate-500 p-2 text-center">Tidak ada variabel numerik.</p>}
            </div>
          </div>
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
            <Calculator className="w-4 h-4" /> Hitung Variabel
          </button>
        </div>
      </div>
    </div>
  );
}
