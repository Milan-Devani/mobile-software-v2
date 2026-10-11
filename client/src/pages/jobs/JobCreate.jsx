import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Smartphone,
  User,
  Plus,
  ArrowLeft,
  CheckSquare,
  AlertTriangle,
  Upload,
  ShieldAlert,
  Camera,
  Layers,
  FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { customerService } from '../../services/customerService';
import { jobService } from '../../services/jobService';
import { authService } from '../../services/authService';
import { Card, LoadingSpinner } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

const ACCESSORIES_OPTIONS = [
  'Original Charger',
  'USB Cable',
  'SIM Card',
  'SIM Tray',
  'SD Memory Card',
  'Original Box',
  'Earphones',
  'Protective Case',
];

const jobSchema = z.object({
  customer_id: z.string().min(1, 'Please select or create a customer'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  assigned_technician_id: z.string().optional(),
  customer_complaint: z.string().min(5, 'Please enter the customer complaint / issue (at least 5 characters)'),

  // Device fields
  device_brand: z.string().min(1, 'Brand is required (e.g. Apple, Samsung)'),
  device_model: z.string().min(1, 'Model is required (e.g. iPhone 14 Pro, Galaxy S23)'),
  device_color: z.string().optional(),
  device_storage: z.string().optional(),
  device_imei: z.string().optional(),
  device_serial: z.string().optional(),
  device_passcode: z.string().optional(),
  device_os: z.string().default('iOS'),

  // Condition
  screen_condition: z.string().default('Intact / No cracks'),
  body_condition: z.string().default('Good / Minor wear'),
  charging_port_condition: z.string().default('Functional'),
  water_damage: z.boolean().default(false),
  scratches: z.string().default('Minor scratches'),
  cracks: z.string().default('None'),
  condition_notes: z.string().optional(),
});

export const JobCreate = () => {
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer_id');
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick New Customer Modal
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      customer_id: preselectedCustomerId || '',
      priority: 'NORMAL',
      assigned_technician_id: '',
      customer_complaint: '',
      device_brand: 'Apple',
      device_model: '',
      device_color: '',
      device_storage: '',
      device_imei: '',
      device_serial: '',
      device_passcode: '',
      device_os: 'iOS',
      screen_condition: 'Intact / No cracks',
      body_condition: 'Good / Minor wear',
      charging_port_condition: 'Functional',
      water_damage: false,
      scratches: 'Minor scratches',
      cracks: 'None',
      condition_notes: '',
    },
  });

  useEffect(() => {
    const loadInitData = async () => {
      try {
        setLoadingInit(true);
        const [custRes, usersRes] = await Promise.all([
          customerService.getCustomers({ limit: 100 }),
          authService.getUsers().catch(() => []),
        ]);
        setCustomers(custRes.customers || []);
        if (usersRes) {
          setTechnicians(usersRes.filter((u) => u.role_id === 'technician' || u.role_id === 'admin'));
        }
        if (preselectedCustomerId) {
          setValue('customer_id', preselectedCustomerId);
        }
      } catch (err) {
        toast.error('Failed to load initial data');
      } finally {
        setLoadingInit(false);
      }
    };
    loadInitData();
  }, [preselectedCustomerId, setValue]);

  const toggleAccessory = (acc) => {
    setSelectedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((item) => item !== acc) : [...prev, acc]
    );
  };

  const handleQuickCustomerCreate = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const created = await customerService.createCustomer({
        full_name: newCustName,
        phone: newCustPhone,
        email: newCustEmail,
      });
      toast.success(`Customer "${created.full_name}" registered!`);
      setCustomers((prev) => [created, ...prev]);
      setValue('customer_id', created.id);
      setIsNewCustModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
    } catch (err) {
      toast.error(err.message || 'Failed to create customer');
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const payload = {
        customer_id: data.customer_id,
        assigned_technician_id: data.assigned_technician_id || null,
        priority: data.priority,
        customer_complaint: data.customer_complaint,
        device_data: {
          brand: data.device_brand,
          model: data.device_model,
          color: data.device_color,
          storage_capacity: data.device_storage,
          imei: data.device_imei,
          serial_number: data.device_serial,
          passcode: data.device_passcode,
          operating_system: data.device_os,
        },
        device_condition: {
          screen: data.screen_condition,
          body: data.body_condition,
          charging_port: data.charging_port_condition,
          water_damage: data.water_damage,
          scratches: data.scratches,
          cracks: data.cracks,
          notes: data.condition_notes,
        },
        accessories_received: selectedAccessories,
      };

      const createdJob = await jobService.createJob(payload);
      toast.success(`Job Sheet #${createdJob.job_number} created successfully!`);
      navigate(`/jobs/${createdJob.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create Job Sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInit) {
    return <LoadingSpinner label="Preparing Job Sheet intake wizard..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Repair Job Sheet</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record intake details, device diagnostics, condition, and customer issue
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Customer Selection */}
        <Card title="1. Customer Information" subtitle="Select existing customer or register a new one">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Customer *
                </label>
                <select
                  {...register('customer_id')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone}) - {c.customer_code || 'CUST'}
                    </option>
                  ))}
                </select>
                {errors.customer_id && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.customer_id.message}</p>
                )}
              </div>
              <div className="sm:pt-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsNewCustModalOpen(true)}
                >
                  New Customer
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Priority Level
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal Standard</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent / Express Turnaround</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assign Technician (Optional)
                </label>
                <select
                  {...register('assigned_technician_id')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">-- Unassigned (Lead tech will claim) --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.role_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Device Information */}
        <Card title="2. Device Details" subtitle="Specifications and identification details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Brand *
              </label>
              <select
                {...register('device_brand')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="Apple">Apple</option>
                <option value="Samsung">Samsung</option>
                <option value="Google">Google Pixel</option>
                <option value="Xiaomi">Xiaomi / Redmi</option>
                <option value="OnePlus">OnePlus</option>
                <option value="Motorola">Motorola</option>
                <option value="Oppo">Oppo / Vivo</option>
                <option value="Other">Other Brand</option>
              </select>
              {errors.device_brand && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.device_brand.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Model Name / Number *
              </label>
              <input
                type="text"
                placeholder="e.g. iPhone 14 Pro / Galaxy S23 Ultra"
                {...register('device_model')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              {errors.device_model && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.device_model.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Color</label>
              <input
                type="text"
                placeholder="e.g. Space Black, Midnight"
                {...register('device_color')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Storage</label>
              <input
                type="text"
                placeholder="e.g. 128GB, 256GB"
                {...register('device_storage')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Operating System</label>
              <select
                {...register('device_os')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="iOS">iOS</option>
                <option value="Android">Android</option>
                <option value="iPadOS">iPadOS</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">IMEI Number</label>
              <input
                type="text"
                placeholder="15-digit IMEI"
                {...register('device_imei')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Serial Number</label>
              <input
                type="text"
                placeholder="Serial Number"
                {...register('device_serial')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Passcode / PIN</label>
              <input
                type="text"
                placeholder="For technician testing"
                {...register('device_passcode')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Section 3: Customer Complaint */}
        <Card title="3. Customer Complaint" subtitle="Record verbatim issue reported by customer">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Reported Issue / Problem Description *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Mobile is not charging. Dropped yesterday and screen flickers with horizontal lines."
              {...register('customer_complaint')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
            {errors.customer_complaint && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.customer_complaint.message}</p>
            )}
          </div>
        </Card>

        {/* Section 4: Device Condition at Intake */}
        <Card title="4. Physical Condition at Intake" subtitle="Inspect and record existing cosmetic/hardware state">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Screen Condition</label>
              <select
                {...register('screen_condition')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="Intact / No cracks">Intact / No cracks</option>
                <option value="Cracked glass (display works)">Cracked glass (display works)</option>
                <option value="Cracked OLED / Ink spots / Lines">Cracked OLED / Ink spots / Lines</option>
                <option value="Completely black / No display">Completely black / No display</option>
                <option value="Unresponsive touch">Unresponsive touch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Body / Frame</label>
              <select
                {...register('body_condition')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="Good / Minor wear">Good / Minor wear</option>
                <option value="Scratched edges">Scratched edges</option>
                <option value="Dented corners">Dented corners</option>
                <option value="Bent housing frame">Bent housing frame</option>
                <option value="Back glass shattered">Back glass shattered</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Charging Port</label>
              <select
                {...register('charging_port_condition')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="Functional">Functional</option>
                <option value="Loose connection">Loose connection</option>
                <option value="Damaged / Burn marks">Damaged / Burn marks</option>
                <option value="Lint / Dust clogged">Lint / Dust clogged</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Existing Scratches</label>
              <select
                {...register('scratches')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="None">None (Pristine)</option>
                <option value="Minor / Light scratches">Minor / Light scratches</option>
                <option value="Deep scratches">Deep scratches</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Existing Cracks</label>
              <select
                {...register('cracks')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="None">None</option>
                <option value="Front glass cracked">Front glass cracked</option>
                <option value="Rear glass cracked">Rear glass cracked</option>
                <option value="Camera lens cracked">Camera lens cracked</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-slate-200 bg-slate-50 w-full hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  {...register('water_damage')}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                />
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Liquid / Water Damage Suspected
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* Section 5: Accessories Received */}
        <Card title="5. Accessories Received" subtitle="Items customer handed over with the device">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ACCESSORIES_OPTIONS.map((acc) => {
              const checked = selectedAccessories.includes(acc);
              return (
                <button
                  type="button"
                  key={acc}
                  onClick={() => toggleAccessory(acc)}
                  className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                    checked
                      ? 'border-primary-500 bg-primary-50/70 text-primary-900 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-300'
                  }`}>
                    {checked && '✓'}
                  </span>
                  <span>{acc}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Submit Bar */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            A unique Job Number <span className="font-mono font-bold text-slate-700">(JOB-2026-XXXXXX)</span> will be generated automatically.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/jobs')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={FileCheck}
              loading={isSubmitting}
            >
              Create Job Sheet
            </Button>
          </div>
        </div>
      </form>

      {/* Inline Quick Customer Modal */}
      <Modal
        isOpen={isNewCustModalOpen}
        onClose={() => setIsNewCustModalOpen(false)}
        title="Quick Register Customer"
        subtitle="Quickly add customer to continue creating Job Sheet"
      >
        <form onSubmit={handleQuickCustomerCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+1 (555) 000-0000"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="customer@example.com"
              value={newCustEmail}
              onChange={(e) => setNewCustEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsNewCustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
