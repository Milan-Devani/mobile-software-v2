import React, { useState } from 'react';
import { Check, X, Minus, Save, CheckCheck } from 'lucide-react';
import { Button } from '../common/Button';

export const QualityChecklist = ({ tests = [], onSave, readOnly = false, isSaving = false }) => {
  const [checklist, setChecklist] = useState(tests);

  const handleResultChange = (testKey, result) => {
    if (readOnly) return;
    setChecklist((prev) =>
      prev.map((item) =>
        item.test_key === testKey ? { ...item, result } : item
      )
    );
  };

  const handleNoteChange = (testKey, notes) => {
    if (readOnly) return;
    setChecklist((prev) =>
      prev.map((item) =>
        item.test_key === testKey ? { ...item, notes } : item
      )
    );
  };

  const handleMarkAllPass = () => {
    if (readOnly) return;
    setChecklist((prev) =>
      prev.map((item) => ({ ...item, result: 'PASS' }))
    );
  };

  const passCount = checklist.filter((t) => t.result === 'PASS').length;
  const failCount = checklist.filter((t) => t.result === 'FAIL').length;
  const notTestedCount = checklist.filter((t) => t.result === 'NOT_TESTED').length;
  const passPercentage = checklist.length > 0 ? Math.round((passCount / checklist.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header bar with summary score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Hardware Quality Assurance (QC) Checklist</h4>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              passPercentage === 100
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}>
              {passCount} / {checklist.length} Passed ({passPercentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verify every hardware function before device is released to customer.
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllPass}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Pass</span>
            </button>
            <Button
              size="sm"
              icon={Save}
              loading={isSaving}
              onClick={() => onSave(checklist)}
            >
              Save Results
            </Button>
          </div>
        )}
      </div>

      {/* Grid of Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {checklist.map((item) => {
          const isPass = item.result === 'PASS';
          const isFail = item.result === 'FAIL';
          const isNotTested = item.result === 'NOT_TESTED';

          return (
            <div
              key={item.test_key}
              className={`p-3.5 rounded-xl border transition-all ${
                isPass
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : isFail
                  ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                  : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
                  {item.test_label}
                </span>

                <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleResultChange(item.test_key, 'PASS')}
                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                      isPass
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>PASS</span>
                  </button>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleResultChange(item.test_key, 'FAIL')}
                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                      isFail
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    <span>FAIL</span>
                  </button>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleResultChange(item.test_key, 'NOT_TESTED')}
                    className={`px-1.5 py-1 rounded text-[11px] font-medium transition-all ${
                      isNotTested
                        ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {!readOnly && (
                <input
                  type="text"
                  placeholder="Optional observation notes..."
                  value={item.notes || ''}
                  onChange={(e) => handleNoteChange(item.test_key, e.target.value)}
                  className="mt-2 w-full px-2.5 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              )}
              {readOnly && item.notes && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">Note: {item.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
