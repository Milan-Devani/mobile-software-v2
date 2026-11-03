import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * SpatialTableSelect
 * Portal-based dropdown select specifically tailored for table rows.
 * Renders the floating dropdown menu using ReactDOM.createPortal directly onto document.body
 * with fixed coordinates calculated from the trigger button's bounding box.
 * This completely eliminates:
 *  1. Table overflow / scrollbar clipping (overflow-x-auto / overflow-y-auto).
 *  2. Stacking context / z-index collisions with table headers, cards, or neighbouring rows.
 */
export const SpatialTableSelect = ({
  value,
  onChange,
  options = [],
  colorScheme = 'sky', // 'sky' | 'emerald'
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Position calculation with viewport boundaries & smart flip
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 36 + 16, 260); // approx max height
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    // Minimum width matches button or at least 175px
    const minWidth = Math.max(rect.width, 175);

    // Keep horizontally within viewport bounds
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - minWidth - 12);
    }

    setMenuStyle({
      position: 'fixed',
      left: `${left}px`,
      top: shouldOpenUp
        ? `${Math.max(8, rect.top - dropdownHeight - 6)}px`
        : `${Math.min(window.innerHeight - dropdownHeight - 8, rect.bottom + 6)}px`,
      minWidth: `${minWidth}px`,
      maxHeight: `${dropdownHeight}px`,
      zIndex: 99999,
    });
  };

  // Recalculate on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, options.length]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) ||
    options[0] || { label: value };

  const activeFocusRing =
    colorScheme === 'emerald'
      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
      : 'border-sky-500 ring-2 ring-sky-500/20';

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] hover:border-[var(--spatial-border-hover)] hover:bg-[var(--spatial-bg-card)] transition-all cursor-pointer select-none min-w-[130px] ${
          isOpen ? activeFocusRing : ''
        }`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--spatial-text-muted)] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[var(--spatial-text-title)]' : ''
          }`}
        />
      </button>

      {/* Floating Portal Menu */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            onClick={(e) => e.stopPropagation()}
            className="spatial-dropdown-panel p-1 rounded-xl shadow-2xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-dropdown,#1c1c1e)] flex flex-col animate-in fade-in zoom-in-95 duration-100 overflow-y-auto custom-scrollbar"
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  onClick={() => {
                    onChange?.(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#0071e3]/15 text-[#0071e3] dark:bg-[#0a84ff]/20 dark:text-[#0a84ff]'
                      : 'text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#0a84ff] stroke-[2.5] shrink-0" />
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default SpatialTableSelect;
