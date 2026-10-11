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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner label="Loading repair estimate details..." />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Link Expired or Invalid</h2>
          <p className="text-xs text-slate-500 mt-2">
            The repair estimate link you followed is no longer valid. Please contact the repair shop directly for assistance.
          </p>
        </div>
      </div>
    );
  }

  const est = job.estimate;
  const shop = job.shop;

  return (
    <div className="min-h-screen bg-slate-100/80 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-primary-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{shop?.name || 'TechFix Pro Repairs'}</h1>
          <p className="text-xs text-slate-500 mt-1">Official Repair Estimate & Authorization Request</p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 mt-3 font-medium">
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-primary-600" /> {shop?.phone}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary-600" /> {shop?.address}</span>
          </div>
        </div>

        {/* Decision Banner if already decided */}
        {decisionDone && (
          <div className={`p-5 rounded-2xl border text-center ${
            decisionDone === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {decisionDone === 'APPROVED' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600" />
              )}
              <h3 className="text-lg font-bold">
                {decisionDone === 'APPROVED' ? 'Repair Estimate Authorized!' : 'Repair Estimate Declined'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {decisionDone === 'APPROVED'
                ? 'Thank you! Our technicians have queued your device for repair and will notify you when it is ready for pickup.'
                : 'You have declined this repair estimate. Your device will be prepared for collection in its intake condition.'}
            </p>
          </div>
        )}

        {/* Job Details Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Repair Ticket</span>
              <p className="text-base font-bold font-mono text-primary-700">{job.job_number}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device</span>
              <p className="font-bold text-slate-900 text-sm">{job.device?.brand} {job.device?.model}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">Customer Reported Issue</h4>
            <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-700">
              "{job.customer_complaint}"
            </p>
          </div>

          {job.diagnosis && (
            <div className="space-y-3 pt-2">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">Technician Inspection Findings</h4>
                <p className="text-slate-800 leading-relaxed font-medium">{job.diagnosis.technician_findings || 'Diagnosis complete.'}</p>
              </div>

              <div>
                <h4 className="font-bold text-primary-700 uppercase text-[11px] mb-1">Recommended Solution</h4>
                <p className="text-slate-800 leading-relaxed bg-primary-50/50 p-3 rounded-xl border border-primary-100">
                  {job.diagnosis.recommended_solution}
                </p>
              </div>
            </div>
          )}

          {/* Quotation Table */}
          {est && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-[11px]">Cost Breakdown</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2">Item / Service</th>
                      <th className="px-3.5 py-2 text-center">Qty</th>
                      <th className="px-3.5 py-2 text-right">Price</th>
                      <th className="px-3.5 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3.5 py-2 font-medium">Diagnostic Labor & Service</td>
                      <td className="px-3.5 py-2 text-center">1</td>
                      <td className="px-3.5 py-2 text-right font-mono">${Number(est.labor_charge).toFixed(2)}</td>
                      <td className="px-3.5 py-2 text-right font-mono font-semibold">${Number(est.labor_charge).toFixed(2)}</td>
                    </tr>
                    {(est.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3.5 py-2 font-medium">{it.item_name}</td>
                        <td className="px-3.5 py-2 text-center">{it.quantity}</td>
                        <td className="px-3.5 py-2 text-right font-mono">${Number(it.unit_price).toFixed(2)}</td>
                        <td className="px-3.5 py-2 text-right font-mono font-semibold">${Number(it.total_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Estimated Total (Taxes incl.)</span>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Includes 90-Day Hardware Warranty</span>
                  </div>
                </div>
                <span className="text-2xl font-black font-mono text-slate-900">${Number(est.total_amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Action Choice Buttons */}
          {!decisionDone && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="success"
                  className="flex-1 py-3 text-sm font-bold shadow-md shadow-emerald-600/20"
                  icon={CheckCircle2}
                  loading={submitting}
                  onClick={() => handleDecision('APPROVE')}
                >
                  Approve Repair (${Number(est?.total_amount || 0).toFixed(2)})
                </Button>

                <Button
                  variant="outline"
                  className="py-3 text-sm font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  icon={XCircle}
                  loading={submitting}
                  onClick={() => setShowRejectInput(!showRejectInput)}
                >
                  Decline Repair Quote
                </Button>
              </div>

              {showRejectInput && (
                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-3">
                  <label className="block text-xs font-bold text-rose-900">
                    Reason for declining (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Beyond budget / Decided to upgrade device instead..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-xs focus:outline-none"
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
