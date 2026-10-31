import React, { useState } from 'react';
import { IndianRupee, CreditCard, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SpatialSelect } from '../common/SpatialSelect';
import { vendorService } from '../../services/vendorService';
import { formatIndianCurrency } from '../../utils/billFormatters';

export const VendorPaymentModal = ({
  isOpen,
  onClose,
  vendors = [],
  selectedVendorId = '',
  onPaymentRecorded,
}) => {
  const [vendorId, setVendorId] = useState(selectedVendorId || '');
  const [paymentType, setPaymentType] = useState('PAYMENT_TO_VENDOR'); // or 'PAYMENT_FROM_VENDOR'
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync prop changes
  React.useEffect(() => {
    if (selectedVendorId) {
      setVendorId(selectedVendorId);
    }
  }, [selectedVendorId]);

  const activeVendor = vendors.find((v) => v.id === vendorId);
  const currentBalance = activeVendor ? activeVendor.current_balance || 0 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error('Please select a vendor.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await vendorService.recordVendorPayment({
        vendor_id: vendorId,
        payment_type: paymentType,
        amount: numAmount,
        payment_mode: paymentMode,
        reference_no: referenceNo,
        notes,
        date,
      });

      const payment = res?.data?.payment || res?.payment;
      if (res?.success || payment) {
        toast.success(`Payment voucher #${payment?.voucher_no || 'recorded'} recorded!`);
        if (payment) onPaymentRecorded?.(payment);
        onClose();
        // Reset
        setAmount('');
        setReferenceNo('');
        setNotes('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Vendor Payment / Settlement"
      subtitle="Post debit or credit payment vouchers directly to the vendor ledger"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vendor Selector */}
        {!selectedVendorId && (
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Select Vendor *
            </label>
            <SpatialSelect
              value={vendorId}
              onChange={(val) => setVendorId(val)}
              options={vendors.map((v) => ({
                value: v.id,
                label: `${v.name} (${v.shop_name || 'Vendor'})`,
                subtitle: `Phone: ${v.mobile} • Bal: ₹${v.current_balance || 0}`,
                badge: v.vendor_code,
              }))}
              placeholder="-- Choose Vendor --"
              searchable
            />
          </div>
        )}

        {/* Selected Vendor Balance Card */}
        {activeVendor && (
          <div className="p-3 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] flex items-center justify-between text-xs">
            <div>
              <span className="text-[var(--spatial-text-muted)] text-[11px] block">Current Balance:</span>
              <span className="font-mono font-bold text-sm text-[var(--spatial-text-title)]">
                {formatIndianCurrency(Math.abs(currentBalance), true)}
              </span>
              <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                currentBalance > 0
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : currentBalance < 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-400'
              }`}>
                {currentBalance > 0 ? 'PAYABLE (WE OWE)' : currentBalance < 0 ? 'RECEIVABLE (OWED TO US)' : 'SETTLED (NIL)'}
              </span>
            </div>
            <div className="text-right text-[11px] text-[var(--spatial-text-muted)]">
              <span className="block font-semibold text-[var(--spatial-text-title)]">{activeVendor.name}</span>
              <span>{activeVendor.mobile}</span>
            </div>
          </div>
        )}

        {/* Payment Direction: To Vendor vs From Vendor */}
        <div>
          <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1.5">
            Payment Direction *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentType('PAYMENT_TO_VENDOR')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                paymentType === 'PAYMENT_TO_VENDOR'
                  ? 'bg-[#0071e3]/12 border-[#0071e3] text-[#0071e3] dark:bg-[#0a84ff]/18 dark:border-[#0a84ff] dark:text-[#0a84ff] ring-2 ring-[#0071e3]/20 shadow-xs'
                  : 'bg-[var(--spatial-input-bg)] border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
              }`}
            >
              <div className="text-xs font-semibold">Payment to Vendor</div>
              <div className="text-[10px] opacity-80 mt-0.5">We pay vendor (reduces payable)</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentType('PAYMENT_FROM_VENDOR')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                paymentType === 'PAYMENT_FROM_VENDOR'
                  ? 'bg-emerald-500/12 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-[var(--spatial-input-bg)] border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
              }`}
            >
              <div className="text-xs font-semibold">Payment from Vendor</div>
              <div className="text-[10px] opacity-80 mt-0.5">Vendor pays us (B2B repairs)</div>
            </button>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[var(--spatial-text-muted)]">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full h-11 pl-8 pr-3 spatial-input rounded-xl text-sm font-mono font-bold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 spatial-input rounded-xl text-xs sm:text-sm font-medium text-[var(--spatial-text-title)] focus:outline-none"
            />
          </div>
        </div>

        {/* Payment Mode & Reference Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Payment Mode
            </label>
            <SpatialSelect
              value={paymentMode}
              onChange={(val) => setPaymentMode(val)}
              options={[
                { value: 'UPI', label: 'UPI / QR Code / GPay' },
                { value: 'CASH', label: 'Cash in Hand' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / IMPS' },
                { value: 'CARD', label: 'Credit / Debit Card' },
                { value: 'CHEQUE', label: 'Cheque' },
              ]}
              searchable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Reference / UTR / Txn #
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref / Cheque No"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full h-11 px-3 spatial-input rounded-xl text-xs sm:text-sm font-mono text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
            Notes / Description
          </label>
          <input
            type="text"
            placeholder="e.g. Full settlement for March batch, or advance for motherboard repair"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-11 px-3 spatial-input rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--spatial-border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={submitting}>
            Record Payment Voucher
          </Button>
        </div>
      </form>
    </Modal>
  );
};
