'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { X } from 'lucide-react';

const steps = [
  {
    title: 'Welcome to StatsZy',
    content: 'The browser-based statistical engine. Let\'s take a quick tour of how to analyze your data.',
    position: 'center'
  },
  {
    title: '1. Import Your Data',
    content: 'Use the File menu to import CSV or Excel dataset. We\'ll automatically detect the type of variables for you.',
    position: 'top-left' // near file menu
  },
  {
    title: '2. Setup Variables',
    content: 'Switch to Variable View at the bottom to control whether your variables are Numeric or String, and set their measurement levels (Nominal, Ordinal, Scale).',
    position: 'bottom-center'
  },
  {
    title: '3. Data Editor',
    content: 'The Data View provides a spreadsheet-like interface. You can manually edit cell values or add new cases here.',
    position: 'bottom-center'
  },
  {
    title: '4. Run Analysis',
    content: 'Open the Analyze menu to compute Descriptive Statistics, Correlations, and more. Hover over the options to see what they do.',
    position: 'top-left' // near analyze
  },
  {
    title: '5. Output Viewer',
    content: 'All your statistical outputs, tables, and interpretation details are piped here. You can clear them when you want to start fresh.',
    position: 'bottom-center'
  }
];

export function OnboardingOverlay() {
  const { showTutorial, tutorialStep, setShowTutorial, advanceTutorial } = useAppStore();

  if (!showTutorial) return null;

  const step = steps[tutorialStep];
  if (!step) {
    setShowTutorial(false);
    return null;
  }

  const isCenter = step.position === 'center';
  const isTopLeft = step.position === 'top-left';
  const isBottomCenter = step.position === 'bottom-center';

  return (
    <div className={`fixed inset-0 z-[100] ${isCenter ? 'bg-black/50 backdrop-blur-sm' : 'pointer-events-none'}`}>
      <div 
        className={`absolute pointer-events-auto bg-[#1C2128] border border-[#2D3139] rounded-xl shadow-2xl p-6 w-[340px] text-[#E2E8F0] transform transition-all duration-300 ease-in-out ${
          isCenter ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
          isTopLeft ? 'top-16 left-4' :
          isBottomCenter ? 'bottom-16 left-1/2 -translate-x-1/2' : ''
        }`}
      >
        <button 
          onClick={() => setShowTutorial(false)}
          className="absolute top-4 right-4 text-[#64748B] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-bold text-indigo-400 mb-2">{step.title}</h3>
        <p className="text-xs font-mono leading-relaxed text-[#94A3B8] mb-6">{step.content}</p>
        
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold text-[#64748B]">Step {tutorialStep + 1} of {steps.length}</span>
          <button 
            onClick={() => {
              if (tutorialStep === steps.length - 1) {
                setShowTutorial(false);
              } else {
                advanceTutorial();
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            {tutorialStep === steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
