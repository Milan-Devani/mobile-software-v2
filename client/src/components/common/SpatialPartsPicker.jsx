import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Package, ChevronDown, Search, X, Check, Boxes } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/billFormatters';

export const SpatialPartsPicker = ({
  parts = [],
  onSelect,
  placeholder = '+ From Inventory...',
  buttonClassName = '',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

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

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

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
  }, [isOpen]);

  const filteredParts = useMemo(() => {
    if (!search.trim()) return parts;
    const q = search.toLowerCase();
    return parts.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchCompat = (p.model_compatibility || '').toLowerCase().includes(q);
      return matchName || matchBrand || matchSku || matchCompat;
    });
  }, [parts, search]);

  const handleSelect = (part) => {
    onSelect?.(part);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${isOpen ? 'z-50' : 'z-auto'} ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer select-none ${buttonClassName}`}
      >
        <Package className="w-3.5 h-3.5 text-sky-400" />
        <span>{placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-2 space-y-2 animate-in fade-in slide-in-from-top-1">
          {/* Header & Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search parts by name, brand, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] px-1 flex items-center justify-between">
            <span>In-Stock Parts ({filteredParts.length})</span>
            <Boxes className="w-3 h-3 text-sky-400" />
          </div>

          {/* Parts List */}
          <div className="max-h-64 overflow-y-auto table-scrollbar space-y-1 pr-0.5">
            {filteredParts.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--spatial-text-muted)]">
                No matching parts found in inventory
              </div>
            ) : (
              filteredParts.map((part) => {
                const stockQty = part.quantity !== undefined ? part.quantity : (part.stock_quantity ?? 0);
                const price = Number(part.selling_price || part.cost_price || 0);

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelect(part)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--spatial-text-title)] group-hover:text-sky-400 truncate">
                        {part.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                        {part.brand && <span>{part.brand}</span>}
                        {part.sku && <span>• SKU: {part.sku}</span>}
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          stockQty > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          Stock: {stockQty}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-emerald-400">
                        {formatIndianCurrency(price, true)}
                      </div>
                      <span className="text-[10px] text-sky-400 font-semibold group-hover:underline">
                        + Select
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
