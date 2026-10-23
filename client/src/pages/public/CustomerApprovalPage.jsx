import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Phone,
  MapPin,
  AlertCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jobService } from '../../services/jobService';
import { LoadingSpinner } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export const CustomerApprovalPage = () => {
  const { tokenOrJobNumber } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const lookupIdentifier = queryToken || tokenOrJobNumber;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decisionDone, setDecisionDone] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const fetchApprovalDetails = async () => {
    try {
      setLoading(true);
      const res = await jobService.getPublicApproval(lookupIdentifier);
      setJob(res);
      if (res.approval_status === 'APPROVED' || res.approval_status === 'REJECTED') {
        setDecisionDone(res.approval_status);
      }
    } catch (err) {
      toast.error('Approval link expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalDetails();
  }, [lookupIdentifier]);

  const handleDecision = async (decision) => {
    try {
      setSubmitting(true);
      const res = await jobService.submitPublicApproval(lookupIdentifier, decision, rejectionReason);
      setDecisionDone(decision);
      toast.success(res.message || 'Thank you! Your response has been recorded.');
      fetchApprovalDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--spatial-bg-app)] flex items-center justify-center p-4">
        <LoadingSpinner label="Loading repair estimate details..." />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[var(--spatial-bg-app)] flex items-center justify-center p-4">
        <div className="max-w-md w-full spatial-card rounded-3xl shadow-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[var(--spatial-text-title)]">Link Expired or Invalid</h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-2">
            The repair estimate link you followed is no longer valid. Please contact the repair shop directly for assistance.
          </p>
        </div>
      </div>
    );
  }

  const est = job.estimate;
  const shop = job.shop;

  return (
    <div className="min-h-screen bg-[var(--spatial-bg-app)] py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="spatial-card rounded-3xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 bg-apple-blue/10 border border-apple-blue/20 rounded-2xl text-apple-blue flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Smartphone className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--spatial-text-title)] tracking-tight">{shop?.name || 'Mobotech mobile care'}</h1>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">Official Repair Estimate & Authorization Request</p>
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--spatial-text-muted)] mt-3 font-medium flex-wrap">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-apple-blue" /> {shop?.phone}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-apple-blue" /> {shop?.address}</span>
          </div>
        </div>

        {/* Decision Banner if already decided */}
        {decisionDone && (
          <div className={`p-5 rounded-2xl border text-center transition-all ${decisionDone === 'APPROVED'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
            }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {decisionDone === 'APPROVED' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              )}
              <h3 className="text-lg font-bold">
                {decisionDone === 'APPROVED' ? 'Repair Estimate Authorized!' : 'Repair Estimate Declined'}
              </h3>
            </div>
            <p className="text-xs opacity-90">
              {decisionDone === 'APPROVED'
                ? 'Thank you! Our technicians have queued your device for repair and will notify you when it is ready for pickup.'
                : 'You have declined this repair estimate. Your device will be prepared for collection in its intake condition.'}
            </p>
          </div>
        )}

        {/* Job Details Card */}
        <div className="spatial-card rounded-3xl p-6 sm:p-8 space-y-5 text-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--spatial-border)]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)]">Repair Ticket</span>
              <p className="text-base font-bold font-mono text-apple-blue">{job.job_number}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)]">Device</span>
              <p className="font-bold text-[var(--spatial-text-title)] text-sm">{job.device?.brand} {job.device?.model}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[var(--spatial-text-title)] uppercase text-[11px] mb-1.5 tracking-wider">Customer Reported Issue</h4>
            <p className="p-3.5 bg-[var(--spatial-bg-card-subtle)] rounded-xl border border-[var(--spatial-border)] italic text-[var(--spatial-text-body)]">
              "{job.customer_complaint}"
            </p>
          </div>

          {job.diagnosis && (
            <div className="space-y-3 pt-2">
              <div>
                <h4 className="font-bold text-[var(--spatial-text-title)] uppercase text-[11px] mb-1.5 tracking-wider">Technician Inspection Findings</h4>
                <p className="text-[var(--spatial-text-body)] leading-relaxed font-medium">{job.diagnosis.technician_findings || 'Diagnosis complete.'}</p>
              </div>

              <div>
                <h4 className="font-bold text-apple-blue uppercase text-[11px] mb-1.5 tracking-wider">Recommended Solution</h4>
                <p className="text-[var(--spatial-text-body)] leading-relaxed bg-apple-blue/5 p-3.5 rounded-xl border border-apple-blue/15">
                  {job.diagnosis.recommended_solution}
                </p>
              </div>
            </div>
          )}

          {/* Quotation Table */}
          {est && (
            <div className="pt-4 border-t border-[var(--spatial-border)] space-y-3">
              <h4 className="font-bold text-[var(--spatial-text-title)] uppercase text-[11px] tracking-wider">Cost Breakdown</h4>
              <div className="border border-[var(--spatial-border)] rounded-2xl overflow-x-auto table-scrollbar pb-1">
                <table className="w-full text-left text-xs min-w-[420px] whitespace-nowrap">
                  <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[10px] whitespace-nowrap tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5 whitespace-nowrap">Item / Service</th>
                      <th className="px-3.5 py-2.5 text-center whitespace-nowrap">Warranty</th>
                      <th className="px-3.5 py-2.5 text-center whitespace-nowrap">Qty</th>
                      <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Price</th>
                      <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {Number(est.labor_charge) > 0 && (
                      <tr>
                        <td className="px-3.5 py-2.5 font-medium text-[var(--spatial-text-title)]">Diagnostic Labor & Service</td>
                        <td className="px-3.5 py-2.5 text-center text-[var(--spatial-text-muted)] text-[10px]">—</td>
                        <td className="px-3.5 py-2.5 text-center text-[var(--spatial-text-body)]">1</td>
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[var(--spatial-text-muted)]">${Number(est.labor_charge).toFixed(2)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums font-semibold text-[var(--spatial-text-title)]">${Number(est.labor_charge).toFixed(2)}</td>
                      </tr>
                    )}
                    {(est.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3.5 py-2.5 font-medium text-[var(--spatial-text-title)]">{it.item_name}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          {it.warranty ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                              {it.warranty}
                            </span>
                          ) : (
                            <span className="text-[var(--spatial-text-muted)] text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-[var(--spatial-text-body)]">{it.quantity}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[var(--spatial-text-muted)]">${Number(it.unit_price).toFixed(2)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums font-semibold text-[var(--spatial-text-title)]">${Number(it.total_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Number(est.discount || 0) > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-1">
                  <span>
                    Discount Applied
                    {est.discount_type === 'PERCENTAGE' && est.discount_value ? ` (${est.discount_value}%)` : ''}:
                  </span>
                  <span className="font-mono tabular-nums">-${Number(est.discount).toFixed(2)}</span>
                </div>
              )}

              <div className="p-4 bg-[var(--spatial-bg-card-subtle)] rounded-2xl border border-[var(--spatial-border)] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--spatial-text-muted)] font-medium">Estimated Total (Taxes incl.)</span>
                </div>
                <span className="text-2xl font-bold font-mono tabular-nums text-[var(--spatial-text-title)]">${Number(est.total_amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Action Choice Buttons */}
          {!decisionDone && (
            <div className="pt-6 border-t border-[var(--spatial-border)] space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="success"
                  className="flex-1 py-3 text-sm font-semibold active:scale-98 shadow-sm cursor-pointer"
                  icon={CheckCircle2}
                  loading={submitting}
                  onClick={() => handleDecision('APPROVE')}
                >
                  Approve Repair (${Number(est?.total_amount || 0).toFixed(2)})
                </Button>

                <Button
                  variant="outline"
                  className="py-3 text-sm font-semibold text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/10 active:scale-98 cursor-pointer"
                  icon={XCircle}
                  loading={submitting}
                  onClick={() => setShowRejectInput(!showRejectInput)}
                >
                  Decline Repair Quote
                </Button>
              </div>

              {showRejectInput && (
                <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 space-y-3">
                  <label className="block text-xs font-bold text-rose-700 dark:text-rose-400">
                    Reason for declining (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Beyond budget / Decided to upgrade device instead..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="danger"
                      size="sm"
                      loading={submitting}
                      onClick={() => handleDecision('REJECT')}
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
