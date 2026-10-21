import React from 'react';
import { Trash2, Edit3, X, CheckSquare } from 'lucide-react';

/**
 * Reusable Bulk Action Bar
 * Appears when one or more table rows are selected via checkbox.
 * Supports:
 * - Selected count indicator
 * - Bulk Delete with confirmation trigger
 * - Bulk Update action trigger
 * - Custom actions slot
 * - Clear selection button
 */
export const BulkActionBar = ({
  selectedCount = 0,
  onClearSelection,
  onBulkDelete,
  deleteLabel = 'Delete Selected',
  onBulkUpdate,
  updateLabel = 'Update Status',
  customActions = null,
  className = '',
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`mb-3 p-3 rounded-2xl bg-[var(--spatial-bg-card)] border border-sky-500/40 shadow-lg shadow-sky-950/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
    >
      {/* Left: Counter & Clear */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
          <CheckSquare className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-[var(--spatial-text-title)]">{selectedCount}</span>{' '}
          <span className="text-[var(--spatial-text-muted)]">item{selectedCount > 1 ? 's' : ''} selected</span>
        </div>

        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-1 text-[11px] font-semibold text-[var(--spatial-text-muted)] hover:text-sky-400 flex items-center gap-1 hover:underline"
          >
            <X className="w-3 h-3" />
            <span>Clear selection</span>
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {customActions}

        {onBulkUpdate && (
          <button
            type="button"
            onClick={onBulkUpdate}
            className="px-3 py-1.5 rounded-xl font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30 hover:bg-sky-500/25 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{updateLabel}</span>
          </button>
        )}

        {onBulkDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="px-3 py-1.5 rounded-xl font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleteLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
