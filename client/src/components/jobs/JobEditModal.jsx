import React, { useState, useEffect } from 'react';
import { Wrench, Smartphone, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobService } from '../../services/jobService';
import { authService } from '../../services/authService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
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
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-primary-600" />
            Device Specifications
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Brand *
              </label>
              <input
                type="text"
                name="brand"
                required
                value={formData.device_data.brand}
                onChange={handleDeviceChange}
                placeholder="e.g. Apple, Samsung, OnePlus"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Model *
              </label>
              <input
                type="text"
                name="model"
                required
                value={formData.device_data.model}
                onChange={handleDeviceChange}
                placeholder="e.g. iPhone 15 Pro, S24 Ultra"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Passcode / Pattern / PIN
              </label>
              <input
                type="text"
                name="passcode"
                value={formData.device_data.passcode}
                onChange={handleDeviceChange}
                placeholder="Required for testing"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.device_data.color}
                onChange={handleDeviceChange}
                placeholder="e.g. Space Black, Titanium"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Storage
              </label>
              <input
                type="text"
                name="storage_capacity"
                value={formData.device_data.storage_capacity}
                onChange={handleDeviceChange}
                placeholder="e.g. 128GB, 256GB"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                IMEI / Serial Number
              </label>
              <input
                type="text"
                name="imei"
                value={formData.device_data.imei}
                onChange={handleDeviceChange}
                placeholder="15-digit IMEI"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Reported Complaint */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Customer Reported Issue / Complaint *
          </label>
          <textarea
            rows="2"
            required
            value={formData.customer_complaint}
            onChange={(e) => setFormData({ ...formData, customer_complaint: e.target.value })}
            placeholder="Describe the exact fault or defect reported by the customer..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        {/* Inward Condition Checklist (12-Point Inspection) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 block">
              Inward Condition Checklist (12-Point Inspection)
            </span>
            <button
              type="button"
              onClick={handleMarkAllFunctional}
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 bg-white px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
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
                  className="p-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-1.5 shadow-2xs"
                >
                  <span className="text-[11px] font-medium text-slate-800 leading-tight">{item.label}</span>
                  <div className="flex items-center rounded p-0.5 bg-slate-100 border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleChecklistSet(item.key, 'Yes')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                        isYes
                          ? item.type === 'working'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChecklistSet(item.key, 'No')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                        isNo
                          ? item.type === 'working'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
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
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <span className="text-xs font-bold text-slate-900 block">Accessories Kept in Shop</span>
          <div className="flex flex-wrap gap-2">
            {ACCESSORY_ITEMS.map((acc) => {
              const active = formData.accessories_received.includes(acc);
              return (
                <button
                  key={acc}
                  type="button"
                  onClick={() => handleAccessoryToggle(acc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Job Status (Owner)
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-primary-200 rounded-lg text-xs font-bold text-primary-700 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            >
              <option value="RECEIVED">Received</option>
              <option value="DIAGNOSING">Diagnosing</option>
              <option value="ESTIMATE_SENT">Estimate Sent</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Estimate Rejected</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="TESTING">Testing</option>
              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Assigned Technician
            </label>
            <select
              value={formData.assigned_technician_id}
              onChange={(e) => setFormData({ ...formData, assigned_technician_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Unassigned / Pool</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.role_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none font-bold"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent (Express)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Estimated Delivery
            </label>
            <input
              type="date"
              value={formData.estimated_delivery_date}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_date: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Internal Remarks */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Internal Technician Notes / Remarks
          </label>
          <textarea
            rows="2"
            value={formData.internal_notes}
            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            placeholder="Special bench instructions, customer instructions, etc."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
