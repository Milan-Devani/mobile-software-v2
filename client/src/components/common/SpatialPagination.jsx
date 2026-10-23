import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Spatial Design Pagination Component
 * Supports:
 * - Default 10 items per page
 * - User-selectable page size dropdown (10, 15, 20, 50)
 * - Intelligent page range display with ellipses
 * - Responsive layout stacking on mobile screens
 */
export const SpatialPagination = ({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 20, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');

      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (safePage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`px-4 py-3 border-t border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)]/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs select-none ${className}`}
    >
      {/* Left: Summary and Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-[var(--spatial-text-muted)]">
        <div>
          Showing{' '}
          <span className="font-semibold text-[var(--spatial-text-title)]">{startItem}</span> to{' '}
          <span className="font-semibold text-[var(--spatial-text-title)]">{endItem}</span> of{' '}
          <span className="font-semibold text-[var(--spatial-text-title)]">{totalItems}</span> entries
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 sm:border-l border-[var(--spatial-border)]">
            <span className="text-[11px] font-medium">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
              className="px-2 py-1 rounded-lg text-xs font-semibold spatial-input bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-[#0f172a] text-slate-100">
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-medium">per page</span>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Pills */}
      <div className="flex items-center gap-1 self-end md:self-auto">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          aria-label="First page"
          title="First Page"
          className="p-1.5 rounded-lg border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          aria-label="Previous page"
          title="Previous Page"
          className="p-1.5 rounded-lg border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Number Pills */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-[var(--spatial-text-muted)] select-none"
                >
                  …
                </span>
              );
            }
            const isActive = p === safePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[#0071e3] text-white shadow-xs dark:bg-[#0a84ff]'
                    : 'border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          aria-label="Next page"
          title="Next Page"
          className="p-1.5 rounded-lg border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          aria-label="Last page"
          title="Last Page"
          className="p-1.5 rounded-lg border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
