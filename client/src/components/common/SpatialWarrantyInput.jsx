import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, ShieldCheck, X } from 'lucide-react';

const DEFAULT_PRESETS = [
  'No Warranty',
  '7 Days Testing Warranty',
  '15 Days Replacement',
  '30 Days Warranty',
  '60 Days Warranty',
  '90 Days Warranty',
  '6 Months Warranty',
  '1 Year Brand Warranty',
];

export const SpatialWarrantyInput = ({
  value = '',
  onChange,
  placeholder = 'e.g. 1 Year, 6 Months...',
  presets = DEFAULT_PRESETS,
  className = '',
  heightClass = 'h-11',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Elevate parent card stacking context when open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const parentCard = containerRef.current.closest('.spatial-card');
      let prevZ = '';
      let prevPos = '';
      if (parentCard) {
        prevZ = parentCard.style.zIndex;
        prevPos = parentCard.style.position;
        parentCard.style.zIndex = '50';
        if (!prevPos || prevPos === 'static') {
          parentCard.style.position = 'relative';
        }
      }
      return () => {
        if (parentCard) {
          parentCard.style.zIndex = prevZ;
          if (!prevPos || prevPos === 'static') {
            parentCard.style.position = prevPos;
          }
        }
      };
    }
  }, [isOpen]);

  const handleSelect = (preset) => {
    onChange?.(preset);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : 'z-auto'} ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full ${heightClass} pl-3 pr-8 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none font-medium transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 p-1 text-[var(--spatial-text-muted)] hover:text-sky-400 transition-colors cursor-pointer select-none"
          title="Choose Warranty Preset"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-sky-400' : ''
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 py-1.5 bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-xl shadow-2xl backdrop-blur-md max-h-60 overflow-y-auto table-scrollbar animate-in fade-in slide-in-from-top-1"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] border-b border-[var(--spatial-border)] mb-1 flex items-center justify-between">
            <span>Select Warranty Preset</span>
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          </div>

          <div className="p-1 space-y-0.5">
            {presets.map((preset) => {
              const isSelected = (value || '').trim().toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelect(preset)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/15 text-sky-400 font-bold'
                      : 'text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] hover:text-sky-400'
                  }`}
                >
                  <span className="truncate">{preset}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
