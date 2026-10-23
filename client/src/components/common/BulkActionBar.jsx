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
      className={`mb-3 p-3 sm:px-4 rounded-2xl spatial-card border border-[var(--spatial-border)] shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-180 ${className}`}
    >
      {/* Left: Counter & Clear */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#0071e3] dark:bg-[#0a84ff] text-white flex items-center justify-center shadow-2xs">
          <CheckSquare className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <span className="font-bold text-[var(--spatial-text-title)] text-sm font-mono">{selectedCount}</span>{' '}
          <span className="font-medium text-[var(--spatial-text-body)] text-xs">item{selectedCount > 1 ? 's' : ''} selected</span>
        </div>

        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-2 text-xs font-medium text-[var(--spatial-text-muted)] hover:text-rose-500 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5 stroke-[2]" />
            <span>Clear</span>
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
            className="spatial-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2]" />
            <span>{updateLabel}</span>
          </button>
        )}

        {onBulkDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#ff3b30] hover:bg-[#e03126] text-white shadow-xs dark:bg-[#ff453a] dark:hover:bg-[#ff5b52] transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
            <span>{deleteLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
