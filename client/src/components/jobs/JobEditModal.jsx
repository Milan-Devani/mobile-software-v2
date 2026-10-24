import React, { useState, useEffect } from 'react';
import { Wrench, Smartphone, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobService } from '../../services/jobService';
import { authService } from '../../services/authService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SpatialSelect } from '../common/SpatialSelect';
import { INWARD_CHECKLIST_CONFIG, resolveChecklistValue } from '../../utils/checklistConstants';

export const JobEditModal = ({ isOpen, onClose, job, onSuccess }) => {
  const [formData, setFormData] = useState({
    customer_complaint: '',
    status: 'RECEIVED',
    priority: 'NORMAL',
    estimated_delivery_date: '',
    assigned_technician_id: '',
    internal_notes: '',
    device_data: {
      brand: '',
      model: '',
      color: '',
      storage_capacity: '',
      imei: '',
      serial_number: '',
      passcode: '',
      operating_system: 'iOS/Android',
    },
    device_condition: {},
    accessories_received: [],
  });

  const [technicians, setTechnicians] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      authService.getUsers()
        .then((users) => {
          setTechnicians((users || []).filter((u) => ['technician', 'admin'].includes(u.role_id)));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (job) {
      const dev = job.device || {};
      setFormData({
        customer_complaint: job.customer_complaint || '',
        status: job.status || 'RECEIVED',
        priority: job.priority || 'NORMAL',
        estimated_delivery_date: job.estimated_delivery_date ? job.estimated_delivery_date.split('T')[0] : '',
        assigned_technician_id: job.assigned_technician_id || '',
        internal_notes: job.internal_notes || '',
        device_data: {
          brand: dev.brand || '',
          model: dev.model || '',
          color: dev.color || '',
          storage_capacity: dev.storage_capacity || '',
          imei: dev.imei || '',
          serial_number: dev.serial_number || '',
          passcode: dev.passcode || '',
          operating_system: dev.operating_system || 'iOS/Android',
        },
        device_condition: { ...(job.device_condition || {}) },
        accessories_received: [...(job.accessories_received || [])],
      });
    }
  }, [job]);

  if (!isOpen || !job) return null;

  const handleDeviceChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedDeviceData = { ...prev.device_data, [name]: value };
      if (name === 'brand' && value) {
        if (value.trim().toLowerCase() === 'apple') {
          updatedDeviceData.operating_system = 'iOS';
        } else {
          updatedDeviceData.operating_system = 'Android';
        }
      }
      return {
        ...prev,
        device_data: updatedDeviceData,
      };
    });
  };

  const handleChecklistSet = (key, val) => {
    setFormData((prev) => {
      const cond = { ...prev.device_condition };
      const currentChecklist = { ...(cond.checklist || {}) };
      if (key === 'powers_on' && val === 'No') {
        INWARD_CHECKLIST_CONFIG.forEach((it) => {
          const negVal = it.type === 'working' ? 'No' : 'Yes';
          currentChecklist[it.key] = negVal;
          cond[it.key] = negVal;
        });
      } else {
        currentChecklist[key] = val;
        cond[key] = val;
      }
      return {
        ...prev,
        device_condition: {
          ...cond,
          checklist: currentChecklist,
        },
      };
    });
  };

  const handleMarkAllFunctional = () => {
    setFormData((prev) => {
      const cond = { ...prev.device_condition };
      const updatedChecklist = {};
      INWARD_CHECKLIST_CONFIG.forEach((it) => {
        updatedChecklist[it.key] = it.defaultVal;
        cond[it.key] = it.defaultVal;
      });
      return {
        ...prev,
        device_condition: {
          ...cond,
          ...updatedChecklist,
          checklist: updatedChecklist,
        },
      };
    });
    toast.success('Checklist reset to all-functional defaults');
  };

  const handleAccessoryToggle = (item) => {
    setFormData((prev) => {
      const exists = prev.accessories_received.includes(item);
      return {
        ...prev,
        accessories_received: exists
          ? prev.accessories_received.filter((a) => a !== item)
          : [...prev.accessories_received, item],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_complaint.trim()) {
      toast.error('Customer complaint is required');
      return;
    }
    if (!formData.device_data.brand.trim() || !formData.device_data.model.trim()) {
      toast.error('Device brand and model are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const cond = formData.device_condition || {};
      const finalChecklist = {};
      INWARD_CHECKLIST_CONFIG.forEach((it) => {
        finalChecklist[it.key] = resolveChecklistValue(it.key, cond);
      });

      const submissionData = {
        ...formData,
        device_condition: {
          ...cond,
          ...finalChecklist,
          checklist: finalChecklist,
          powers_on: finalChecklist.powers_on === 'Yes',
          power_button: finalChecklist.power_button === 'Yes' ? 'Working' : 'Faulty',
          volume_buttons: finalChecklist.volume_buttons === 'Yes' ? 'Working' : 'Faulty',
          screen: finalChecklist.screen === 'Yes' ? 'Working' : 'Broken',
          touch: finalChecklist.touch === 'Yes' ? 'Working' : 'Faulty',
          speaker: finalChecklist.speaker === 'Yes' ? 'Working' : 'Faulty',
          charging_port: finalChecklist.charging_port === 'Yes' ? 'Working' : 'Faulty',
          headphone_jack: finalChecklist.headphone_jack === 'Yes' ? 'Working' : 'Faulty',
          back_glass: finalChecklist.back_glass === 'Yes' ? 'Cracked' : 'Intact',
          dents: finalChecklist.dents === 'Yes',
          screw_missing: finalChecklist.screw_missing === 'Yes',
          sim_tray_missing: finalChecklist.sim_tray_missing === 'Yes',
        },
      };

      const res = await jobService.updateJob(job.id, submissionData);
      toast.success(`Job Sheet #${job.job_number} updated successfully!`);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update job sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ACCESSORY_ITEMS = [
    'SIM Card',
    'Original Charger',
    'Cable',
    'Protective Case',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Job Sheet #${job.job_number}`}
      subtitle={`Customer: ${job.customer?.full_name || 'Customer'}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Device Info */}
        <div className="p-4 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-2xl space-y-3">
          <span className="text-xs font-bold text-[var(--spatial-text-title)] block flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-apple-blue" />
            Device Specifications
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-muted)] uppercase mb-1">
                Brand *
              </label>
              <input
                type="text"
                name="brand"
                required
                value={formData.device_data.brand}
                onChange={handleDeviceChange}
                placeholder="e.g. Apple, Samsung, OnePlus"
                className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs focus:ring-1 focus:ring-apple-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-muted)] uppercase mb-1">
                Model *
              </label>
              <input
                type="text"
                name="model"
                required
                value={formData.device_data.model}
                onChange={handleDeviceChange}
                placeholder="e.g. iPhone 15 Pro, S24 Ultra"
                className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs focus:ring-1 focus:ring-apple-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-muted)] uppercase mb-1">
                Passcode / Pattern / PIN
              </label>
              <input
                type="text"
                name="passcode"
                value={formData.device_data.passcode}
                onChange={handleDeviceChange}
                placeholder="Required for testing"
                className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs font-mono focus:ring-1 focus:ring-apple-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--spatial-text-muted)] mb-1">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.device_data.color}
                onChange={handleDeviceChange}
                placeholder="e.g. Space Black, Titanium"
                className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs focus:ring-1 focus:ring-apple-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--spatial-text-muted)] mb-1">
                Storage
              </label>
              <input
                type="text"
                name="storage_capacity"
                value={formData.device_data.storage_capacity}
                onChange={handleDeviceChange}
                placeholder="e.g. 128GB, 256GB"
                className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs focus:ring-1 focus:ring-apple-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--spatial-text-muted)] mb-1">
                IMEI / Serial Number
              </label>
              <input
                type="text"
                name="imei"
                value={formData.device_data.imei}
                onChange={handleDeviceChange}
                placeholder="15-digit IMEI"
                className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs font-mono focus:ring-1 focus:ring-apple-blue focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Reported Complaint */}
        <div>
          <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
            Customer Reported Issue / Complaint *
          </label>
          <textarea
            rows="2"
            required
            value={formData.customer_complaint}
            onChange={(e) => setFormData({ ...formData, customer_complaint: e.target.value })}
            placeholder="Describe the exact fault or defect reported by the customer..."
            className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs focus:ring-1 focus:ring-apple-blue focus:outline-none"
          />
        </div>

        {/* Inward Condition Checklist (12-Point Inspection) */}
        <div className="p-4 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--spatial-text-title)] block">
              Inward Condition Checklist (12-Point Inspection)
            </span>
            <button
              type="button"
              onClick={handleMarkAllFunctional}
              className="text-[11px] font-semibold text-apple-blue bg-[var(--spatial-bg-card)] px-2.5 py-1 rounded-lg border border-[var(--spatial-border)] hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer"
            >
              ✓ All Functional / Good
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {INWARD_CHECKLIST_CONFIG.map((item) => {
              const currentVal = resolveChecklistValue(item.key, formData.device_condition);
              const isYes = currentVal === 'Yes';
              const isNo = currentVal === 'No';

              return (
                <div
                  key={item.key}
                  className="p-2.5 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card)] flex items-center justify-between gap-1.5 shadow-2xs"
                >
                  <span className="text-[11px] font-medium text-[var(--spatial-text-title)] leading-tight">{item.label}</span>
                  <div className="flex items-center rounded-lg p-0.5 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] shrink-0">
                    <button
                      type="button"
                      onClick={() => handleChecklistSet(item.key, 'Yes')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        isYes
                          ? item.type === 'working'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-rose-600 text-white shadow-2xs'
                          : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChecklistSet(item.key, 'No')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        isNo
                          ? item.type === 'working'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessories Received */}
        <div className="p-4 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-2xl space-y-2">
          <span className="text-xs font-bold text-[var(--spatial-text-title)] block">Accessories Kept in Shop</span>
          <div className="flex flex-wrap gap-2">
            {ACCESSORY_ITEMS.map((acc) => {
              const active = formData.accessories_received.includes(acc);
              return (
                <button
                  key={acc}
                  type="button"
                  onClick={() => handleAccessoryToggle(acc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-apple-blue text-white border-apple-blue shadow-xs'
                      : 'bg-[var(--spatial-bg-card)] text-[var(--spatial-text-title)] border-[var(--spatial-border)] hover:bg-[var(--spatial-bg-card-hover)]'
                  }`}
                >
                  {active ? `✓ ${acc}` : `+ ${acc}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status, Technician & Priority Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Job Status (Owner)
            </label>
            <SpatialSelect
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              options={[
                { value: 'RECEIVED', label: 'Received' },
                { value: 'DIAGNOSING', label: 'Diagnosing' },
                { value: 'ESTIMATE_SENT', label: 'Estimate Sent' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Estimate Rejected' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'TESTING', label: 'Testing' },
                { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Assigned Technician
            </label>
            <SpatialSelect
              value={formData.assigned_technician_id || ''}
              onChange={(val) => setFormData({ ...formData, assigned_technician_id: val })}
              options={[
                { value: '', label: 'Unassigned / Pool' },
                ...technicians.map((t) => ({
                  value: t.id,
                  label: `${t.full_name} (${t.role_id})`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Priority
            </label>
            <SpatialSelect
              value={formData.priority}
              onChange={(val) => setFormData({ ...formData, priority: val })}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent (Express)' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Estimated Delivery
            </label>
            <input
              type="date"
              value={formData.estimated_delivery_date}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_date: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs focus:ring-1 focus:ring-apple-blue focus:outline-none"
            />
          </div>
        </div>

        {/* Internal Remarks */}
        <div>
          <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
            Internal Technician Notes / Remarks
          </label>
          <textarea
            rows="2"
            value={formData.internal_notes}
            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            placeholder="Special bench instructions, customer instructions, etc."
            className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] rounded-xl text-xs focus:ring-1 focus:ring-apple-blue focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--spatial-border)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" icon={Save} loading={isSubmitting}>
            Save Job Sheet
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default JobEditModal;
