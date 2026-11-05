import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Smartphone,
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  IndianRupee,
  CheckCircle2,
  Plus,
  Tag,
  Hash,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SpatialSelect } from '../common/SpatialSelect';
import { vendorService } from '../../services/vendorService';

const POPULAR_BRANDS = [
  'Apple',
  'Samsung',
  'Vivo',
  'Oppo',
  'OnePlus',
  'Xiaomi',
  'Realme',
  'Google',
  'Motorola',
];

const COMMON_ISSUES = [
  'Touch IC repair / Unresponsive touch',
  'Display glass change / Lamination',
  'CPU reballing / Dead motherboard',
  'Face ID / Front camera repair',
  'Audio IC / No sound in call',
  'Charging IC / Short circuit',
  'Water damage cleaning & diagnosis',
  'Back glass laser removal & replacement',
];

export const SendMobileModal = ({
  isOpen,
  onClose,
  vendors = [],
  onSuccess,
  onOpenVendorCreate,
}) => {
  const [formData, setFormData] = useState({
    vendor_id: '',
    brand: '',
    model: '',
    imei: '',
    why_send: '',
    payment_status: 'PENDING',
    expected_return_date: '',
    estimated_cost: '',
    paid_amount: '',
    payment_mode: 'CASH',
    payment_ref: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        vendor_id: vendors.length > 0 ? vendors[0].id : '',
        brand: '',
        model: '',
        imei: '',
        why_send: '',
        payment_status: 'PENDING',
        expected_return_date: '',
        estimated_cost: '',
        paid_amount: '',
        payment_mode: 'CASH',
        payment_ref: '',
        notes: '',
      });
    }
  }, [isOpen, vendors]);

  // Handle amount change and auto update payment_status
  const handlePaidAmountChange = (val) => {
    const numPaid = parseFloat(val) || 0;
    const est = parseFloat(formData.estimated_cost) || 0;

    let newStatus = formData.payment_status;
    if (numPaid > 0) {
      if (est > 0 && numPaid >= est) {
        newStatus = 'PAID';
      } else {
        newStatus = 'ADVANCE';
      }
    } else if (newStatus === 'PAID' || newStatus === 'ADVANCE') {
      newStatus = 'PENDING';
    }

    setFormData((prev) => ({
      ...prev,
      paid_amount: val,
      payment_status: newStatus,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      toast.error('Please select the vendor / workshop');
      return;
    }
    if (!formData.brand.trim()) {
      toast.error('Please enter the mobile Brand name');
      return;
    }
    if (!formData.model.trim()) {
      toast.error('Please enter the Model name');
      return;
    }
    if (!formData.imei.trim()) {
      toast.error('Please enter the IMEI or Serial number');
      return;
    }
    if (!formData.why_send.trim()) {
      toast.error('Please enter why you are sending this mobile (defect/issue)');
      return;
    }

    const numPaid = parseFloat(formData.paid_amount) || 0;

    try {
      setSubmitting(true);
      const payload = {
        vendor_id: formData.vendor_id,
        txn_date: new Date().toISOString().split('T')[0],
        notes: formData.notes.trim(),
        paid_amount: numPaid,
        payment_mode: numPaid > 0 ? (formData.payment_mode || 'CASH') : 'NONE',
        payment_ref: formData.payment_ref.trim(),
        mobiles: [
          {
            brand: formData.brand.trim(),
            model: formData.model.trim(),
            imei: formData.imei.trim(),
            repair_problem: formData.why_send.trim(),
            why_send: formData.why_send.trim(),
            payment_status: formData.payment_status,
            expected_return_date: formData.expected_return_date || null,
            estimated_cost: parseFloat(formData.estimated_cost) || 0,
            notes: formData.notes.trim(),
          },
        ],
      };

      const res = await vendorService.sendMobilesToVendor(payload);
      toast.success(`Mobile "${formData.brand} ${formData.model}" dispatched to vendor!`);
      onSuccess?.(res);
      onClose();
    } catch (err) {
      console.error('Failed to send mobile to vendor:', err);
      toast.error(err.message || 'Failed to dispatch mobile to vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const showPaymentFields = parseFloat(formData.paid_amount) > 0 || formData.payment_status === 'PAID' || formData.payment_status === 'ADVANCE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Mobile to Other Vendor"
      subtitle="Outsource mobile to an outside repair lab or specialist"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Select Vendor */}
        <div className="p-3.5 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              1. Select Vendor / Partner Lab <span className="text-rose-500">*</span>
            </label>
            {onOpenVendorCreate && (
              <button
                type="button"
                onClick={onOpenVendorCreate}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> + New Vendor
              </button>
            )}
          </div>

          {vendors.length === 0 ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
              <span>No vendors found. Please add a vendor first.</span>
              {onOpenVendorCreate && (
                <Button size="xs" onClick={onOpenVendorCreate}>
                  Add Vendor
                </Button>
              )}
            </div>
          ) : (
            <SpatialSelect
              value={formData.vendor_id}
              onChange={(val) => setFormData({ ...formData, vendor_id: val })}
              options={vendors.map((v) => ({
                value: v.id,
                label: `${v.name} ${v.shop_name ? `(${v.shop_name})` : ''} • ${v.specialization || v.mobile || 'Vendor'}`,
              }))}
            />
          )}
        </div>

        {/* Step 2: Device Details */}
        <div className="p-3.5 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-3">
          <div className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            2. Mobile Phone Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Brand Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apple, Samsung, OnePlus"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-medium text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 transition-all"
              />
              {/* Quick Brand chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {POPULAR_BRANDS.slice(0, 6).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setFormData({ ...formData, brand: b })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      formData.brand.toLowerCase() === b.toLowerCase()
                        ? 'bg-sky-500 text-white'
                        : 'bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-sky-400'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Model Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. iPhone 15 Pro, Galaxy S23 Ultra"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-medium text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            {/* IMEI Number */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[var(--spatial-text-title)] mb-1 flex items-center justify-between">
                <span>
                  IMEI / Serial Number <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-[var(--spatial-text-muted)] font-mono">
                  15 Digits recommended
                </span>
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 354892091234567"
                  value={formData.imei}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value.trim() })}
                  className="w-full h-10 pl-9 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-mono font-bold tracking-wider text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Why I Send This & Payment Status */}
        <div className="p-3.5 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-3">
          <div className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-sky-400" />
            3. Reason & Payment Details
          </div>

          {/* Why I Send This */}
          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
              Why I Send This (Defect / Issue / Required Repair) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Touch IC damaged, needs micro-soldering; or Display glass cracked, needs laminating..."
              value={formData.why_send}
              onChange={(e) => setFormData({ ...formData, why_send: e.target.value })}
              className="w-full p-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 transition-all resize-none"
            />
            {/* Quick issue chips */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_ISSUES.slice(0, 4).map((issue) => (
                <button
                  key={issue}
                  type="button"
                  onClick={() => setFormData({ ...formData, why_send: issue })}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-sky-400 transition-colors cursor-pointer"
                >
                  + {issue.split('/')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Estimated Cost */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Estimated Cost (₹) <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--spatial-text-muted)]">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1500"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  className="w-full h-10 pl-7 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            {/* Payment Input: Advance / Paid Amount */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Payment / Advance Paid (₹) <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-sky-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 500"
                  value={formData.paid_amount}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  className="w-full h-10 pl-7 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-semibold text-sky-400 placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            {/* Payment Status Dropdown Menu */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Payment Status <span className="text-rose-500">*</span>
              </label>
              <SpatialSelect
                value={formData.payment_status}
                onChange={(val) => setFormData({ ...formData, payment_status: val })}
                options={[
                  { value: 'PENDING', label: '🟡 Pending / Unpaid' },
                  { value: 'PAID', label: '🟢 Fully Paid' },
                  { value: 'ADVANCE', label: '🔵 Advance Paid' },
                  { value: 'FREE', label: '⚪ Free / Warranty Rework' },
                ]}
              />
            </div>

            {/* Payment Mode (shown if amount paid > 0 or status is PAID/ADVANCE) */}
            {showPaymentFields ? (
              <div>
                <label className="text-xs font-semibold text-[var(--spatial-text-title)] mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-sky-400" />
                  Payment Mode
                </label>
                <SpatialSelect
                  value={formData.payment_mode}
                  onChange={(val) => setFormData({ ...formData, payment_mode: val })}
                  options={[
                    { value: 'CASH', label: '💵 Cash' },
                    { value: 'UPI', label: '📱 UPI / QR Code' },
                    { value: 'CARD', label: '💳 Debit / Credit Card' },
                    { value: 'BANK_TRANSFER', label: '🏦 Bank Transfer / NEFT' },
                    { value: 'OTHER', label: '📑 Other' },
                  ]}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                  Expected Return Date <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={formData.expected_return_date}
                    onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                    className="w-full h-10 pl-9 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-medium text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Optional Payment Ref & Expected Return Date if showPaymentFields is true */}
          {showPaymentFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-[var(--spatial-text-title)] mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                  Payment Reference / UTR <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No / Cash note"
                  value={formData.payment_ref}
                  onChange={(e) => setFormData({ ...formData, payment_ref: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                  Expected Return Date <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={formData.expected_return_date}
                    onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                    className="w-full h-10 pl-9 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-medium text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={ArrowUpRight}
            loading={submitting}
          >
            Dispatch to Vendor
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SendMobileModal;
