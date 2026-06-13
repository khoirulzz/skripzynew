'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  sizePixel?: number | null;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  sizePixel = null,
  color = 'currentColor',
  className = '',
  style = {},
}) => {
  // Map size names to pixel values
  const sizeMap = {
    tiny: 20,
    small: 32,
    medium: 48,
    large: 64,
    xlarge: 100,
  };

  // Use custom pixel size if provided, otherwise use mapped size
  const actualSize = sizePixel || sizeMap[size] || sizeMap.medium;

  // Check if we should use Tailwind text color class or custom color
  const hasTailwindColor = /\btext-\w+/.test(className);
  
  let strokeColor = '#037ef3';
  if (color && color !== 'currentColor') {
    strokeColor = color;
  } else if (color === 'currentColor' && hasTailwindColor) {
    strokeColor = 'currentColor';
  }

  const defaultColorClass = strokeColor === 'currentColor' ? '' : (strokeColor === '#037ef3' ? 'text-indigo-600' : '');

  return (
    <div
      className={`flex items-center justify-center ${defaultColorClass} ${className}`}
      style={style}
    >
      <svg
        width={actualSize}
        height={actualSize}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="default-spinner-svg"
        preserveAspectRatio="xMidYMid"
        style={{
          shapeRendering: 'auto',
          display: 'block',
        }}
      >
        <g>
          <path
            style={{
              transform: 'scale(0.8)',
              transformOrigin: '50px 50px',
              animation: 'spinnerDash 1.2s linear infinite',
            }}
            strokeLinecap="round"
            d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z"
            strokeDasharray="192.4416961669922 64.14723205566406"
            strokeWidth="8"
            stroke={strokeColor}
            fill="none"
          />
        </g>
      </svg>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spinnerRotate {
          from {
            transform: scale(0.8) rotate(0deg);
          }
          to {
            transform: scale(0.8) rotate(360deg);
          }
        }

        @keyframes spinnerDash {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 256.58892822265625;
          }
        }

        .default-spinner-svg {
          filter: drop-shadow(0 0 2px rgba(79, 70, 229, 0.3));
        }
      `}} />
    </div>
  );
};

export default LoadingSpinner;
