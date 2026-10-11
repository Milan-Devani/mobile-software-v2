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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900 text-sm">Hardware Quality Assurance (QC) Checklist</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              passPercentage === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {passCount} / {checklist.length} Passed ({passPercentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify every hardware function before device is released to customer.
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllPass}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
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
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : isFail
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 tracking-tight">
                  {item.test_label}
                </span>

                <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 shrink-0">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleResultChange(item.test_key, 'PASS')}
                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                      isPass
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
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
                        : 'text-slate-600 hover:text-rose-700'
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
                        ? 'bg-white text-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-600'
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
                  className="mt-2 w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-md placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              )}
              {readOnly && item.notes && (
                <p className="mt-1 text-[11px] text-slate-500 italic">Note: {item.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
