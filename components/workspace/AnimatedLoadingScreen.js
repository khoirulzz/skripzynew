'use client';

import { useState, useEffect } from 'react';

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
  const [isVisible, setIsVisible] = useState(true);

  const defaultLabels = [
    'sedang mencari topik penelitian relevan...',
    'mengumpulkan informasi dari berbagai sumber...',
    'menganalisis relevansi data...',
    'menyiapkan hasil pencarian...'
  ];

  const labels = customLabels || defaultLabels;

  // Rotate labels setiap 2.5 detik
  useEffect(() => {
    if (!isLoading) {
      setIsVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCurrentLabelIndex(prev => (prev + 1) % labels.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading, labels.length]);

  if (!isLoading && !isVisible) {
    return null;
  }

  return (
    <div className="animated-loading-overlay">
      <div className="loading-container">
        {/* Spinner dengan animasi pulsing */}
        <div className="spinner-wrapper">
          <div className="spinner">
            <div className="spinner-circle"></div>
          </div>
        </div>

        {/* Main label dengan fade transition */}
        <div className="label-container">
          <h3 className="loading-label">
            {labels[currentLabelIndex]}
          </h3>
        </div>

        {/* API Status Badge */}
        <div className="api-status">
          <span className="api-badge">
            {apiAttempt === 'core' && '🔍 Core API'}
            {apiAttempt === 'openalex' && '🔗 OpenAlex'}
            {apiAttempt === 'unpaywall' && '📄 Unpaywall'}
          </span>
        </div>

        {/* Progress indicator (animating dots) */}
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
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .loading-container {
          background: white;
          border-radius: 16px;
          padding: 3rem 2.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          text-align: center;
          max-width: 400px;
          width: 90%;
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Spinner */
        .spinner-wrapper {
          margin-bottom: 2rem;
          height: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .spinner {
          position: relative;
          width: 60px;
          height: 60px;
        }

        .spinner-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 4px solid #f0f0f0;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Label container dengan fade transition */
        .label-container {
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1.5rem 0;
        }

        .loading-label {
          color: #1f2937;
          font-size: 1rem;
          font-weight: 500;
          margin: 0;
          animation: fadeInOut 2.5s ease-in-out infinite;
          line-height: 1.6;
        }

        @keyframes fadeInOut {
          0% {
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        /* API Status Badge */
        .api-status {
          margin: 1.5rem 0;
        }

        .api-badge {
          display: inline-block;
          background: #f3f4f6;
          color: #6b7280;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          border: 1px solid #e5e7eb;
        }

        /* Progress dots */
        .progress-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d1d5db;
          animation: pulse 1.4s ease-in-out infinite;
        }

        .dot-1 {
          animation-delay: 0s;
        }

        .dot-2 {
          animation-delay: 0.2s;
        }

        .dot-3 {
          animation-delay: 0.4s;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .loading-container {
            background: #1f2937;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          }

          .spinner-circle {
            border-color: #374151;
            border-top-color: #818cf8;
          }

          .loading-label {
            color: #f9fafb;
          }

          .api-badge {
            background: #374151;
            color: #d1d5db;
            border-color: #4b5563;
          }

          .dot {
            background: #6b7280;
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 640px) {
          .loading-container {
            padding: 2rem 1.5rem;
          }

          .loading-label {
            font-size: 0.9rem;
          }

          .spinner-wrapper {
            margin-bottom: 1.5rem;
          }

          .spinner {
            width: 50px;
            height: 50px;
          }

          .spinner-circle {
            border-width: 3px;
          }
        }
      `}</style>
    </div>
  );
}
