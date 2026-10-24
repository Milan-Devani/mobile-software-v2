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
  FileCheck,
  Usb,
  X,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { customerService } from '../../services/customerService';
import { jobService } from '../../services/jobService';
import { authService } from '../../services/authService';
import { deviceBridgeService } from '../../services/deviceBridgeService';
import { Card, LoadingSpinner, FormSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { INWARD_CHECKLIST_CONFIG, getDefaultChecklist } from '../../utils/checklistConstants';

const ACCESSORIES_OPTIONS = [
  'SIM Card',
  'Original Charger',
  'Cable',
  'Protective Case',
];

const jobSchema = z.object({
  customer_id: z.string().min(1, 'Please select or create a customer'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  service_type: z.string().default('Pending'),
  assigned_technician_id: z.string().optional(),
  customer_complaint: z.string().min(5, 'Please enter the customer complaint / issue (at least 5 characters)'),

  // Device fields
  device_brand: z.string().min(1, 'Brand is required (e.g. Apple, Samsung, Xiaomi)'),
  device_model: z.string().min(1, 'Model is required (e.g. Redmi Note 10S, iPhone 14 Pro)'),
  device_color: z.string().optional(),
  device_storage: z.string().optional(),
  device_imei: z.string().optional(),
  device_serial: z.string().optional(),
  device_passcode: z.string().optional(),
  device_os: z.string().default('Android'),
  device_invoice_date: z.string().optional(),
  device_invoice_number: z.string().optional(),
  device_expiry_date: z.string().optional(),
  device_cosmetic: z.string().default('Wear And Tear'),

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
  const [newCustWhatsapp, setNewCustWhatsapp] = useState('');
  const [newCustSameAsPhone, setNewCustSameAsPhone] = useState(true);
  const [newCustHasAltPhone, setNewCustHasAltPhone] = useState(false);
  const [newCustAltPhone, setNewCustAltPhone] = useState('');
  const [newCustAltWhatsapp, setNewCustAltWhatsapp] = useState('');
  const [newCustGender, setNewCustGender] = useState('male');
  const [newCustUserType, setNewCustUserType] = useState('End User');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('');
  const [newCustPostalCode, setNewCustPostalCode] = useState('');

  // USB Mobile Device Auto-Detection States
  const [detectingDevice, setDetectingDevice] = useState(false);
  const [deviceDetectNotice, setDeviceDetectNotice] = useState(null);

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
      service_type: 'Pending',
      assigned_technician_id: '',
      customer_complaint: '',
      device_brand: 'Xiaomi',
      device_model: '',
      device_color: '',
      device_storage: '',
      device_imei: '',
      device_serial: '',
      device_passcode: '',
      device_os: 'Android',
      device_invoice_date: '',
      device_invoice_number: '',
      device_expiry_date: '',
      device_cosmetic: 'Wear And Tear',
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

  const [checklist, setChecklist] = useState(getDefaultChecklist());

  // Auto-select Operating System based on selected brand (Apple -> iOS, others -> Android)
  const watchedBrand = watch('device_brand');
  useEffect(() => {
    if (watchedBrand) {
      if (watchedBrand.trim().toLowerCase() === 'apple') {
        setValue('device_os', 'iOS', { shouldValidate: true });
      } else {
        setValue('device_os', 'Android', { shouldValidate: true });
      }
    }
  }, [watchedBrand, setValue]);

  const handleChecklistToggle = (key, val) => {
    if (key === 'powers_on' && val === 'No') {
      const allNegative = {};
      INWARD_CHECKLIST_CONFIG.forEach((item) => {
        allNegative[item.key] = item.type === 'working' ? 'No' : 'Yes';
      });
      setChecklist(allNegative);
      return;
    }
    setChecklist((prev) => ({ ...prev, [key]: val }));
  };

  const handleAutoDetectDevice = async () => {
    try {
      setDetectingDevice(true);
      setDeviceDetectNotice(null);

      const res = await deviceBridgeService.detectDevice();

      if (res && res.connected) {
        if (res.brand) {
          setValue('device_brand', res.brand, { shouldValidate: true });
        }
        if (res.model) {
          setValue('device_model', res.model, { shouldValidate: true });
        }
        if (res.serial_number) {
          setValue('device_serial', res.serial_number, { shouldValidate: true });
        }
        if (res.imei) {
          setValue('device_imei', res.imei, { shouldValidate: true });
        }
        if (res.platform === 'ios') {
          setValue('device_os', 'iOS', { shouldValidate: true });
        } else if (res.platform === 'android') {
          setValue('device_os', 'Android', { shouldValidate: true });
        }

        if (res.device_status === 'authorized') {
          toast.success(`Detected: ${res.brand} ${res.model}`, {
            icon: '📱',
            duration: 4000,
          });
          setDeviceDetectNotice({
            type: 'success',
            text: res.message || `Detected ${res.brand} ${res.model}`,
            action: res.imei ? `IMEI: ${res.imei} • Serial: ${res.serial_number || 'N/A'}` : null,
          });
        } else {
          toast(res.message || 'Device detected on USB', { icon: '⚠️', duration: 5000 });
          setDeviceDetectNotice({
            type: 'warning',
            text: res.message || 'Device connected via USB',
            action: res.action_required || 'Please unlock screen or tap Allow on phone to extract full hardware specs.',
          });
        }
      } else {
        toast.error(res?.message || 'No mobile device detected on USB ports', { duration: 4500 });
        setDeviceDetectNotice({
          type: 'warning',
          text: res?.message || 'No mobile device detected on USB ports.',
          action: res?.action_required || 'Connect phone using a USB data cable and tap Allow/Trust on phone screen.',
        });
      }
    } catch (err) {
      console.error('Device detection failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to detect device via USB');
      setDeviceDetectNotice({
        type: 'warning',
        text: 'Device detection service unavailable or encountered an error.',
        action: 'Ensure the server has permission to query USB devices.',
      });
    } finally {
      setDetectingDevice(false);
    }
  };

  const handleMarkAllFunctional = () => {
    setChecklist(getDefaultChecklist());
    toast.success('Checklist reset to all-functional defaults');
  };

  const toggleAccessory = (acc) => {
    setSelectedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((item) => item !== acc) : [...prev, acc]
    );
  };

  const handleQuickCustomerCreate = async (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast.error('Customer name and primary phone are required');
      return;
    }
    if (!newCustEmail.trim()) {
      toast.error('Email address (Mail ID) is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!newCustSameAsPhone && (!newCustWhatsapp || !newCustWhatsapp.trim())) {
      toast.error('Please enter a WhatsApp number or check "WhatsApp number is same as Phone number"');
      return;
    }
    try {
      const created = await customerService.createCustomer({
        full_name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim(),
        whatsapp_number: newCustSameAsPhone ? newCustPhone.trim() : (newCustWhatsapp.trim() || newCustPhone.trim()),
        alternate_phone: newCustHasAltPhone ? newCustAltPhone.trim() : '',
        alternate_whatsapp: newCustHasAltPhone ? newCustAltWhatsapp.trim() : '',
        gender: newCustGender,
        user_type: newCustUserType,
        address: newCustAddress,
        city: newCustCity,
        state: newCustState,
        postal_code: newCustPostalCode,
      });
      toast.success(`Customer "${created.full_name}" registered!`);
      setCustomers((prev) => [created, ...prev]);
      setValue('customer_id', created.id);
      setIsNewCustModalOpen(false);
      // Reset form fields
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustWhatsapp('');
      setNewCustSameAsPhone(true);
      setNewCustHasAltPhone(false);
      setNewCustAltPhone('');
      setNewCustAltWhatsapp('');
      setNewCustAddress('');
      setNewCustCity('');
      setNewCustState('');
      setNewCustPostalCode('');
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
        service_type: data.service_type || 'Pending',
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
          invoice_date: data.device_invoice_date,
          invoice_number: data.device_invoice_number,
          expiry_date: data.device_expiry_date,
          cosmetic_condition: data.device_cosmetic,
        },
        device_condition: {
          ...checklist,
          checklist,
          powers_on: checklist.powers_on === 'Yes',
          power_button: checklist.power_button === 'Yes' ? 'Working' : 'Faulty',
          volume_buttons: checklist.volume_buttons === 'Yes' ? 'Working' : 'Faulty',
          screen: checklist.screen === 'Yes' ? 'Working' : 'Broken',
          touch: checklist.touch === 'Yes' ? 'Working' : 'Faulty',
          speaker: checklist.speaker === 'Yes' ? 'Working' : 'Faulty',
          charging_port: checklist.charging_port === 'Yes' ? 'Working' : 'Faulty',
          headphone_jack: checklist.headphone_jack === 'Yes' ? 'Working' : 'Faulty',
          back_glass: checklist.back_glass === 'Yes' ? 'Cracked' : 'Intact',
          dents: checklist.dents === 'Yes',
          screw_missing: checklist.screw_missing === 'Yes',
          sim_tray_missing: checklist.sim_tray_missing === 'Yes',
          water_damage: data.water_damage || false,
          notes: data.condition_notes || '',
        },
        accessories_received: selectedAccessories,
      };

      const createdJob = await jobService.createJob(payload);
      toast.success(`Service Order #${createdJob.job_number} created successfully!`);
      navigate(`/jobs/${createdJob.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create Service Order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInit) {
    return <FormSkeleton fields={6} />;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] rounded-xl transition-all border border-[var(--spatial-border)] active:scale-95"
            title="Back to jobs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--spatial-text-title)] tracking-tight">Create Repair Job Sheet</h2>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
              Record intake details, device diagnostics, condition, and customer issue
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Customer Selection */}
        <Card
          title="1. Customer Information"
          subtitle="Select existing customer or register a new one"
          className="relative z-30"
          hover={false}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                  Customer *
                </label>
                <SpatialSelect
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                    subtitle: c.phone,
                    badge: c.customer_code || 'CUST',
                  }))}
                  value={watch('customer_id')}
                  onChange={(val) => setValue('customer_id', val, { shouldValidate: true })}
                  placeholder="-- Select Customer or Search by Name / Phone --"
                  searchable
                  searchPlaceholder="Search customer by name, phone, code..."
                  error={errors.customer_id?.message}
                />
                <input type="hidden" {...register('customer_id')} />
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

            {/* Selected Customer Contact Details Preview */}
            {(() => {
              const selectedId = watch('customer_id');
              const sel = customers.find((c) => c.id === selectedId);
              if (!sel) return null;
              return (
                <div className="p-3.5 bg-[var(--spatial-bg-card-subtle)] rounded-xl border border-[var(--spatial-border)] hover:border-[#0071e3]/40 text-xs space-y-2 mt-2 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--spatial-text-title)]">{sel.full_name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] text-[10px] font-medium">
                        {sel.user_type || 'End User'} • {sel.gender || 'male'}
                      </span>
                    </div>
                    <span className="font-semibold text-[#0071e3] dark:text-[#0a84ff] text-[11px] tracking-tight">{sel.customer_code}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px]">
                    <div>
                      <span className="text-[var(--spatial-text-muted)]">Primary Phone:</span>
                      <p className="font-medium text-[var(--spatial-text-title)] tabular-nums">{sel.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--spatial-text-muted)]">Primary WhatsApp:</span>
                      <p className="font-medium text-[var(--spatial-text-title)] tabular-nums">{sel.whatsapp_number || sel.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--spatial-text-muted)]">Alternate Phone:</span>
                      <p className="font-medium text-[var(--spatial-text-title)] tabular-nums">{sel.alternate_phone || 'None'}</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-xl">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Alt WhatsApp (In-Repair):</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {sel.alternate_whatsapp || sel.alternate_phone || 'Not recorded'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--spatial-text-muted)] pt-1.5 border-t border-[var(--spatial-border)] flex-wrap gap-2">
                    <div>
                      <span>Mail ID:</span> <span className="text-[var(--spatial-text-title)] font-medium">{sel.email || 'None'}</span>
                    </div>
                    {sel.address && (
                      <div className="truncate max-w-sm">
                        <span>Address:</span> <span className="text-[var(--spatial-text-title)] font-medium">{sel.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--spatial-border)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                  Priority Level
                </label>
                <SpatialSelect
                  options={[
                    { value: 'LOW', label: 'Low Priority' },
                    { value: 'NORMAL', label: 'Normal Standard' },
                    { value: 'HIGH', label: 'High Priority' },
                    { value: 'URGENT', label: 'Urgent / Express Turnaround' },
                  ]}
                  value={watch('priority')}
                  onChange={(val) => setValue('priority', val, { shouldValidate: true })}
                />
                <input type="hidden" {...register('priority')} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                  Assign Technician (Optional)
                </label>
                <SpatialSelect
                  options={[
                    { value: '', label: '-- Unassigned (Lead tech will claim) --' },
                    ...technicians.map((t) => ({
                      value: t.id,
                      label: t.full_name,
                      badge: t.role_id,
                    })),
                  ]}
                  value={watch('assigned_technician_id')}
                  onChange={(val) => setValue('assigned_technician_id', val, { shouldValidate: true })}
                  placeholder="-- Select Technician --"
                />
                <input type="hidden" {...register('assigned_technician_id')} />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Device Information */}
        <Card
          title="2. Device Details"
          subtitle="Specifications and identification details"
          className="relative z-20"
          hover={false}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Usb}
              loading={detectingDevice}
              onClick={handleAutoDetectDevice}
              className="bg-apple-blue/10 border-apple-blue/30 text-apple-blue dark:text-[#0a84ff] hover:bg-apple-blue/20 font-semibold cursor-pointer shadow-xs active:scale-95"
              title="Connect smartphone via USB and click to auto-fill brand, model, IMEI, serial, and OS"
            >
              {detectingDevice ? 'Scanning USB...' : 'Auto-Detect via USB'}
            </Button>
          }
        >
          {deviceDetectNotice && (
            <div
              className={`mb-4 p-3 rounded-xl border flex items-start justify-between gap-3 text-xs animate-in fade-in ${
                deviceDetectNotice.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{deviceDetectNotice.text}</p>
                  {deviceDetectNotice.action && (
                    <p className="mt-0.5 text-[11px] opacity-90">{deviceDetectNotice.action}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeviceDetectNotice(null)}
                className="p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                Brand *
              </label>
              <SpatialSelect
                options={[
                  'Apple',
                  'Samsung',
                  'Google Pixel',
                  'Xiaomi / Redmi',
                  'OnePlus',
                  'Motorola',
                  'Oppo / Vivo',
                  'Realme',
                  'Other Brand',
                ]}
                value={watch('device_brand')}
                onChange={(val) => {
                  setValue('device_brand', val, { shouldValidate: true });
                  if (val && val.trim().toLowerCase() === 'apple') {
                    setValue('device_os', 'iOS', { shouldValidate: true });
                  } else if (val) {
                    setValue('device_os', 'Android', { shouldValidate: true });
                  }
                }}
                placeholder="-- Select Brand --"
                error={errors.device_brand?.message}
              />
              <input type="hidden" {...register('device_brand')} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                Model Name / Number *
              </label>
              <input
                type="text"
                placeholder="e.g. iPhone 14 Pro / Galaxy S23 Ultra"
                {...register('device_model')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
              {errors.device_model && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.device_model.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">Color</label>
              <input
                type="text"
                placeholder="e.g. Space Black, Midnight"
                {...register('device_color')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">Storage</label>
              <input
                type="text"
                placeholder="e.g. 128GB, 256GB"
                {...register('device_storage')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">Operating System</label>
              <SpatialSelect
                value={watch('device_os') || 'Android'}
                onChange={(val) => setValue('device_os', val, { shouldValidate: true })}
                options={[
                  { value: 'iOS', label: 'iOS' },
                  { value: 'Android', label: 'Android' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">IMEI Number</label>
              <input
                type="text"
                placeholder="15-digit IMEI"
                {...register('device_imei')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">Serial Number</label>
              <input
                type="text"
                placeholder="Serial Number"
                {...register('device_serial')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">Passcode / PIN</label>
              <input
                type="text"
                placeholder="For technician testing"
                {...register('device_passcode')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">Repair Service Type</label>
              <SpatialSelect
                options={[
                  'Screen / Display Replacement',
                  'Battery Replacement',
                  'Face ID / Camera Repair',
                  'Motherboard / Chip-Level Repair',
                  'Charging Port / Audio / Mic',
                  'Back Glass / Housing Replacement',
                  'Diagnostic / Bench Inspection',
                  'Software / Unlocking / Flashing',
                  'General Hardware Repair',
                ]}
                value={watch('service_type')}
                onChange={(val) => setValue('service_type', val, { shouldValidate: true })}
                placeholder="-- Select Service Type --"
              />
              <input type="hidden" {...register('service_type')} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">Cosmetic Condition</label>
              <SpatialSelect
                options={[
                  'Wear And Tear (Normal use)',
                  'Mint / Flawless',
                  'Minor Scratches on Glass/Frame',
                  'Deep Scratches / Dents',
                  'Cracked Screen / Broken Glass',
                  'Swollen Battery / Back Lifted',
                  'Bent Chassis / Water Contact',
                ]}
                value={watch('device_cosmetic')}
                onChange={(val) => setValue('device_cosmetic', val, { shouldValidate: true })}
                placeholder="-- Select Cosmetic Condition --"
              />
              <input type="hidden" {...register('device_cosmetic')} />
            </div>
          </div>
        </Card>

        {/* Section 3: Customer Complaint */}
        <Card
          title="3. Customer Complaint"
          subtitle="Record verbatim issue reported by customer"
          className="relative z-10"
          hover={false}
        >
          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
              Reported Issue / Problem Description *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Mobile is not charging. Dropped yesterday and screen flickers with horizontal lines."
              {...register('customer_complaint')}
              className="w-full px-3.5 py-2.5 spatial-input rounded-xl text-xs leading-relaxed"
            />
            {errors.customer_complaint && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.customer_complaint.message}</p>
            )}
          </div>
        </Card>

        {/* Section 4: Device Condition Checklist at Intake */}
        <Card
          title="4. Inward Condition Checklist (12-Point Inspection)"
          subtitle="Record cosmetic and functional state matching the Service Order & Invoice checklist"
          className="relative z-[5]"
          hover={false}
          action={
            <button
              type="button"
              onClick={handleMarkAllFunctional}
              className="text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all active:scale-95"
            >
              ✓ All Functional / Good
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {INWARD_CHECKLIST_CONFIG.map((item) => {
              const currentVal = checklist[item.key] || item.defaultVal;
              const isYes = currentVal === 'Yes';
              const isNo = currentVal === 'No';

              return (
                <div
                  key={item.key}
                  className="p-2.5 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] hover:border-[var(--spatial-border-highlight)] flex items-center justify-between gap-2 transition-all duration-150"
                >
                  <span className="text-xs font-medium text-[var(--spatial-text-title)] leading-snug">{item.label}</span>
                  <div className="flex items-center rounded-lg p-0.5 bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shrink-0">
                    <button
                      type="button"
                      onClick={() => handleChecklistToggle(item.key, 'Yes')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all active:scale-95 ${
                        isYes
                          ? item.type === 'working'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-rose-600 text-white shadow-xs'
                          : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChecklistToggle(item.key, 'No')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all active:scale-95 ${
                        isNo
                          ? item.type === 'working'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-emerald-600 text-white shadow-xs'
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--spatial-border)]">
            <div>
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/15 transition-all duration-150">
                <input
                  type="checkbox"
                  {...register('water_damage')}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 accent-rose-500"
                />
                <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Liquid / Water Damage Suspected
                </span>
              </label>
            </div>
            <div>
              <input
                type="text"
                placeholder="Additional intake condition notes (e.g. Minor hairline scratch on rear camera lens)"
                {...register('condition_notes')}
                className="w-full px-3 py-2.5 spatial-input rounded-xl text-xs"
              />
            </div>
          </div>
        </Card>

        {/* Section 5: Accessories Received */}
        <Card
          title="5. Accessories Received"
          subtitle="Items customer handed over with the device"
          className="relative z-[1]"
          hover={false}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ACCESSORIES_OPTIONS.map((acc) => {
              const checked = selectedAccessories.includes(acc);
              return (
                <button
                  type="button"
                  key={acc}
                  onClick={() => toggleAccessory(acc)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-95 ${
                    checked
                      ? 'border-[#0071e3] bg-blue-500/10 text-[var(--spatial-text-title)] font-semibold shadow-xs ring-1 ring-[#0071e3]/30'
                      : 'spatial-inner-box hover:border-[var(--spatial-border-highlight)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'border-[var(--spatial-border)]'
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
        <div className="spatial-card p-4 rounded-2xl flex items-center justify-between gap-4">
          <p className="text-xs text-[var(--spatial-text-muted)]">
            A unique Job Number <span className="font-mono font-semibold text-[var(--spatial-text-title)]">(JOB-2026-XXXXXX)</span> will be generated automatically.
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
              Create Service Order
            </Button>
          </div>
        </div>
      </form>

      {/* Inline Quick Customer Modal */}
      <Modal
        isOpen={isNewCustModalOpen}
        onClose={() => setIsNewCustModalOpen(false)}
        title="Register New Customer"
        subtitle="Record complete contact details & alternate WhatsApp for in-repair communications"
      >
        <form onSubmit={handleQuickCustomerCreate} className="space-y-3.5">
          {/* Note Callout */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
            <strong>⚠️ Important Note:</strong> When the customer submits their phone for repair, their WhatsApp on that device is no longer accessible. Be sure to collect an <strong>Alternate WhatsApp Number</strong> (secondary phone or family member) so they receive status notifications!
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Milan Devani"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                Gender & User Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <SpatialSelect
                  value={newCustGender}
                  onChange={setNewCustGender}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                <SpatialSelect
                  value={newCustUserType}
                  onChange={setNewCustUserType}
                  options={[
                    { value: 'End User', label: 'End User' },
                    { value: 'Dealer', label: 'Dealer' },
                    { value: 'Corporate', label: 'Corporate' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Email / Mail ID */}
          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
              Email Address (Mail ID) *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. milan@example.com"
              value={newCustEmail}
              onChange={(e) => setNewCustEmail(e.target.value)}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          {/* Primary Phone & Primary WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                Primary Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 8758152507"
                value={newCustPhone}
                onChange={(e) => {
                  setNewCustPhone(e.target.value);
                  if (newCustSameAsPhone) setNewCustWhatsapp(e.target.value);
                }}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-[var(--spatial-text-body)] select-none">
                <input
                  type="checkbox"
                  checked={newCustSameAsPhone}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNewCustSameAsPhone(checked);
                    if (checked) {
                      setNewCustWhatsapp(newCustPhone);
                    }
                  }}
                  className="w-4 h-4 text-[#0071e3] rounded accent-[#0071e3]"
                />
                <span className="font-medium">WhatsApp number is same as Phone number</span>
              </label>
            </div>

            {!newCustSameAsPhone && (
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                  Primary WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required={!newCustSameAsPhone}
                  placeholder="Enter separate WhatsApp number"
                  value={newCustWhatsapp}
                  onChange={(e) => setNewCustWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Checkbox for Alternate Phone Number */}
          <div className="pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--spatial-text-title)] select-none font-medium">
              <input
                type="checkbox"
                checked={newCustHasAltPhone}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setNewCustHasAltPhone(checked);
                  if (!checked) {
                    setNewCustAltPhone('');
                    setNewCustAltWhatsapp('');
                  }
                }}
                className="w-4 h-4 text-[#0071e3] rounded accent-[#0071e3] cursor-pointer"
              />
              <span>Add Alternate Phone Number (In-Repair Contact)</span>
            </label>
          </div>

          {/* Alternate Phone & Alternate WhatsApp (Only shown when checkbox is checked) */}
          {newCustHasAltPhone && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[var(--spatial-bg-card-subtle)] border border-emerald-500/30 rounded-2xl animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
                  Alternate Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 8160751302"
                  value={newCustAltPhone}
                  onChange={(e) => {
                    setNewCustAltPhone(e.target.value);
                    if (!newCustAltWhatsapp) setNewCustAltWhatsapp(e.target.value);
                  }}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <span>Alternate WhatsApp</span>
                  </label>
                  {newCustAltPhone && (
                    <button
                      type="button"
                      onClick={() => setNewCustAltWhatsapp(newCustAltPhone)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Same as Alt Phone
                    </button>
                  )}
                </div>
                <input
                  type="tel"
                  placeholder="Active WP number during repair"
                  value={newCustAltWhatsapp}
                  onChange={(e) => setNewCustAltWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono border-emerald-500/40 focus:border-emerald-500"
                />
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Used for instant repair notifications while main phone is in shop
                </p>
              </div>
            </div>
          )}

          {/* Address Fields */}
          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
              Address (Street / Area)
            </label>
            <input
              type="text"
              placeholder="e.g. PASODARA, SURAT, GUJARAT, 394107"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <input
                type="text"
                placeholder="City (e.g. Surat)"
                value={newCustCity}
                onChange={(e) => setNewCustCity(e.target.value)}
                className="w-full px-2.5 py-1.5 spatial-input rounded-xl text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="State (e.g. Gujarat)"
                value={newCustState}
                onChange={(e) => setNewCustState(e.target.value)}
                className="w-full px-2.5 py-1.5 spatial-input rounded-xl text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Postal Code"
                value={newCustPostalCode}
                onChange={(e) => setNewCustPostalCode(e.target.value)}
                className="w-full px-2.5 py-1.5 spatial-input rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--spatial-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsNewCustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save & Select Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
