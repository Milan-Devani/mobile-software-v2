import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export const SpatialSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = '-- Select Option --',
  searchable = false,
  searchPlaceholder = 'Search options...',
  disabled = false,
  error = null,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [placement, setPlacement] = useState('bottom');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label, subtitle, badge }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : opt.id,
          label: opt.label || opt.name || opt.full_name || String(opt.value),
          subtitle: opt.subtitle || opt.phone || null,
          badge: opt.badge || opt.customer_code || opt.role_id || null,
          raw: opt,
        };
      }
      return {
        value: String(opt),
        label: String(opt),
        subtitle: null,
        badge: null,
        raw: opt,
      };
    });
  }, [options]);

  // Selected item
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value)) || null;
  }, [normalizedOptions, value]);

  // Auto-enable search if more than 7 options
  const isSearchEnabled = searchable || normalizedOptions.length > 7;

  // Filtered options
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter((opt) => {
      const matchLabel = opt.label?.toLowerCase().includes(q);
      const matchSub = opt.subtitle?.toLowerCase().includes(q);
      const matchBadge = opt.badge?.toLowerCase().includes(q);
      return matchLabel || matchSub || matchBadge;
    });
  }, [normalizedOptions, search]);

  // Close on outside click
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

  // Auto-focus search input when opening & calculate smart placement & elevate parent card stacking context
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Viewport space detection
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }

      // Elevate parent card to z-index 50 while open to avoid sibling stacking context issues
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

      if (isSearchEnabled && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }

      return () => {
        if (parentCard) {
          parentCard.style.zIndex = prevZ;
          if (!prevPos || prevPos === 'static') {
            parentCard.style.position = prevPos;
          }
        }
      };
    } else if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, isSearchEnabled]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    onChange?.(optValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : 'z-auto'} ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all text-left select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-[var(--spatial-bg-card-subtle)] border-[var(--spatial-border)]'
            : isOpen
            ? 'border-sky-400 bg-[var(--spatial-bg-card)] ring-2 ring-sky-500/20 shadow-sm'
            : 'spatial-input hover:border-[var(--spatial-border-hover)]'
        } ${error ? 'border-rose-500 ring-1 ring-rose-500/30' : ''} ${buttonClassName}`}
      >
        <span className="truncate flex-1 pr-2">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-[var(--spatial-text-title)] truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-400/20 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            <span className="text-[var(--spatial-text-muted)] font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--spatial-text-muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {/* Floating Spatial Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-[9999] spatial-dropdown-panel bg-white dark:bg-slate-900 p-1.5 max-h-72 flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
          style={{
            backgroundColor: 'var(--spatial-bg-dropdown, #ffffff)',
            boxShadow:
              '0 20px 45px -10px rgba(0, 0, 0, 0.4), 0 4px 15px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Optional Search Bar */}
          {isSearchEnabled && (
            <div className="p-1.5 border-b border-[var(--spatial-border)] mb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 spatial-input rounded-lg text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
                {search && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] absolute right-1.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto flex-1 space-y-0.5 max-h-56 pr-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-[var(--spatial-text-muted)]">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-400/30 shadow-xs'
                        : 'text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] hover:text-sky-300'
                    }`}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected)
                    ) : (
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <div className="truncate min-w-0">
                          <p className="font-semibold truncate leading-tight">{opt.label}</p>
                          {opt.subtitle && (
                            <p className="text-[11px] text-[var(--spatial-text-muted)] truncate font-mono mt-0.5">
                              {opt.subtitle}
                            </p>
                          )}
                        </div>
                        {opt.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-400/20 shrink-0 ml-auto">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500 mt-1">{error}</p>}
    </div>
  );
};
