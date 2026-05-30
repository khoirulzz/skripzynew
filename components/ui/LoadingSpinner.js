import React from 'react';
import DefaultSpinner from './DefaultSpinner';

/**
 * LoadingSpinner (Legacy Component Wrapper)
 * Dibuat demi backward-compatibility. Sekarang secara internal merender
 * DefaultSpinner (Premium Infinity SVG) agar visual konsisten di seluruh aplikasi.
 */
const LoadingSpinner = ({ size = 40, className = "" }) => {
  // Petakan class warna text-* Tailwind lama ke prop warna di DefaultSpinner jika eksplisit.
  let color = 'currentColor';
  if (className.includes('text-white')) {
    color = 'white';
  } else if (className.includes('text-primary')) {
    color = '#037ef3';
  } else if (className.includes('text-success')) {
    color = '#10b981';
  } else if (className.includes('text-danger')) {
    color = '#ef4444';
  }

  return (
    <DefaultSpinner
      sizePixel={size}
      color={color}
      className={className}
    />
  );
};

export default LoadingSpinner;
