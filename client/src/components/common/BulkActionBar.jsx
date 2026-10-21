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
      className={`mb-3 p-3 sm:px-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-sky-400 dark:border-sky-500 shadow-md shadow-sky-500/10 dark:shadow-sky-950/40 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
    >
      {/* Left: Counter & Clear */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
          <CheckSquare className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedCount}</span>{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-300 text-xs">item{selectedCount > 1 ? 's' : ''} selected</span>
        </div>

        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Clear selection</span>
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {customActions}

        {onBulkUpdate && (
          <button
            type="button"
            onClick={onBulkUpdate}
            className="px-3.5 py-1.5 rounded-xl font-bold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white border border-sky-600 shadow-sm shadow-sky-600/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{updateLabel}</span>
          </button>
        )}

        {onBulkDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="px-3.5 py-1.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-600 shadow-sm shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{deleteLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
