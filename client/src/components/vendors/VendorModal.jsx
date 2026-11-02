import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Phone,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  MapPin,
  FileText,
  IndianRupee,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { vendorService } from '../../services/vendorService';
import {
  PHONE_NUMBER_LENGTH,
  MAX_CURRENCY_AMOUNT,
  limitNumberValue,
  numberInputProps,
  sanitizePhoneNumber,
} from '../../utils/numberInput';

const cleanPhone = (val) => (val || '').replace(/\D/g, '');

export const VendorModal = ({
  isOpen,
  onClose,
  editingVendor = null,
  existingVendors = [],
  onSuccess,
  onSelectExisting,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    shop_name: '',
    mobile: '',
    email: '',
    specialization: '',
    address: '',
    gst_number: '',
    opening_balance: '0',
    notes: '',
    status: 'ACTIVE',
  });

  // Balance direction: 'ZERO' | 'PAYABLE' (we owe them) | 'RECEIVABLE' (they owe us / advance)
  const [balanceType, setBalanceType] = useState('ZERO');
  const [balanceAmount, setBalanceAmount] = useState('0');

  const [submitting, setSubmitting] = useState(false);
  const [vendorPool, setVendorPool] = useState(existingVendors);

  // If existingVendors not provided or empty, fetch from API on open
  useEffect(() => {
    if (isOpen) {
      if (existingVendors && existingVendors.length > 0) {
        setVendorPool(existingVendors);
      } else {
        vendorService
          .getVendors({ limit: 150 })
          .then((res) => {
            const list = res?.data?.vendors || res?.vendors || [];
            setVendorPool(list);
          })
          .catch((err) =>
            console.error('Failed to load vendors for duplicate detection', err)
          );
      }
    }
  }, [isOpen, existingVendors]);

  // Reset or initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingVendor) {
        const rawBal = Number(editingVendor.opening_balance || 0);
        setFormData({
          name: editingVendor.name || '',
          shop_name: editingVendor.shop_name || '',
          mobile: editingVendor.mobile || '',
          email: editingVendor.email || editingVendor.mail_id || editingVendor.mailid || '',
          specialization: editingVendor.specialization || editingVendor.specialize || '',
          address: editingVendor.address || '',
          gst_number: editingVendor.gst_number || '',
          opening_balance: String(rawBal),
          notes: editingVendor.notes || '',
          status: editingVendor.status || 'ACTIVE',
        });
        if (rawBal > 0) {
          setBalanceType('PAYABLE');
          setBalanceAmount(String(rawBal));
        } else if (rawBal < 0) {
          setBalanceType('RECEIVABLE');
          setBalanceAmount(String(Math.abs(rawBal)));
        } else {
          setBalanceType('ZERO');
          setBalanceAmount('0');
        }
      } else {
        setFormData({
          name: '',
          shop_name: '',
          mobile: '',
          email: '',
          specialization: '',
          address: '',
          gst_number: '',
          opening_balance: '0',
          notes: '',
          status: 'ACTIVE',
        });
        setBalanceType('ZERO');
        setBalanceAmount('0');
      }
    }
  }, [isOpen, editingVendor]);

  // Duplicate / Existing Mobile Recommendation
  const matchedMobileVendor = useMemo(() => {
    const typedDigits = cleanPhone(formData.mobile);
    if (typedDigits.length !== PHONE_NUMBER_LENGTH) return null;

    return (
      vendorPool.find((v) => {
        if (editingVendor && v.id === editingVendor.id) return false;
        const vDigits = cleanPhone(v.mobile);
        if (!vDigits) return false;
        if (vDigits === typedDigits) return true;
        if (
          typedDigits.length >= 7 &&
          (vDigits.endsWith(typedDigits) || typedDigits.endsWith(vDigits))
        ) {
          return true;
        }
        return false;
      }) || null
    );
  }, [formData.mobile, vendorPool, editingVendor]);

  // Duplicate / Existing Shop Name Recommendation
  const matchedShopVendor = useMemo(() => {
    const q = (formData.shop_name || '').trim().toLowerCase();
    if (q.length < 3) return null;

    return (
      vendorPool.find((v) => {
        if (editingVendor && v.id === editingVendor.id) return false;
        const sName = (v.shop_name || '').trim().toLowerCase();
        if (!sName) return false;
        return (
          sName === q ||
          (q.length >= 4 && sName.includes(q)) ||
          (sName.length >= 4 && q.includes(sName))
        );
      }) || null
    );
  }, [formData.shop_name, vendorPool, editingVendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter the Contact Person Name.');
      return;
    }
    if (!formData.mobile.trim()) {
      toast.error('Please enter the 10-digit Mobile Number.');
      return;
    }
    if (cleanPhone(formData.mobile).length !== PHONE_NUMBER_LENGTH) {
      toast.error('Mobile Number must be exactly 10 digits.');
      return;
    }

    // Compute final opening balance
    let computedOpeningBal = 0;
    if (!editingVendor) {
      const amt = Math.max(0, parseFloat(balanceAmount) || 0);
      if (balanceType === 'PAYABLE') {
        computedOpeningBal = amt; // Positive = we owe them
      } else if (balanceType === 'RECEIVABLE') {
        computedOpeningBal = -amt; // Negative = they owe us / advance
      } else {
        computedOpeningBal = 0;
      }
    } else {
      computedOpeningBal = parseFloat(formData.opening_balance) || 0;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        shop_name: formData.shop_name.trim(),
        mobile: formData.mobile.trim(),
        whatsapp: formData.mobile.trim(), // Seamlessly link WhatsApp to mobile
        email: formData.email.trim(),
        specialization: formData.specialization.trim() || formData.notes.trim(),
        address: formData.address.trim(),
        gst_number: formData.gst_number.trim().toUpperCase(),
        opening_balance: computedOpeningBal,
        notes: formData.notes.trim(),
        status: formData.status,
      };

      if (editingVendor) {
        const res = await vendorService.updateVendor(editingVendor.id, payload);
        toast.success(`Vendor "${formData.name}" updated successfully.`);
        onSuccess?.(res.data?.vendor || res.data);
      } else {
        const res = await vendorService.createVendor(payload);
        const createdVendor = res.data?.vendor || res.data;
        toast.success(`Vendor "${formData.name}" added successfully.`);
        onSuccess?.(createdVendor);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save vendor details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectRecommendation = (targetVendor) => {
    if (onSelectExisting) {
      onSelectExisting(targetVendor);
      onClose();
    } else {
      setFormData({
        name: targetVendor.name || '',
        shop_name: targetVendor.shop_name || '',
        mobile: targetVendor.mobile || '',
        address: targetVendor.address || '',
        gst_number: targetVendor.gst_number || '',
        opening_balance: String(targetVendor.opening_balance || 0),
        notes: targetVendor.notes || '',
        status: targetVendor.status || 'ACTIVE',
      });
      toast.success(`Loaded details for existing vendor: ${targetVendor.name}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingVendor
          ? `Edit Vendor: ${editingVendor.name}`
          : 'Add New Repair Shop / Vendor'
      }
      subtitle={
        editingVendor
          ? 'Update contact details, workshop address, and repair specialization'
          : 'Save an outside repair lab, chip-level technician, or partner shop you work with'
      }
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="vendor-form"
            variant="primary"
            size="sm"
            loading={submitting}
          >
            {editingVendor ? 'Save Changes' : 'Save & Register Vendor'}
          </Button>
        </div>
      }
    >
      <form id="vendor-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
        {/* Section 1: Contact & Shop Information */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-[var(--spatial-border)] text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span>1. Contact & Shop Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Contact Person Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Bhai or Amit Kumar"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-medium text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            {/* Shop / Lab Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Shop / Lab Name{' '}
                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                  (Optional)
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Shree Sai Chip Level Lab"
                value={formData.shop_name}
                onChange={(e) =>
                  setFormData({ ...formData, shop_name: e.target.value })
                }
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-medium text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />

              {/* Shop Name Duplicate Recommendation */}
              {matchedShopVendor && (
                <div className="mt-1.5 p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 font-bold text-[11px] text-sky-300">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      Existing Shop Found:
                    </div>
                    <p className="text-[11px] text-sky-200/90 truncate mt-0.5">
                      <strong>{matchedShopVendor.shop_name}</strong> •{' '}
                      {matchedShopVendor.name} ({matchedShopVendor.mobile})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectRecommendation(matchedShopVendor)
                    }
                    className="px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-[10px] cursor-pointer shrink-0 transition-colors"
                  >
                    {onSelectExisting ? 'Use This Vendor' : 'Load Details'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Number */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Mobile Number <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                  (10 Digits — Used for calls & WhatsApp)
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--spatial-text-muted)]">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={PHONE_NUMBER_LENGTH}
                  pattern="[0-9]{10}"
                  {...numberInputProps({ allowDecimal: false })}
                  placeholder="e.g. 9825123456"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mobile: sanitizePhoneNumber(e.target.value),
                    })
                  }
                  className="w-full h-10 pl-12 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-bold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 tracking-wider transition-all"
                />
              </div>

              {/* Mobile Number Duplicate Recommendation */}
              {matchedMobileVendor && (
                <div
                  role="status"
                  className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 font-bold text-[11px] text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      This number is already registered!
                    </div>
                    <p className="text-[11px] text-amber-200/90 truncate mt-0.5">
                      <strong>{matchedMobileVendor.name}</strong>{' '}
                      {matchedMobileVendor.shop_name
                        ? `(${matchedMobileVendor.shop_name})`
                        : ''}{' '}
                      • {matchedMobileVendor.mobile}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectRecommendation(matchedMobileVendor)
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer transition-colors shrink-0"
                  >
                    {onSelectExisting
                      ? 'Select This Vendor'
                      : 'Load Existing Details'}
                  </button>
                </div>
              )}
            </div>

            {/* Mail ID / Email */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Mail ID / Email{' '}
                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                  (Optional)
                </span>
              </label>
              <input
                type="email"
                placeholder="e.g. vendor@repairlab.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Workshop Location & Specialization */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-[var(--spatial-border)] text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>2. Location & Specialization</span>
          </div>

          <div className="space-y-3">
            {/* Specialization */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Specialize / Specialization{' '}
                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                  (What repair service do they specialize in?)
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Display Glass Change, Motherboard IC Repair, Face ID, CPU Dead"
                value={formData.specialization}
                onChange={(e) =>
                  setFormData({ ...formData, specialization: e.target.value })
                }
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {['Motherboard IC Repair', 'Display Glass Change', 'Face ID / Fingerprint', 'CPU Dead / Reballing', 'Software / Dead Boot'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      const curr = formData.specialization ? `${formData.specialization}, ${chip}` : chip;
                      setFormData({ ...formData, specialization: curr });
                    }}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-sky-400 hover:border-sky-500/40 transition-colors cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Workshop Address */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Workshop / Shop Address{' '}
                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                  (Optional)
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Shop 402, Ring Road Electronics Market, Surat"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                Notes / Workshop Remarks{' '}
                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                  (Optional)
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Turnaround 2-3 days, accepts UPI"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Opening Balance / Previous Khata (Only when adding new vendor) */}
        {!editingVendor ? (
          <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-[var(--spatial-border)] text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
              <IndianRupee className="w-3.5 h-3.5 text-sky-400" />
              <span>3. Previous Balance / Khata (Starting Balance)</span>
            </div>

            <p className="text-[11px] text-[var(--spatial-text-muted)]">
              Do you already have an old balance or pending dues with this shop
              before today?
            </p>

            {/* Non-technical balance selector radio pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  balanceType === 'ZERO'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                    : 'bg-[var(--spatial-input-bg)] border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                }`}
              >
                <input
                  type="radio"
                  name="balanceType"
                  value="ZERO"
                  checked={balanceType === 'ZERO'}
                  onChange={() => {
                    setBalanceType('ZERO');
                    setBalanceAmount('0');
                  }}
                  className="sr-only"
                />
                <span className="w-3 h-3 rounded-full border flex items-center justify-center shrink-0">
                  {balanceType === 'ZERO' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  )}
                </span>
                <span>No Old Balance (₹0)</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  balanceType === 'PAYABLE'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                    : 'bg-[var(--spatial-input-bg)] border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                }`}
              >
                <input
                  type="radio"
                  name="balanceType"
                  value="PAYABLE"
                  checked={balanceType === 'PAYABLE'}
                  onChange={() => setBalanceType('PAYABLE')}
                  className="sr-only"
                />
                <span className="w-3 h-3 rounded-full border flex items-center justify-center shrink-0">
                  {balanceType === 'PAYABLE' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  )}
                </span>
                <span>We Owe Them Money</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  balanceType === 'RECEIVABLE'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-[var(--spatial-input-bg)] border-[var(--spatial-border)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                }`}
              >
                <input
                  type="radio"
                  name="balanceType"
                  value="RECEIVABLE"
                  checked={balanceType === 'RECEIVABLE'}
                  onChange={() => setBalanceType('RECEIVABLE')}
                  className="sr-only"
                />
                <span className="w-3 h-3 rounded-full border flex items-center justify-center shrink-0">
                  {balanceType === 'RECEIVABLE' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </span>
                <span>Advance / They Owe Us</span>
              </label>
            </div>

            {/* Amount input if not zero */}
            {balanceType !== 'ZERO' && (
              <div className="pt-1.5 animate-in fade-in">
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                  {balanceType === 'PAYABLE'
                    ? 'Amount We Owe to This Vendor (₹)'
                    : 'Advance Amount Paid to This Vendor (₹)'}
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--spatial-text-muted)]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={balanceAmount === '0' ? '' : balanceAmount}
                    onFocus={() => {
                      if (balanceAmount === '0') setBalanceAmount('');
                    }}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-bold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
            )}

            {/* Optional GST Number */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] mb-1">
                GST Number{' '}
                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                  (Optional — Leave blank if shop has no GST)
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. 24AAACS1234A1Z1"
                value={formData.gst_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gst_number: e.target.value.toUpperCase(),
                  })
                }
                className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 uppercase"
              />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] flex items-center justify-between text-xs text-[var(--spatial-text-muted)]">
            <span>
              Status:{' '}
              <strong className="text-[var(--spatial-text-title)]">
                {formData.status}
              </strong>
            </span>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="px-2.5 py-1 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-lg text-xs font-bold text-[var(--spatial-text-title)] cursor-pointer"
            >
              <option value="ACTIVE">Active Vendor</option>
              <option value="INACTIVE">Inactive / Paused</option>
            </select>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default VendorModal;
