'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { X, ChevronRight, ChevronLeft, Database, ListTree, PieChart, Activity, FileSpreadsheet } from 'lucide-react';

const steps = [
  {
    title: 'Welcome to StatsZy',
    content: 'The browser-based statistical engine. Mari kita mulai tur singkat tentang cara menganalisis data Anda.',
    icon: <Activity size={32} />
  },
  {
    title: '1. Import Your Data',
    content: 'Gunakan menu File untuk mengimpor dataset CSV atau Excel. Kami akan mendeteksi jenis variabel secara otomatis untuk Anda.',
    icon: <FileSpreadsheet size={32} />
  },
  {
    title: '2. Setup Variables',
    content: 'Beralih ke Variable View di bagian bawah untuk mengatur apakah variabel Anda berupa Numeric atau String, dan atur level pengukurannya (Nominal, Ordinal, Scale).',
    icon: <ListTree size={32} />
  },
  {
    title: '3. Data Editor',
    content: 'Data View menyediakan antarmuka seperti spreadsheet. Anda dapat mengedit nilai sel secara manual atau menambahkan kasus baru di sini.',
    icon: <Database size={32} />
  },
  {
    title: '4. Run Analysis',
    content: 'Buka menu Analyze untuk menghitung Statistik Deskriptif, Korelasi, dan lainnya. Hasilnya akan langsung diproses oleh browser Anda.',
    icon: <Activity size={32} />
  },
  {
    title: '5. Output Viewer',
    content: 'Semua output statistik, tabel, dan detail interpretasi akan muncul di sini. Anda juga dapat menggunakan asisten AI untuk membantu interpretasi data Anda.',
    icon: <PieChart size={32} />
  }
];

export function OnboardingOverlay() {
  const { showTutorial, setShowTutorial } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (showTutorial) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showTutorial]);

  if (!showTutorial) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShowTutorial(false);
    }, 300);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const currentData = steps[currentStep];

  return (
    <div 
      className={`transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(15, 23, 42, 0.4)', 
        backdropFilter: 'blur(16px)', 
        WebkitBackdropFilter: 'blur(16px)',
        pointerEvents: 'auto'
      }}
      onClick={handleClose}
    >
      <div 
        className={`relative overflow-hidden max-w-[460px] w-full transition-all duration-400 transform ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}
        style={{ 
          background: "linear-gradient(135deg, color-mix(in srgb, #ffffff 95%, transparent), color-mix(in srgb, #f8fafc 85%, transparent))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid color-mix(in srgb, #4f46e5 20%, transparent)",
          borderRadius: "24px",
          boxShadow: "0 28px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
          color: "#0f172a",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Close Button */}
        <div className="flex justify-end p-4 absolute top-0 right-0 w-full z-10">
          <button 
            onClick={handleClose}
            className="p-2 bg-slate-100/50 hover:bg-slate-200/80 rounded-full transition-colors text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className={`p-8 pt-12 pb-6 flex flex-col items-center text-center transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div 
            className="mb-6 flex items-center justify-center"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "color-mix(in srgb, #4f46e5 8%, transparent)",
              color: "#4f46e5",
              boxShadow: "0 8px 24px color-mix(in srgb, #4f46e5 12%, transparent)",
            }}
          >
            {currentData.icon}
          </div>
          
          <h3 style={{
            margin: 0,
            fontSize: "1.35rem",
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: "#0f172a",
            marginBottom: "0.75rem"
          }}>
            {currentData.title}
          </h3>
          
          <p style={{
            margin: 0,
            fontSize: "0.86rem",
            color: "#64748b",
            lineHeight: 1.6,
          }}>
            {currentData.content}
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="px-8 pb-8 pt-2">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6' : 'w-2 bg-slate-200'}`}
                style={idx === currentStep ? { backgroundColor: '#4f46e5' } : {}}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            gap: "0.85rem",
            justifyContent: "center",
            width: "100%",
            marginTop: "0.5rem",
          }}>
            {currentStep > 0 ? (
              <button 
                onClick={handlePrev}
                style={{
                  flex: 1,
                  padding: "0.75rem 1.2rem",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem"
                }}
              >
                <ChevronLeft size={16} />
                Kembali
              </button>
            ) : (
              <button 
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: "0.75rem 1.2rem",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  transition: "all 0.2s",
                }}
              >
                Skip Tour
              </button>
            )}

            <button 
              onClick={handleNext}
              style={{
                flex: 1,
                padding: "0.75rem 1.2rem",
                fontSize: "0.82rem",
                fontWeight: 500,
                borderRadius: "12px",
                border: "1px solid transparent",
                backgroundColor: "#4f46e5",
                color: "white",
                boxShadow: "0 8px 20px rgba(79,70,229,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                transition: "all 0.2s",
              }}
            >
              {currentStep === steps.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
              {currentStep < steps.length - 1 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
