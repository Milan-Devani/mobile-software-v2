import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Loader2, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorService } from '../../services/vendorService';
import { jobService } from '../../services/jobService';
import { Modal } from '../common/Modal';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * SendToVendorModal — shared by the Job Detail page and the Job List bulk bar.
 *
 * Props: open, onClose, jobId, jobIds[], jobLabel, onSuccess
 *
 * Only calls the NEW endpoints (/jobs/:id/send-to-vendor and
 * /jobs/bulk-send-to-vendor). The existing vendor chalan flow is untouched.
 */
export const SendToVendorModal = ({ open, onClose, jobId, jobIds = [], jobLabel = '', onSuccess }) => {
  const isBulk = jobIds.length > 1;
  const ids = useMemo(() => (jobIds.length > 0 ? jobIds : jobId ? [jobId] : []), [jobIds, jobId]);

  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [vendorId, setVendorId] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [expectedBackDate, setExpectedBackDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setVendorId('');
    setEstimatedCost('');
    setExpectedBackDate('');
    setNotes('');
    setSearch('');

    let cancelled = false;
    setLoadingVendors(true);
    vendorService
      .getVendors({ status: 'ACTIVE', limit: 200 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.vendors || (Array.isArray(res) ? res : []);
        setVendors(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setVendors([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVendors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredVendors = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        String(v.name || '').toLowerCase().includes(q) ||
        String(v.shop_name || '').toLowerCase().includes(q) ||
        String(v.specialty || '').toLowerCase().includes(q) ||
        String(v.mobile || v.phone || '').includes(q),
    );
  }, [vendors, debouncedSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!vendorId) {
      setError('Please choose a specialist partner.');
      return;
    }

    const payload = {
      vendor_id: vendorId,
      estimated_cost: parseFloat(estimatedCost) || 0,
      expected_back_date: expectedBackDate || undefined,
      notes: notes.trim(),
    };

    try {
      setSubmitting(true);
      const result = isBulk
        ? await jobService.bulkSendToVendor(ids, payload)
        : await jobService.sendToVendor(ids[0], payload);

      if (isBulk) {
        const d = result?.data || {};
        if (d.failed_count > 0) {
          toast(`${d.sent_count} sent, ${d.failed_count} skipped`, { icon: '⚠️' });
        } else {
          toast.success(result?.message || `${d.sent_count} device(s) sent`);
        }
      } else {
        toast.success(result?.message || 'Device sent to specialist partner');
      }

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not send to partner.');
      toast.error(err.message || 'Could not send to partner');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Send to Specialist Partner" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Truck className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff] shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-[var(--spatial-text-body)] leading-relaxed">
            {isBulk ? (
              <>
                Sending <strong className="text-[var(--spatial-text-title)]">{ids.length} devices</strong> to one
                partner. Each device stays linked to its job sheet so it can be traced back.
              </>
            ) : (
              <>
                Linking <strong className="text-[var(--spatial-text-title)]">{jobLabel || 'this job'}</strong> to a
                partner. The customer only ever sees &ldquo;Our Specialist Partner&rdquo; — never the vendor name.
              </>
            )}
          </p>
        </div>

        {/* Partner selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--spatial-text-muted)] mb-1.5">
            Specialist Partner <span className="text-rose-500">*</span>
          </label>

          {loadingVendors ? (
            <div className="flex items-center gap-2 text-[11.5px] text-[var(--spatial-text-muted)] py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading partners…
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-[11.5px] text-amber-600 dark:text-amber-400 py-2">
              No active partners found. Add a vendor in Vendor Management first.
            </p>
          ) : (
            <>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search partner, shop or specialty…"
                  className="spatial-input w-full pl-8 pr-3 py-1.5 text-xs rounded-xl"
                />
              </div>

              <div className="max-h-40 overflow-y-auto modal-scrollbar space-y-1 pr-1">
                {filteredVendors.length === 0 && (
                  <p className="text-[11.5px] text-[var(--spatial-text-muted)] py-2">No partner matches.</p>
                )}
                {filteredVendors.map((v) => {
                  const selected = vendorId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVendorId(v.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        selected
                          ? 'border-[#0071e3] bg-blue-500/10 ring-1 ring-[#0071e3]/30'
                          : 'border-[var(--spatial-border)] hover:border-[var(--spatial-border-highlight)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-[12px] font-semibold text-[var(--spatial-text-title)] truncate">
                          {v.name || v.shop_name || 'Partner'}
                        </span>
                        <span className="block text-[10.5px] text-[var(--spatial-text-muted)] truncate">
                          {[v.specialty, v.shop_name, v.mobile || v.phone].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          selected ? 'border-[#0071e3]' : 'border-[var(--spatial-border)]'
                        }`}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-[#0071e3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Optional details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--spatial-text-muted)] mb-1.5">
              Estimated Cost
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              className="spatial-input w-full px-3 py-1.5 text-xs rounded-xl"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--spatial-text-muted)] mb-1.5">
              Expected Back
            </label>
            <input
              type="date"
              value={expectedBackDate}
              onChange={(e) => setExpectedBackDate(e.target.value)}
              className="spatial-input w-full px-3 py-1.5 text-xs rounded-xl"
            />
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
            placeholder="What should the partner look at?"
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
            disabled={submitting || !vendorId || vendors.length === 0}
            className="spatial-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 active:scale-[0.98]"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
            {submitting ? 'Sending…' : isBulk ? `Send ${ids.length} Devices` : 'Send to Partner'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SendToVendorModal;

