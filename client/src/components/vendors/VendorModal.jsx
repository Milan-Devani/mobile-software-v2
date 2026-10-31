import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Phone,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { vendorService } from '../../services/vendorService';

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
    address: '',
    gst_number: '',
    opening_balance: '0',
    notes: '',
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [vendorPool, setVendorPool] = useState(existingVendors);

  // If existingVendors not provided or empty, fetch from API on open
  useEffect(() => {
    if (isOpen) {
      if (existingVendors && existingVendors.length > 0) {
        setVendorPool(existingVendors);
      } else {
        vendorService.getVendors({ limit: 150 })
          .then((res) => {
            const list = res?.data?.vendors || res?.vendors || [];
            setVendorPool(list);
          })
          .catch((err) => console.error('Failed to load vendors for duplicate detection', err));
      }
    }
  }, [isOpen, existingVendors]);

  // Reset or initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingVendor) {
        setFormData({
          name: editingVendor.name || '',
          shop_name: editingVendor.shop_name || '',
          mobile: editingVendor.mobile || '',
          address: editingVendor.address || '',
          gst_number: editingVendor.gst_number || '',
          opening_balance: String(editingVendor.opening_balance || 0),
          notes: editingVendor.notes || '',
          status: editingVendor.status || 'ACTIVE',
        });
      } else {
        setFormData({
          name: '',
          shop_name: '',
          mobile: '',
          address: '',
          gst_number: '',
          opening_balance: '0',
          notes: '',
          status: 'ACTIVE',
        });
      }
    }
  }, [isOpen, editingVendor]);

  // Duplicate / Existing Mobile Recommendation
  const matchedMobileVendor = useMemo(() => {
    const typedDigits = cleanPhone(formData.mobile);
    if (typedDigits.length < 5) return null;

    return (
      vendorPool.find((v) => {
        if (editingVendor && v.id === editingVendor.id) return false;
        const vDigits = cleanPhone(v.mobile);
        if (!vDigits) return false;
        // Exact match or suffix match (e.g. with country code)
        if (vDigits === typedDigits) return true;
        if (typedDigits.length >= 7 && (vDigits.endsWith(typedDigits) || typedDigits.endsWith(vDigits))) {
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
        return sName === q || (q.length >= 4 && sName.includes(q)) || (sName.length >= 4 && q.includes(sName));
      }) || null
    );
  }, [formData.shop_name, vendorPool, editingVendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Contact Person Name is required.');
      return;
    }
    if (!formData.mobile.trim()) {
      toast.error('Mobile Number is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        shop_name: formData.shop_name.trim(),
        mobile: formData.mobile.trim(),
        whatsapp: formData.mobile.trim(), // Default WhatsApp to mobile number seamlessly
        address: formData.address.trim(),
        gst_number: formData.gst_number.trim().toUpperCase(),
        opening_balance: parseFloat(formData.opening_balance) || 0,
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
        toast.success(`Vendor "${formData.name}" registered successfully.`);
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
      // Pre-fill form if editing
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
      title={editingVendor ? `Edit Vendor: ${editingVendor.name}` : 'Register New Vendor / Lab Partner'}
      subtitle="Manage contact coordinates, workshop location, and opening balance"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Contact Name & Shop Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Contact Person Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Bhai"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Shop
            </label>
            <input
              type="text"
              placeholder="e.g. Shree Sai Chip Level Lab"
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />

            {/* Shop Name Duplicate Match Recommendation */}
            {matchedShopVendor && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 font-bold text-[11px] text-sky-300">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    Existing Shop Found:
                  </div>
                  <p className="text-[11px] text-sky-200/90 truncate mt-0.5">
                    <strong>{matchedShopVendor.shop_name}</strong> • {matchedShopVendor.name} ({matchedShopVendor.mobile})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectRecommendation(matchedShopVendor)}
                  className="px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                >
                  {onSelectExisting ? 'Use This Vendor' : 'Load Details'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Mobile Number (with duplicate check) & GST Number (WhatsApp removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Mobile Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 9825123456"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />

            {/* Mobile Number Duplicate Match Recommendation */}
            {matchedMobileVendor && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 font-bold text-[11px] text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Mobile Already Registered:
                  </div>
                  <p className="text-[11px] text-amber-200/90 truncate mt-0.5">
                    <strong>{matchedMobileVendor.name}</strong> {matchedMobileVendor.shop_name ? `(${matchedMobileVendor.shop_name})` : ''} • {matchedMobileVendor.mobile}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectRecommendation(matchedMobileVendor)}
                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                >
                  {onSelectExisting ? 'Use This Vendor' : 'Load Details'}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              GST Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 24AAACS1234A1Z1"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 uppercase"
            />
          </div>
        </div>

        {/* Row 3: Opening Balance & Workshop Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Opening Balance (₹)
            </label>
            <input
              type="number"
              step="any"
              disabled={Boolean(editingVendor)}
              placeholder="0.00 (Positive: Payable, Negative: Receivable)"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Workshop / Lab Address
            </label>
            <input
              type="text"
              placeholder="e.g. Shop 402, Ring Road Electronics Market"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* Row 4: Notes / Specialization */}
        <div>
          <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
            Notes / Specialization
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Handles CPU reballing, Face ID repair, iPad glass lamination..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--spatial-border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={submitting}>
            {editingVendor ? 'Save Changes' : 'Register Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

