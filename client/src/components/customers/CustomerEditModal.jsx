import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerService } from '../../services/customerService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const CustomerEditModal = ({ isOpen, onClose, customer, onSuccess, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'male',
    user_type: 'End User',
    phone: '',
    whatsapp_number: '',
    alternate_phone: '',
    alternate_whatsapp: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    notes: '',
  });
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      const isSame = !customer.whatsapp_number || customer.whatsapp_number === customer.phone;
      setSameAsPhone(isSame);
      setFormData({
        full_name: customer.full_name || '',
        gender: customer.gender || 'male',
        user_type: customer.user_type || 'End User',
        phone: customer.phone || '',
        whatsapp_number: customer.whatsapp_number || customer.phone || '',
        alternate_phone: customer.alternate_phone || '',
        alternate_whatsapp: customer.alternate_whatsapp || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'phone' && sameAsPhone) {
        updated.whatsapp_number = value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 6) {
      toast.error('Valid phone number is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email address (Mail ID) is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!sameAsPhone && (!formData.whatsapp_number || !formData.whatsapp_number.trim())) {
      toast.error('Please enter a WhatsApp number or check "WhatsApp number is same as Phone number"');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        whatsapp_number: sameAsPhone ? formData.phone : (formData.whatsapp_number || formData.phone),
      };
      const updated = await customerService.updateCustomer(customer.id, payload);
      toast.success(`Customer "${formData.full_name}" updated successfully!`);
      if (onSuccess) onSuccess(updated);
      if (onSave) onSave(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Customer Profile"
      subtitle={`Update contact details & alternate numbers for ${customer.customer_code || 'customer'}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Gender & User Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none capitalize"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <select
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="End User">End User</option>
                <option value="Dealer">Dealer</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Numbers */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-900 block">Contact & WhatsApp Information</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Primary Phone *
              </label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="Primary phone number"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={sameAsPhone}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSameAsPhone(checked);
                    if (checked) {
                      setFormData((prev) => ({ ...prev, whatsapp_number: prev.phone }));
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <span className="font-medium">WhatsApp number is same as Phone number</span>
              </label>
            </div>

            {!sameAsPhone && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  name="whatsapp_number"
                  required={!sameAsPhone}
                  placeholder="Enter separate WhatsApp number"
                  value={formData.whatsapp_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Alternate Phone
              </label>
              <input
                type="tel"
                name="alternate_phone"
                placeholder="Family / Office phone"
                value={formData.alternate_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">
                Alternate WhatsApp (In-Repair)
              </label>
              <input
                type="tel"
                name="alternate_whatsapp"
                placeholder="Where to send repair updates"
                value={formData.alternate_whatsapp}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Email & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Email Address (Mail ID) *
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="customer@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Street Address
            </label>
            <input
              type="text"
              name="address"
              placeholder="Building, street, landmark"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Postal Code / PIN
            </label>
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Customer Remarks / Internal Notes
          </label>
          <textarea
            name="notes"
            rows="2"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Special customer preferences, corporate account details, etc."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" icon={Save} loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default CustomerEditModal;
