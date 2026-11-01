import React from 'react';
import {
  ShieldCheck,
  RotateCcw,
  Clock,
  Calendar,
  Wrench,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Pencil,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const WarrantyClaimHistoryCard = ({
  job,
  user,
  onEditWarrantyDetails,
  className = '',
}) => {
  if (!job) return null;

  const isWarrantyClaim = Boolean(
    job.is_warranty_claim ||
    (job.reopen_count && job.reopen_count > 0) ||
    job.warranty_same_issue ||
    job.warranty_free_rework
  );

  if (!isWarrantyClaim) return null;

  const isFreeWarranty = Boolean(
    job.warranty_same_issue ||
    job.warranty_free_rework ||
    (job.approval_status === 'APPROVED' && Number(job.balance_due || 0) === 0)
  );

  const initialDeliveredDate = job.previous_delivered_at || job.delivered_at;
  const reopenDate = job.reopened_at;

  // Calculate days elapsed between delivery and warranty return
  let daysSinceDelivery = null;
  if (initialDeliveredDate && reopenDate) {
    const d1 = new Date(initialDeliveredDate).getTime();
    const d2 = new Date(reopenDate).getTime();
    if (!isNaN(d1) && !isNaN(d2)) {
      daysSinceDelivery = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    }
  } else if (initialDeliveredDate) {
    const d1 = new Date(initialDeliveredDate).getTime();
    daysSinceDelivery = Math.max(0, Math.round((Date.now() - d1) / (1000 * 60 * 60 * 24)));
  }

  const warrantyDuration = job.warranty_days || 30;

  // Get initial parts billed
  const estimateItems = job.estimate?.items || [];
  const partsUsed = job.parts_used || [];
  const initialPartsList = estimateItems.length > 0
    ? estimateItems
    : partsUsed.map(p => ({
        item_name: p.part_name || p.name || 'Replacement Hardware Part',
        warranty: p.warranty_period || `${warrantyDuration} Days`,
        unit_price: p.selling_price || p.unit_price || 0,
        quantity: p.quantity || 1,
        total_price: (p.selling_price || p.unit_price || 0) * (p.quantity || 1),
      }));

  const initialOrderTotal = Number(job.previous_total_amount || job.total_amount || 0);

  // Latest warranty claim entry if structured
  const latestWarrantyLog = Array.isArray(job.warranty_history) && job.warranty_history.length > 0
    ? job.warranty_history[0]
    : null;

  const warrantyReturnReason =
    job.last_warranty_issue ||
    latestWarrantyLog?.warranty_issue ||
    'Customer reported issue within warranty coverage period';

  const partReworkReason =
    job.warranty_rework_reason ||
    latestWarrantyLog?.rework_reason ||
    job.reopen_notes ||
    'Technical inspection verified failure in previous replacement assembly. Re-servicing and part replacement authorized under 100% free warranty policy.';

  const canEdit = ['admin', 'technician', 'staff'].includes(user?.role_id);

  const formatDate = (iso) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(iso);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isFreeWarranty
          ? 'bg-gradient-to-br from-emerald-950/20 via-slate-900/40 to-emerald-950/30 border-emerald-500/30 shadow-lg shadow-emerald-950/10'
          : 'bg-gradient-to-br from-amber-950/20 via-slate-900/40 to-amber-950/30 border-amber-500/30 shadow-lg shadow-amber-950/10'
      } ${className}`}
    >
      {/* CARD HEADER */}
      <div className="p-4 sm:p-5 border-b border-[var(--spatial-border)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isFreeWarranty
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-[var(--spatial-text-title)] tracking-tight">
                Warranty Claim & Repair History Audit
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                  isFreeWarranty
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                Claim #{job.reopen_count || 1}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isFreeWarranty
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                    : 'bg-amber-500/25 text-amber-300 border-amber-400/40'
                }`}
              >
                {isFreeWarranty ? '100% Free Rework (₹0 Due)' : 'Chargeable Rework'}
              </span>
            </div>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
              Comprehensive audit trail tracking initial repair, warranty return reason, and technical part rework.
            </p>
          </div>
        </div>

        {canEdit && onEditWarrantyDetails && (
          <button
            type="button"
            onClick={onEditWarrantyDetails}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-hover)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)] hover:border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Edit Warranty Return Reason or Technical Part Rework Assessment"
          >
            <Pencil className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Warranty Rework Details</span>
          </button>
        )}
      </div>

      {/* 3-STEP AUDIT TIMELINE */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* STEP 1: INITIAL REPAIR INTAKE */}
        <div className="flex flex-col justify-between rounded-xl p-4 bg-[var(--spatial-bg-card)]/80 border border-blue-500/20 hover:border-blue-500/40 transition-all space-y-3.5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Step 1 • Initial Service
              </span>
              <span className="text-[11px] font-mono text-[var(--spatial-text-muted)]">
                Job #{job.job_number}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] block mb-0.5">
                  1. Why Mobile Came For Repair (Original Complaint)
                </span>
                <div className="p-2.5 rounded-lg bg-[var(--spatial-bg-app)] border border-[var(--spatial-border)] font-medium text-[var(--spatial-text-title)] text-xs italic">
                  "{job.customer_complaint || 'Device issue reported at intake'}"
                </div>
              </div>

              {job.diagnosis?.recommended_solution && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] block mb-0.5">
                    Initial Diagnosis / Solution
                  </span>
                  <p className="text-[11px] text-[var(--spatial-text-body)]">
                    {job.diagnosis.recommended_solution}
                  </p>
                </div>
              )}

              {/* Initial Parts Fitted */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] block mb-1">
                  Initial Parts Repaired / Fitted
                </span>
                <div className="space-y-1">
                  {initialPartsList.length > 0 ? (
                    initialPartsList.map((part, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-2 rounded-lg bg-[var(--spatial-bg-app)] border border-[var(--spatial-border)] flex items-center justify-between text-[11px]"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-[var(--spatial-text-title)] block truncate">
                            {part.item_name}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            Warranty: {part.warranty || `${warrantyDuration} Days`}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[var(--spatial-text-title)] shrink-0">
                          ₹{Number(part.unit_price || part.total_price || 0).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--spatial-text-muted)] italic">
                      Hardware service & diagnostic rework
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--spatial-border)] text-[11px] text-[var(--spatial-text-muted)] space-y-1">
            <div className="flex justify-between">
              <span>Intake Date:</span>
              <span className="font-mono text-[var(--spatial-text-body)]">{formatDate(job.created_at)}</span>
            </div>
            {initialDeliveredDate && (
              <div className="flex justify-between">
                <span>Completed / Delivered:</span>
                <span className="font-mono text-[var(--spatial-text-body)]">{formatDate(initialDeliveredDate)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-0.5 border-t border-slate-700/40">
              <span className="text-[var(--spatial-text-title)]">Initial Bill Total:</span>
              <span className="font-mono text-emerald-400">₹{initialOrderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* STEP 2: RETURN DURING WARRANTY TIME */}
        <div className="flex flex-col justify-between rounded-xl p-4 bg-[var(--spatial-bg-card)]/80 border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-3.5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Step 2 • Warranty Return
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-semibold">
                {daysSinceDelivery !== null ? `Day ${daysSinceDelivery} of ${warrantyDuration}` : 'Under Warranty'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                  2. Why Mobile Came Back During Warranty Time
                </span>
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs font-semibold leading-relaxed">
                  "{warrantyReturnReason}"
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--spatial-bg-app)] border border-[var(--spatial-border)] text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--spatial-text-muted)]">Warranty Status:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Valid & Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--spatial-text-muted)]">Coverage Policy:</span>
                  <span className="font-semibold text-[var(--spatial-text-title)]">
                    {isFreeWarranty ? 'Same Issue Rework' : 'Chargeable Assessment'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--spatial-text-muted)]">Customer Billed:</span>
                  <span className="font-mono font-bold text-emerald-400">₹0.00 (Free)</span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--spatial-text-muted)]">
                The mobile was handed back by customer within the {warrantyDuration}-day hardware warranty window with no physical damage, qualifying for free rework.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--spatial-border)] text-[11px] text-[var(--spatial-text-muted)] space-y-1">
            <div className="flex justify-between">
              <span>Return / Reopened:</span>
              <span className="font-mono text-amber-300">{formatDate(reopenDate || job.updated_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Return Window:</span>
              <span className="font-mono text-[var(--spatial-text-body)]">
                {daysSinceDelivery !== null ? `${daysSinceDelivery} days after delivery` : 'Within warranty'}
              </span>
            </div>
          </div>
        </div>

        {/* STEP 3: TECHNICAL REWORK & WHY PART WAS CHANGED */}
        <div className="flex flex-col justify-between rounded-xl p-4 bg-[var(--spatial-bg-card)]/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-3.5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Step 3 • Technical Action
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                ₹0.00 Pre-Authorized
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                  3. Why Part Changed Or Repaired (Technical Assessment)
                </span>
                <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-500/35 text-emerald-200 text-xs font-semibold leading-relaxed">
                  "{partReworkReason}"
                </div>
              </div>

              {/* Rework details */}
              <div className="p-2.5 rounded-lg bg-[var(--spatial-bg-app)] border border-[var(--spatial-border)] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--spatial-text-muted)]">Rework Resolution:</span>
                  <span className="font-bold text-[var(--spatial-text-title)]">
                    Free Component Replacement / Rework
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--spatial-text-muted)]">Technician:</span>
                  <span className="font-medium text-[var(--spatial-text-body)]">
                    {job.technician?.full_name || 'Workbench Technician'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--spatial-text-muted)]">Customer Approval:</span>
                  <span className="font-semibold text-emerald-400">
                    Pre-Authorized (₹0.00)
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Warranty rework covered 100% under Mobotech warranty. Quality check & functional tests will be performed before handover.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--spatial-border)] text-[11px] text-[var(--spatial-text-muted)] space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-emerald-400">Customer Balance Due:</span>
              <span className="font-mono text-emerald-400 text-sm">₹0.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
