import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
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
  CreditCard,
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

const COMMON_REASONS = [
  'Display / Folder replacement',
  'Charging port / Flex change',
  'Battery replacement',
  'Motherboard IC / No power diagnosis',
  'Mic / Speaker / Audio issue',
  'Network / SIM card not reading',
  'Camera replacement',
  'Software update / FRP unlock',
];

export const ReceiveMobileModal = ({
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
    customer_name: '',
    estimated_cost: '',
    received_amount: '',
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
        customer_name: '',
        estimated_cost: '',
        received_amount: '',
        payment_mode: 'CASH',
        payment_ref: '',
        notes: '',
      });
    }
  }, [isOpen, vendors]);

  // Handle amount change and auto update payment_status
  const handleReceivedAmountChange = (val) => {
    const numReceived = parseFloat(val) || 0;
    const est = parseFloat(formData.estimated_cost) || 0;

    let newStatus = formData.payment_status;
    if (numReceived > 0) {
      if (est > 0 && numReceived >= est) {
        newStatus = 'PAID';
      } else {
        newStatus = 'ADVANCE';
      }
    } else if (newStatus === 'PAID' || newStatus === 'ADVANCE') {
      newStatus = 'PENDING';
    }

    setFormData((prev) => ({
      ...prev,
      received_amount: val,
      payment_status: newStatus,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      toast.error('Please select which vendor brought this mobile to you');
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
      toast.error('Please enter why the vendor sent this mobile (defect/issue)');
      return;
    }

    const numReceived = parseFloat(formData.received_amount) || 0;

    try {
      setSubmitting(true);
      const selectedVendor = vendors.find((v) => v.id === formData.vendor_id);
      const payload = {
        vendor_id: formData.vendor_id,
        txn_date: new Date().toISOString().split('T')[0],
        notes: formData.notes.trim(),
        received_amount: numReceived,
        paid_amount: numReceived,
        payment_mode: numReceived > 0 ? (formData.payment_mode || 'CASH') : 'NONE',
        payment_ref: formData.payment_ref.trim(),
        mobiles: [
          {
            brand: formData.brand.trim(),
            model: formData.model.trim(),
            imei: formData.imei.trim(),
            customer_name: (formData.customer_name || selectedVendor?.shop_name || selectedVendor?.name || 'Vendor Partner').trim(),
            repair_problem: formData.why_send.trim(),
            why_send: formData.why_send.trim(),
            payment_status: formData.payment_status,
            estimated_cost: parseFloat(formData.estimated_cost) || 0,
            notes: formData.notes.trim(),
          },
        ],
      };

      const res = await vendorService.recordVendorJobInward(payload);
      toast.success(`Mobile "${formData.brand} ${formData.model}" received into shop!`);
      onSuccess?.(res);
      onClose();
    } catch (err) {
      console.error('Failed to receive mobile from vendor:', err);
      toast.error(err.message || 'Failed to record received mobile from vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const showPaymentFields = parseFloat(formData.received_amount) > 0 || formData.payment_status === 'PAID' || formData.payment_status === 'ADVANCE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Other Vendor Sent to Me (Inward Repair)"
      subtitle="Record a handset brought to your shop by another vendor / partner to repair"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Select Vendor */}
        <div className="p-3.5 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              1. Which Vendor Brought This Mobile? <span className="text-rose-500">*</span>
            </label>
            {onOpenVendorCreate && (
              <button
                type="button"
                onClick={onOpenVendorCreate}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
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
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
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
                placeholder="e.g. Apple, Samsung, Vivo, Oppo"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-medium text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
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
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-emerald-400'
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
                placeholder="e.g. iPhone 13, Note 12 Pro"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-medium text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* IMEI Number */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1 flex items-center justify-between">
                <span>
                  IMEI / Serial Number <span className="text-rose-500">*</span>
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
                  className="w-full h-10 pl-9 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-mono font-bold tracking-wider text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* End Customer Name / Reference */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                End Customer Name <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma (Vendor's client)"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Why Send Me This & Payment Status */}
        <div className="p-3.5 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-3">
          <div className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            3. Reason & Payment Details
          </div>

          {/* Why Send Me This */}
          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
              Why Send Me This (Issue / Customer Defect Reported) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. No display light after drop; needs screen test or backlight coil repair..."
              value={formData.why_send}
              onChange={(e) => setFormData({ ...formData, why_send: e.target.value })}
              className="w-full p-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all resize-none"
            />
            {/* Quick reason chips */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_REASONS.slice(0, 4).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setFormData({ ...formData, why_send: reason })}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  + {reason.split('/')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Estimated Repair Charge */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Estimated Charge (₹) <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--spatial-text-muted)]">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1200"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  className="w-full h-10 pl-7 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Payment Input: Advance / Received Amount */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Payment / Advance Received (₹) <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 500"
                  value={formData.received_amount}
                  onChange={(e) => handleReceivedAmountChange(e.target.value)}
                  className="w-full h-10 pl-7 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-semibold text-emerald-400 placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
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
                  { value: 'ADVANCE', label: '🔵 Advance Received' },
                  { value: 'FREE', label: '⚪ Free / Warranty Rework' },
                ]}
              />
            </div>

            {/* Payment Mode (shown if amount received > 0 or status is PAID/ADVANCE) */}
            {showPaymentFields ? (
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
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
                  Additional Notes <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent repair requested"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* Optional Payment Ref & Notes if showPaymentFields is true */}
          {showPaymentFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                  Payment Reference / UTR <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cash receipt / Cheque No"
                  value={formData.payment_ref}
                  onChange={(e) => setFormData({ ...formData, payment_ref: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                  Additional Notes <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent repair requested"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 transition-all"
                />
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
            icon={ArrowDownLeft}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            loading={submitting}
          >
            Receive Mobile into Shop
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReceiveMobileModal;
