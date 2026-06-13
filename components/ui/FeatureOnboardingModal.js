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

  const modalContent = (
    <div 
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
        pointerEvents: 'auto',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 300ms ease-in-out'
      }}
      onClick={handleClose}
    >
      <div 
        style={{ 
          position: 'relative',
          overflow: 'hidden',
          maxWidth: '460px',
          width: '100%',
          transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(2rem) scale(0.95)',
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', position: 'absolute', top: 0, right: 0, width: '100%', zIndex: 10, boxSizing: 'border-box' }}>
          <button 
            onClick={handleClose}
            style={{ 
              padding: '0.5rem', 
              backgroundColor: 'rgba(241, 245, 249, 0.5)', 
              borderRadius: '9999px', 
              color: '#64748b', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(226, 232, 240, 0.8)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.5)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ 
          padding: '3rem 2rem 1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center', 
          transition: 'opacity 200ms ease-in-out', 
          opacity: isAnimating ? 0 : 1 
        }}>
          <div 
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
            {currentData.description}
          </p>
        </div>

        {/* Footer Navigation */}
        <div style={{ padding: '0.5rem 2rem 2rem' }}>
          {/* Progress Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                style={{
                  height: '8px',
                  borderRadius: '9999px',
                  transition: 'all 300ms ease-in-out',
                  width: idx === currentStep ? '24px' : '8px',
                  backgroundColor: idx === currentStep ? '#4f46e5' : '#e2e8f0'
                }}
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
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
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
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
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
                fontSize: "0.85rem",
                fontWeight: 600,
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
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#4338ca';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#4f46e5';
                e.currentTarget.style.transform = 'translateY(0)';
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
