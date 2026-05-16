'use client';

import { useState, useEffect } from 'react';
import DefaultSpinner from '../ui/DefaultSpinner';

/**
 * Animated Loading Screen dengan Rotating Labels
 * Menampilkan pesan yang berubah setiap 2-3 detik untuk menghindari bosan
 */
export default function AnimatedLoadingScreen({ 
  isLoading = true,
  apiAttempt = 'core',
  customLabels = null
}) {
  const [currentLabelIndex, setCurrentLabelIndex] = useState(0);

  const defaultLabels = [
    'sedang mencari topik penelitian relevan...',
    'mengumpulkan informasi dari berbagai sumber...',
    'menganalisis relevansi data...',
    'menyiapkan hasil pencarian...'
  ];

  const labels = customLabels || defaultLabels;

  // Rotate labels setiap 2.5 detik
  useEffect(() => {
    if (!isLoading) return undefined;

    const interval = setInterval(() => {
      setCurrentLabelIndex(prev => (prev + 1) % labels.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading, labels.length]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="animated-loading-overlay">
      <div className="loading-container glass-panel">
        <div className="spinner-wrapper">
          <DefaultSpinner size="large" />
        </div>

        <div className="label-container">
          <h3 className="loading-label">
            {labels[currentLabelIndex]}
          </h3>
        </div>

        <div className="api-status">
          <span className="api-badge">
            {apiAttempt === 'core' && '🔍 Core API'}
            {apiAttempt === 'openalex' && '🔗 OpenAlex'}
            {apiAttempt === 'unpaywall' && '📄 Unpaywall'}
            {apiAttempt === 'gemini' && '✨ Gemini AI'}
          </span>
        </div>

        <div className="progress-dots">
          <span className="dot dot-1"></span>
          <span className="dot dot-2"></span>
          <span className="dot dot-3"></span>
        </div>
      </div>

      <style jsx>{`
        .animated-loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(var(--background-rgb, 0), 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          backdrop-filter: blur(8px);
        }

        .loading-container {
          background: var(--surface);
          border-radius: 24px;
          padding: 3.5rem 2.5rem;
          box-shadow: var(--shadow-lg);
          text-align: center;
          max-width: 420px;
          width: 90%;
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid var(--border);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .spinner-wrapper {
          margin-bottom: 2.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          filter: drop-shadow(0 0 15px rgba(var(--primary-rgb), 0.3));
        }

        .label-container {
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1rem 0;
        }

        .loading-label {
          color: var(--text-main);
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
          animation: fadeInOut 2.5s ease-in-out infinite;
          line-height: 1.6;
          letter-spacing: -0.01em;
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateY(5px); }
          10%, 90% { opacity: 1; transform: translateY(0); }
        }

        .api-status {
          margin: 1.5rem 0;
        }

        .api-badge {
          display: inline-flex;
          align-items: center;
          background: var(--primary-light);
          color: var(--primary);
          padding: 0.5rem 1.25rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid rgba(var(--primary-rgb), 0.1);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .progress-dots {
          display: flex;
          justify-content: center;
          gap: 0.6rem;
          margin-top: 2rem;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          opacity: 0.3;
          animation: pulse 1.4s ease-in-out infinite;
        }

        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.2s; }
        .dot-3 { animation-delay: 0.4s; }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        @media (max-width: 640px) {
          .loading-container {
            padding: 2.5rem 1.5rem;
          }
          .loading-label {
            font-size: 1rem;
          }
          .spinner-wrapper {
            margin-bottom: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
