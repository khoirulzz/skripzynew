'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFeatureOnboarding } from '@/hooks/useFeatureOnboarding';
import { onboardingData } from '@/lib/onboardingData';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export default function FeatureOnboardingModal({ featureId }) {
  const { showModal, dismissModal, isReady } = useFeatureOnboarding(featureId);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const steps = onboardingData[featureId] || [];
  const hasSteps = steps.length > 0;

  useEffect(() => {
    if (showModal && hasSteps) {
      // Delay slightly for smooth entrance animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showModal, hasSteps]);

  if (!isReady || !showModal || !hasSteps) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissModal();
    }, 300); // Wait for exit animation
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

  const modalContent = (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={handleClose}
    >
      <div 
        className={`relative overflow-hidden max-w-[460px] w-full transition-all duration-400 transform ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}
        style={{ 
          background: "linear-gradient(135deg, color-mix(in srgb, var(--surface, #ffffff) 95%, transparent), color-mix(in srgb, var(--background, #f8fafc) 85%, transparent))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid color-mix(in srgb, var(--primary, #4f46e5) 20%, transparent)",
          borderRadius: "24px",
          boxShadow: "0 28px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
          color: "var(--text-main, #0f172a)",
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
              backgroundColor: "color-mix(in srgb, var(--primary, #4f46e5) 8%, transparent)",
              color: "var(--primary, #4f46e5)",
              boxShadow: "0 8px 24px color-mix(in srgb, var(--primary, #4f46e5) 12%, transparent)",
            }}
          >
            {currentData.icon}
          </div>
          
          <h3 style={{
            margin: 0,
            fontSize: "1.35rem",
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: "var(--text-main, #0f172a)",
            marginBottom: "0.75rem"
          }}>
            {currentData.title}
          </h3>
          
          <p style={{
            margin: 0,
            fontSize: "0.86rem",
            color: "var(--text-muted, #64748b)",
            lineHeight: 1.6,
          }}>
            {currentData.description}
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
                style={idx === currentStep ? { backgroundColor: 'var(--primary, #4f46e5)' } : {}}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            {currentStep > 0 ? (
              <button 
                onClick={handlePrev}
                className="flex items-center justify-center py-3 px-4 rounded-xl font-medium transition-colors flex-shrink-0"
                style={{ color: "var(--text-muted, #64748b)", backgroundColor: "color-mix(in srgb, var(--surface, #ffffff) 80%, transparent)" }}
              >
                <ChevronLeft size={20} className="mr-1" />
                Kembali
              </button>
            ) : (
              <button 
                onClick={handleClose}
                className="py-3 px-4 rounded-xl font-medium transition-colors flex-shrink-0"
                style={{ color: "var(--text-muted, #64748b)" }}
              >
                Skip Tour
              </button>
            )}

            <button 
              onClick={handleNext}
              className="flex-1 flex items-center justify-center py-3 px-6 rounded-xl font-semibold transition-all hover:-translate-y-0.5"
              style={{ 
                backgroundColor: "var(--primary, #4f46e5)", 
                color: "white",
                boxShadow: "0 8px 20px color-mix(in srgb, var(--primary, #4f46e5) 25%, transparent)"
              }}
            >
              {currentStep === steps.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
              {currentStep < steps.length - 1 && <ChevronRight size={20} className="ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
