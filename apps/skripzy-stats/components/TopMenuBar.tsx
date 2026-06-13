'use client';

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAppStore, Variable } from '@/lib/store';
import { runDescriptives, runPearsonCorrelation } from '@/lib/stats-engine';
import { Tooltip } from '@/components/Tooltip';
import { ChevronDown, FileSpreadsheet, Activity, LogOut, Info } from 'lucide-react';
import { getCookie } from '@/lib/api';
import { AnalysisModal } from './AnalysisModal';
import { ComputeVariableModal } from './ComputeVariableModal';

export function TopMenuBar() {
  const { dataset, variables, setDataset, setVariables, addOutput } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'ttest' | 'anova' | 'regression' | 'reliability' | null>(null);
  const [showComputeModal, setShowComputeModal] = useState(false);

  const handleExportCSV = () => {
    if (dataset.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }
    const csv = Papa.unparse(dataset);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dataset_skripzy_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActiveMenu(null);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          importData(results.data);
        }
      });
    } else if (file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        importData(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  const importData = (data: any[]) => {
    if (!data || data.length === 0) return;
    
    // Convert first row keys to variables
    const keys = Object.keys(data[0]);
    const newVars: Variable[] = keys.map((key, idx) => {
      // detect type
      const isNumeric = typeof data[0][key] === 'number';
      return {
        id: `var_${Date.now()}_${idx}`,
        name: key,
        label: key,
        type: isNumeric ? 'Numeric' : 'String',
        measure: isNumeric ? 'Scale' : 'Nominal'
      };
    });

    setVariables(newVars);
    setDataset(data);
    setActiveMenu(null);
  };

  const executeDescriptives = () => {
    try {
      const numericVars = variables.filter(v => v.type === 'Numeric').map(v => v.name);
      if (numericVars.length === 0) {
        alert("Pilih setidaknya satu variabel numerik untuk statistik deskriptif.");
        return;
      }
      const output = runDescriptives(dataset, numericVars);
      addOutput({
        ...output,
        id: `out_${Date.now()}`,
        timestamp: Date.now()
      });
    } catch (e: any) {
      alert("Gagal menghitung statistik deskriptif: " + e.message);
    }
    setActiveMenu(null);
  };

  const executeCorrelation = () => {
    try {
      const numericVars = variables.filter(v => v.type === 'Numeric').map(v => v.name);
      if (numericVars.length < 2) {
        alert("Dibutuhkan setidaknya 2 variabel numerik untuk uji korelasi.");
        return;
      }
      // Demo: Just correlating the first two numeric variables found
      const output = runPearsonCorrelation(dataset, numericVars[0], numericVars[1]);
      addOutput({
        ...output,
        id: `out_${Date.now()}`,
        timestamp: Date.now()
      });
    } catch (e: any) {
      alert("Gagal menghitung korelasi: " + e.message);
    }
    setActiveMenu(null);
  };

  const handleLogout = () => {
    document.cookie = "skripzy_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "https://app.skripzy.id/login";
  };

  return (
    <div className="h-16 sm:h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm relative z-20">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <a href="https://app.skripzy.id/dashboard" className="shrink-0 transition-transform hover:scale-105">
          <img src="https://app.skripzy.id/logo-skripzy.webp" alt="Skripzy" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl shadow-sm" />
        </a>
        <h1 className="text-lg sm:text-xl font-bold font-display text-slate-800 tracking-tight flex items-center">
          StatsZy <span className="hidden sm:inline-block px-2 py-0.5 ml-3 text-[10px] bg-indigo-50 text-indigo-600 rounded-full font-bold uppercase tracking-wider border border-indigo-100">Beta</span>
        </h1>
      </div>
      
      <div className="flex items-center space-x-1 sm:space-x-3">
        <div className="relative">
          <button 
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold transition-colors uppercase tracking-wider rounded-xl ${activeMenu === 'file' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Berkas</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {activeMenu === 'file' && (
            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl py-2 rounded-xl z-50">
              <div className="px-4 pb-2 mb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format Data</span>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Pastikan baris pertama berisi <b>Nama Variabel</b> (contoh: Gender, Skor) dan baris selanjutnya adalah data murni. Kami akan otomatis mendeteksi tipe data.</p>
              </div>
              <button 
                className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between"
                onClick={() => { fileInputRef.current?.click(); }}
              >
                Impor Data (CSV/XLSX)
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between"
                onClick={handleExportCSV}
              >
                Ekspor Dataset (CSV)
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button 
                className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between"
                onClick={() => { setActiveMenu(null); setShowComputeModal(true); }}
              >
                Compute Variable (Hitung)
              </button>
              {/* hidden upload input */}
              <input 
                type="file" 
                accept=".csv,.xlsx"
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleImportCSV} 
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold transition-colors uppercase tracking-wider rounded-xl ${activeMenu === 'analyze' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            onClick={() => setActiveMenu(activeMenu === 'analyze' ? null : 'analyze')}
          >
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Analisis</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {activeMenu === 'analyze' && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl py-2 rounded-xl z-50">
              <div className="px-3 pb-2 mb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statistik Dasar</span>
              </div>
              <Tooltip content="Menghitung rata-rata, standar deviasi, varians, skewness, dan kurtosis." position="right">
                <button 
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between group"
                  onClick={executeDescriptives}
                >
                  Statistik Deskriptif
                </button>
              </Tooltip>
              <Tooltip content="Mengukur hubungan linier antar variabel (Pearson r). Mengidentifikasi kekuatan dan arah hubungan." position="right">
                <button 
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between group"
                  onClick={executeCorrelation}
                >
                  Uji Korelasi
                </button>
              </Tooltip>
              <div className="px-3 pt-3 pb-2 mb-2 mt-2 border-y border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lanjutan</span>
              </div>
              <Tooltip content="Uji T Independen untuk membandingkan rata-rata 2 kelompok." position="right">
                <button 
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between group"
                  onClick={() => { setActiveMenu(null); setModalType('ttest'); }}
                >
                  Uji T Independen
                </button>
              </Tooltip>
              <Tooltip content="One-Way ANOVA untuk membandingkan rata-rata lebih dari 2 kelompok." position="right">
                <button 
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between group"
                  onClick={() => { setActiveMenu(null); setModalType('anova'); }}
                >
                  One-Way ANOVA
                </button>
              </Tooltip>
              <Tooltip content="Analisis Regresi Linier untuk memprediksi nilai variabel dependen." position="right">
                <button 
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between group"
                  onClick={() => { setActiveMenu(null); setModalType('regression'); }}
                >
                  Regresi Linier
                </button>
              </Tooltip>
              <Tooltip content="Uji Validitas dan Reliabilitas (Cronbach Alpha)." position="right">
                <button 
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors flex items-center justify-between group"
                  onClick={() => { setActiveMenu(null); setModalType('reliability'); }}
                >
                  Validitas & Reliabilitas
                </button>
              </Tooltip>
            </div>
          )}
        </div>
        
        <div className="w-px h-6 bg-slate-200 hidden sm:block mx-1"></div>
        
        <button 
          onClick={handleLogout}
          className="p-2 sm:px-3 sm:py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
          title="Keluar"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline text-sm font-semibold">Keluar</span>
        </button>

      </div>
      <AnalysisModal type={modalType} onClose={() => setModalType(null)} />
      {showComputeModal && <ComputeVariableModal onClose={() => setShowComputeModal(false)} />}
    </div>
  );
}
