import React, { useState } from 'react';
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
  Layers,
  Table as TableIcon,
} from 'lucide-react';
import { getAllWarrantyClaims, formatDateTime } from '../../utils/warrantyUtils';

export const WarrantyClaimHistoryCard = ({
  job,
  user,
  onEditWarrantyDetails,
  onReopenJob,
  className = '',
}) => {
  if (!job) return null;

  const allClaims = getAllWarrantyClaims(job);

  const isWarrantyClaim = Boolean(
    job.is_warranty_claim ||
    (job.reopen_count && job.reopen_count > 0) ||
    job.warranty_same_issue ||
    job.warranty_free_rework ||
    allClaims.length > 0
  );

  const initialDeliveredDate = job.previous_delivered_at || job.delivered_at;
  const warrantyDuration = job.warranty_days || 30;

  if (!isWarrantyClaim && allClaims.length === 0) {
    const isDelivered = job.status === 'DELIVERED';
    return (
      <div className={`rounded-2xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card)] p-5 sm:p-6 space-y-5 shadow-xs ${className}`}>
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[var(--spatial-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-[var(--spatial-text-title)]">
                  Warranty Policy & Claim History
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[var(--spatial-text-muted)] border border-[var(--spatial-border)]">
                  0 Claims Recorded
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  {warrantyDuration} Days Shop Policy
                </span>
              </div>
              <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
                Standard initial repair cycle. No warranty rework claims have been logged for this job.
              </p>
            </div>
          </div>
          {isDelivered && onReopenJob && (
            <button
              type="button"
              onClick={onReopenJob}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Job (Warranty Claim)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block mb-1">
              Warranty Coverage Window
            </span>
            <p className="font-bold text-[var(--spatial-text-title)] text-sm">
              {warrantyDuration} Days Limited Hardware Warranty
            </p>
            <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
              {initialDeliveredDate
                ? `Active since handover on ${formatDateTime(initialDeliveredDate)}`
                : 'Warranty coverage activates automatically once device is marked Delivered.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block mb-1">
              Original Intake Complaint
            </span>
            <p className="font-semibold text-[var(--spatial-text-title)] italic">
              "{job.customer_complaint || 'Device hardware fault'}"
            </p>
            <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
              Initial Solution: {job.diagnosis?.recommended_solution || 'Component replacement / repair'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block mb-1">
              Claim Audit Policy
            </span>
            <p className="font-bold text-emerald-400">
              100% Free Rework on Same Issues
            </p>
            <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
              If the device returns with issues within warranty, claims are tracked in a full chronological audit table.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isFreeWarranty = Boolean(
    job.warranty_same_issue ||
    job.warranty_free_rework ||
    (job.approval_status === 'APPROVED' && Number(job.balance_due || 0) === 0)
  );

  // Get initial parts billed
  const estimateItems = job.estimate?.items || [];
  const partsUsed = job.parts_used || [];
  const initialPartsList = estimateItems.length > 0
    ? estimateItems
    : partsUsed.map((p) => ({
        item_name: p.part_name || p.name || 'Replacement Hardware Part',
        warranty: p.warranty_period || `${warrantyDuration} Days`,
        unit_price: p.selling_price || p.unit_price || 0,
        quantity: p.quantity || 1,
        total_price: (p.selling_price || p.unit_price || 0) * (p.quantity || 1),
      }));

  const initialOrderTotal = Number(
    job?.estimate?.total_amount ||
    job?.paid_amount ||
    (job?.previous_total_amount && Number(job.previous_total_amount) > 0 ? job.previous_total_amount : 0) ||
    job?.total_amount ||
    0
  );
  const allWarrantyParts = (Array.isArray(job?.warranty_parts) && job.warranty_parts.length > 0)
    ? job.warranty_parts
    : (Array.isArray(job?.device_condition?.warranty_parts) && job.device_condition.warranty_parts.length > 0
        ? job.device_condition.warranty_parts
        : (Array.isArray(job?.warranty_history)
            ? job.warranty_history.flatMap(h => h.replacement_parts || [])
            : []));

  const canEdit = ['admin', 'technician', 'staff'].includes(user?.role_id);
  const activeClaimNumber = job.reopen_count || (allClaims.length > 0 ? allClaims[allClaims.length - 1].claim_number : 1);

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isFreeWarranty
          ? 'bg-gradient-to-br from-emerald-950/20 via-slate-900/50 to-emerald-950/30 border-emerald-500/30 shadow-lg shadow-emerald-950/15'
          : 'bg-gradient-to-br from-amber-950/20 via-slate-900/50 to-amber-950/30 border-amber-500/30 shadow-lg shadow-amber-950/15'
      } ${className}`}
    >
      {/* HEADER SECTION */}
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
                Warranty Claim & Repair History Audit Table
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                  isFreeWarranty
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                {allClaims.length > 1 ? `All ${allClaims.length} Claims Recorded` : `Claim #${activeClaimNumber}`}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isFreeWarranty
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                    : 'bg-amber-500/25 text-amber-300 border-amber-400/40'
                }`}
              >
                {isFreeWarranty ? '100% Free Rework (₹0 Due)' : 'Chargeable Assessment'}
              </span>
            </div>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
              Chronological ledger tracking initial service baseline and all warranty claims ({allClaims.length} total).
            </p>
          </div>
        </div>

        {canEdit && onEditWarrantyDetails && (
          <button
            type="button"
            onClick={() => onEditWarrantyDetails(activeClaimNumber)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-hover)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)] hover:border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Edit Warranty Return Reason or Technical Part Rework Assessment"
          >
            <Pencil className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Warranty Rework Details</span>
          </button>
        )}
      </div>

      {/* BASELINE: INITIAL SERVICE SUMMARY BANNER */}
      <div className="p-4 sm:px-6 bg-[var(--spatial-bg-card-subtle)]/70 border-b border-[var(--spatial-border)] text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Initial Service Intake Baseline
            </span>
            <span className="font-mono text-[var(--spatial-text-muted)]">Job #{job.job_number}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--spatial-text-muted)]">
            <span>Inward: <strong className="text-[var(--spatial-text-title)]">{formatDateTime(job.created_at)}</strong></span>
            {initialDeliveredDate && (
              <span>Delivered: <strong className="text-[var(--spatial-text-title)]">{formatDateTime(initialDeliveredDate)}</strong></span>
            )}
            <span>Initial Bill: <strong className="text-emerald-400 font-mono">₹{initialOrderTotal.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)]">
            <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] block mb-0.5">
              Original Customer Complaint
            </span>
            <p className="font-semibold text-[var(--spatial-text-title)] italic">
              "{job.customer_complaint || 'Device issue reported at intake'}"
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)]">
            <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] block mb-0.5">
              Initial Diagnosis / Solution
            </span>
            <p className="text-[var(--spatial-text-body)]">
              {job.diagnosis?.recommended_solution || 'Replace display / hardware component service'}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)]">
            <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] block mb-0.5">
              Initial Parts Fitted & Warranty
            </span>
            <p className="text-[var(--spatial-text-title)] font-medium truncate">
              {initialPartsList.length > 0
                ? initialPartsList.map((p) => `${p.item_name} (₹${Number(p.unit_price || p.total_price || 0).toFixed(0)}, ${p.warranty || `${warrantyDuration} Days`})`).join(' • ')
                : 'Standard Hardware Service'}
            </p>
          </div>
        </div>
      </div>

      {/* ALL WARRANTY CLAIMS TABLE */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <div className="border border-[var(--spatial-border)] rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs min-w-[750px] border-collapse">
            <thead className="bg-[var(--spatial-bg-card)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-24">Claim #</th>
                <th className="px-3.5 py-3 w-44">Claim Date & Return Window</th>
                <th className="px-3.5 py-3 min-w-[200px]">Why Mobile Came Back (Customer Complaint)</th>
                <th className="px-3.5 py-3 min-w-[240px]">Why Part Changed / Repaired (Technical Action)</th>
                <th className="px-3.5 py-3 w-36 text-center">Coverage / Cost</th>
                <th className="px-3.5 py-3 w-32">Technician</th>
                {canEdit && onEditWarrantyDetails && (
                  <th className="px-3.5 py-3 w-16 text-center">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--spatial-border)] bg-[var(--spatial-bg-card)]/50">
              {allClaims.map((claim) => {
                const isCurrent = claim.claim_number === activeClaimNumber;
                return (
                  <tr
                    key={claim.claim_number}
                    className={`hover:bg-[var(--spatial-bg-card-hover)] transition-colors ${
                      isCurrent ? 'bg-emerald-500/[0.04]' : ''
                    }`}
                  >
                    {/* CLAIM NUMBER */}
                    <td className="px-3.5 py-3.5 text-center align-top">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Claim #{claim.claim_number}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                    </td>

                    {/* DATE & RETURN WINDOW */}
                    <td className="px-3.5 py-3.5 align-top">
                      <div className="font-mono text-[var(--spatial-text-title)] font-semibold text-[11px]">
                        {formatDateTime(claim.claimed_at)}
                      </div>
                      <div className="text-[10px] text-amber-400 font-medium mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {claim.days_after_delivery !== null && claim.days_after_delivery !== undefined
                            ? `Day ${claim.days_after_delivery} of ${warrantyDuration} days warranty`
                            : `Within ${warrantyDuration} days warranty`}
                        </span>
                      </div>
                    </td>

                    {/* CUSTOMER WARRANTY ISSUE */}
                    <td className="px-3.5 py-3.5 align-top">
                      <div className="p-2.5 rounded-lg bg-amber-950/25 border border-amber-500/30 text-amber-200 text-xs font-semibold leading-relaxed">
                        "{claim.warranty_issue}"
                      </div>
                    </td>

                    {/* WHY PART CHANGED / REPAIRED */}
                    <td className="px-3.5 py-3.5 align-top">
                      <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-500/35 text-emerald-200 text-xs font-semibold leading-relaxed">
                        "{claim.rework_reason}"
                      </div>
                      {claim.staff_notes && (
                        <div className="text-[10px] text-[var(--spatial-text-muted)] mt-1.5 italic">
                          Staff Notes: {claim.staff_notes}
                        </div>
                      )}
                      {allWarrantyParts.filter((p) => Number(p.claim_number) === Number(claim.claim_number) || allWarrantyParts.length === 1).length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-emerald-500/25">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                              Replaced Parts Under Claim #{claim.claim_number}:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {allWarrantyParts
                                .filter((p) => Number(p.claim_number) === Number(claim.claim_number) || allWarrantyParts.length === 1)
                                .map((cp, cpIdx) => (
                                  <span
                                    key={cp.id || cpIdx}
                                    className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/30"
                                  >
                                    <Wrench className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>{cp.item_name} ({cp.warranty || '30 Days'}) • ₹0.00 Free</span>
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                    </td>

                    {/* COVERAGE & COST */}
                    <td className="px-3.5 py-3.5 align-top text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {claim.is_free_rework ? '100% Free Rework' : 'Chargeable'}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 text-xs mt-1">
                          ₹0.00 Due
                        </span>
                        <span className="text-[9px] text-[var(--spatial-text-muted)]">
                          Pre-Authorized
                        </span>
                      </div>
                    </td>

                    {/* TECHNICIAN */}
                    <td className="px-3.5 py-3.5 align-top">
                      <div className="font-medium text-[var(--spatial-text-title)] text-xs">
                        {claim.claimed_by_name || job.technician?.full_name || 'Assigned Tech'}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>QC Verified</span>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    {canEdit && onEditWarrantyDetails && (
                      <td className="px-3.5 py-3.5 align-top text-center">
                        <button
                          type="button"
                          onClick={() => onEditWarrantyDetails(claim.claim_number)}
                          className="p-1.5 rounded-lg bg-[var(--spatial-bg-app)] hover:bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-emerald-500/40 text-[var(--spatial-text-muted)] hover:text-emerald-400 transition-all shadow-xs"
                          title={`Edit details for Claim #${claim.claim_number}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER NOTICE */}
      <div className="p-3.5 sm:px-6 bg-[var(--spatial-bg-card-subtle)]/50 border-t border-[var(--spatial-border)] flex items-center justify-between flex-wrap gap-2 text-[11px] text-[var(--spatial-text-muted)]">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>All warranty rework is 100% covered under Mobotech Hardware Warranty policy with zero cost to customer.</span>
        </div>
        <div className="font-semibold text-[var(--spatial-text-title)]">
          Current Customer Balance Due: <span className="font-mono text-emerald-400 text-xs">₹0.00</span>
        </div>
      </div>
    </div>
  );
};
