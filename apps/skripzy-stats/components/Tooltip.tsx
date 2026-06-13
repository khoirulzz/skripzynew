'use client';

import React from 'react';

export function Tooltip({ children, content, position = 'right' }: { children: React.ReactNode, content: React.ReactNode, position?: 'top' | 'bottom' | 'left' | 'right' }) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top': return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom': return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left': return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right': return 'left-full top-0 ml-2';
      default: return 'left-full top-0 ml-2';
    }
  };

  return (
    <div className="relative group/tooltip flex w-full">
      {children}
      <div className={`absolute ${getPositionClasses()} hidden group-hover/tooltip:block z-50 w-56 bg-[#0F1115] border border-indigo-500/50 text-[#94A3B8] text-[11px] font-mono leading-relaxed p-3 rounded-md shadow-2xl whitespace-normal pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 delay-150`}>
        {content}
      </div>
    </div>
  );
}
