import React, { useState } from 'react';
import { PackageCheck, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobService } from '../../services/jobService';
import { Modal } from '../common/Modal';

/**
 * ReceiveFromVendorModal — closes the "sent to partner" round-trip.
 * Used from Job Detail and from the Job List row/bulk actions.
 *
 * Props: open, onClose, jobId, jobIds[], jobLabel, vendorName, onSuccess
 */
export const ReceiveFromVendorModal = ({
  open,
  onClose,
  jobId,
  jobIds = [],
  jobLabel = '',
  vendorName = '',
  onSuccess,
}) => {
  const isBulk = jobIds.length > 1;
  const ids = jobIds.length > 0 ? jobIds : jobId ? [jobId] : [];

  const [actualCost, setActualCost] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      const payload = {
        payment_status: paymentStatus,
        notes: notes.trim(),
        ...(isBulk ? {} : { actual_cost: actualCost === '' ? null : parseFloat(actualCost) || 0 }),
      };

      const res = isBulk
        ? await jobService.bulkReceiveFromVendor(ids, payload)
        : await jobService.receiveFromVendor(ids[0], payload);

      toast.success(res?.message || 'Device received back');
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not receive the device.');
      toast.error(err.message || 'Could not receive the device');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Receive Back from Partner" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-[var(--spatial-text-body)] leading-relaxed">
            {isBulk ? (
              <>
                Marking <strong className="text-[var(--spatial-text-title)]">{ids.length} devices</strong> as received
                back.
              </>
            ) : (
              <>
                Receiving <strong className="text-[var(--spatial-text-title)]">{jobLabel || 'this device'}</strong>
                {vendorName ? (
                  <>
                    {' '}back from <strong className="text-[var(--spatial-text-title)]">{vendorName}</strong>
                  </>
                ) : null}
                . It becomes available for QC, pickup and invoicing again.
              </>
            )}
          </p>
        </div>

        {!isBulk && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--spatial-text-muted)] mb-1.5">
              Actual Cost Charged
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              placeholder="Leave blank if unchanged"
              className="spatial-input w-full px-3 py-1.5 text-xs rounded-xl"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--spatial-text-muted)] mb-1.5">
            Partner Payment
          </label>
          <div className="flex gap-2">
            {[
              { key: 'PENDING', label: 'Not paid yet' },
              { key: 'PAID', label: 'Paid' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPaymentStatus(opt.key)}
                className={`flex-1 px-3 py-2 rounded-xl border text-[11.5px] font-medium transition-all ${
                  paymentStatus === opt.key
                    ? 'border-[#0071e3] bg-blue-500/10 ring-1 ring-[#0071e3]/30 text-[var(--spatial-text-title)]'
                    : 'border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:border-[var(--spatial-border-highlight)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--spatial-text-muted)] mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Display replaced, tested OK"
            className="spatial-input w-full px-3 py-2 text-xs rounded-xl resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="spatial-btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="spatial-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 active:scale-[0.98]"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
            {submitting ? 'Receiving…' : isBulk ? `Receive ${ids.length}` : 'Mark Received'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReceiveFromVendorModal;
