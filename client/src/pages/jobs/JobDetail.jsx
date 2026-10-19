import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Printer,
  Share2,
  ExternalLink,
  ArrowLeft,
  Smartphone,
  User,
  ShieldCheck,
  Send,
  Plus,
  Trash2,
  CreditCard,
  History,
  Copy,
  Check,
  Ban,
  Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { jobService } from '../../services/jobService';
import { partsService } from '../../services/partsService';
import { paymentService } from '../../services/paymentService';
import { invoiceService } from '../../services/invoiceService';
import { settingsService } from '../../services/settingsService';
import { INWARD_CHECKLIST_CONFIG, resolveChecklistValue } from '../../utils/checklistConstants';

import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { NextActionBanner } from '../../components/jobs/NextActionBanner';
import { JobTimeline } from '../../components/jobs/JobTimeline';
import { QualityChecklist } from '../../components/jobs/QualityChecklist';
import { JobSheetPrintable } from '../../components/print/JobSheetPrintable';
import { InvoicePrintable } from '../../components/print/InvoicePrintable';
import { JobEditModal } from '../../components/jobs/JobEditModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';

export const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [job, setJob] = useState(null);
  const [shop, setShop] = useState(null);
  const [availableParts, setAvailableParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isPrintJobSheetOpen, setIsPrintJobSheetOpen] = useState(false);
  const [isPrintInvoiceOpen, setIsPrintInvoiceOpen] = useState(false);
  const [isJobEditModalOpen, setIsJobEditModalOpen] = useState(false);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);

  // Form states for modals
  const [diagnosisForm, setDiagnosisForm] = useState({
    reported_issue: '',
    technician_findings: '',
    root_cause: '',
    recommended_solution: '',
    internal_technician_notes: '',
  });

  const [estimateForm, setEstimateForm] = useState({
    labor_charge: 0,
    discount: 0,
    apply_tax: true,
    tax_rate: 18,
    notes: '',
    items: [{ item_name: '', quantity: 1, unit_price: '', discount: 0 }],
  });

  const currSym = shop?.currency_symbol || '₹';

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'CASH',
    transaction_reference: '',
    notes: '',
  });

  const [pickupForm, setPickupForm] = useState({
    customer_tested_device: true,
    customer_acceptance_confirmed: true,
    delivery_notes: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Lock body scroll and set print-modal-active when invoice or jobsheet modal is open
  useEffect(() => {
    if (isPrintInvoiceOpen || isPrintJobSheetOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('print-modal-active');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('print-modal-active');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('print-modal-active');
    };
  }, [isPrintInvoiceOpen, isPrintJobSheetOpen]);

  // Handle Escape key to close printable modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPrintInvoiceOpen(false);
        setIsPrintJobSheetOpen(false);
      }
    };
    if (isPrintInvoiceOpen || isPrintJobSheetOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrintInvoiceOpen, isPrintJobSheetOpen]);

  const fetchJobData = async () => {
    try {
      setLoading(true);
      const [jobData, shopData, partsData] = await Promise.all([
        jobService.getJobById(id),
        settingsService.getSettings().then((res) => res.shop).catch(() => null),
        partsService.getParts().catch(() => []),
      ]);
      setJob(jobData);
      setShop(shopData);
      setAvailableParts(partsData);

      // Initialize forms if data exists
      if (jobData.diagnosis) {
        setDiagnosisForm({
          reported_issue: jobData.diagnosis.reported_issue || jobData.customer_complaint,
          technician_findings: jobData.diagnosis.technician_findings || '',
          root_cause: jobData.diagnosis.root_cause || '',
          recommended_solution: jobData.diagnosis.recommended_solution || '',
          internal_technician_notes: jobData.diagnosis.internal_technician_notes || '',
        });
      } else {
        setDiagnosisForm((prev) => ({
          ...prev,
          reported_issue: jobData.customer_complaint,
        }));
      }

      if (jobData.estimate) {
        const loadedItems = (jobData.estimate.items || []).map((i) => ({
          part_id: i.part_id || null,
          item_name: i.item_name || '',
          quantity: i.quantity || 1,
          unit_price: i.unit_price ?? '',
          discount: i.discount || 0,
        }));
        const existingTaxRate = Number(jobData.estimate.tax_rate !== undefined ? jobData.estimate.tax_rate : 18);
        setEstimateForm({
          labor_charge: jobData.estimate.labor_charge || 0,
          discount: jobData.estimate.discount || 0,
          apply_tax: existingTaxRate > 0,
          tax_rate: existingTaxRate > 0 ? existingTaxRate : (shopData?.tax_rate || 18),
          notes: jobData.estimate.notes || '',
          items: loadedItems.length > 0 ? loadedItems : [{ item_name: '', quantity: 1, unit_price: '', discount: 0 }],
        });
      } else {
        setEstimateForm((prev) => ({
          ...prev,
          apply_tax: true,
          tax_rate: shopData?.tax_rate || 18,
          items: prev.items && prev.items.length > 0 ? prev.items : [{ item_name: '', quantity: 1, unit_price: '', discount: 0 }],
        }));
      }
    } catch (err) {
      toast.error('Failed to load Job Sheet');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [id]);

  // Status transitions
  const handleStartDiagnosis = async () => {
    try {
      const updated = await jobService.startDiagnosis(job.id);
      setJob((prev) => ({ ...prev, ...updated }));
      toast.success('Diagnosis phase started.');
      setIsDiagnosisModalOpen(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveDiagnosis = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await jobService.saveDiagnosis(job.id, diagnosisForm);
      setJob(res.job);
      toast.success('Diagnosis findings saved successfully.');
      setIsDiagnosisModalOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEstimateModal = () => {
    setEstimateForm((prev) => ({
      ...prev,
      items: prev.items && prev.items.length > 0
        ? prev.items
        : [{ item_name: '', quantity: 1, unit_price: '', discount: 0 }],
    }));
    setIsEstimateModalOpen(true);
  };

  const handleAddEstimateItem = () => {
    setEstimateForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { item_name: '', quantity: 1, unit_price: '', discount: 0 },
      ],
    }));
  };

  const handleRemoveEstimateItem = (index) => {
    setEstimateForm((prev) => {
      const items = [...(prev.items || [])];
      items.splice(index, 1);
      return {
        ...prev,
        items: items.length > 0 ? items : [{ item_name: '', quantity: 1, unit_price: '', discount: 0 }],
      };
    });
  };

  const handleUpdateEstimateItem = (index, field, value) => {
    setEstimateForm((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleSaveEstimate = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      // Clean and filter valid items (either has text or price > 0)
      const validItems = estimateForm.items
        .filter((i) => (i.item_name && i.item_name.trim() !== '') || (parseFloat(i.unit_price) > 0))
        .map((i) => ({
          part_id: i.part_id || null,
          item_name: i.item_name?.trim() || 'Repair Component / Service',
          quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
          unit_price: Math.max(0, parseFloat(i.unit_price) || 0),
          discount: Math.max(0, parseFloat(i.discount) || 0),
        }));

      const effectiveTaxRate = estimateForm.apply_tax
        ? Math.max(0, parseFloat(estimateForm.tax_rate) || 0)
        : 0;

      const res = await jobService.saveEstimate(job.id, {
        labor_charge: parseFloat(estimateForm.labor_charge) || 0,
        discount: parseFloat(estimateForm.discount) || 0,
        tax_rate: effectiveTaxRate,
        notes: estimateForm.notes || '',
        items: validItems,
        send_notification: true,
      });
      setJob(res.job);
      toast.success('Repair estimate saved and sent to customer!');
      setIsEstimateModalOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartRepair = async () => {
    Swal.fire({
      title: 'Commence Repair Work?',
      text: 'This will move the job to IN_PROGRESS and automatically deduct required components from shop inventory.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      confirmButtonText: 'Yes, Start Repair',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const updated = await jobService.startRepair(job.id);
          setJob((prev) => ({ ...prev, ...updated }));
          toast.success('Repair started! Parts deducted from stock.');
          fetchJobData();
        } catch (err) {
          toast.error(err.message);
        }
      }
    });
  };

  const handleCompleteRepair = async () => {
    try {
      const updated = await jobService.completeRepair(job.id);
      setJob((prev) => ({ ...prev, ...updated }));
      toast.success('Hardware repair complete! Device moved to Quality Check testing bench.');
      setActiveTab('testing');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveTests = async (updatedTests) => {
    try {
      setIsSaving(true);
      const res = await jobService.saveTests(job.id, updatedTests);
      setJob(res.job);
      toast.success('Quality check inspection saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkReadyForPickup = async () => {
    try {
      setIsSaving(true);
      // Ensure all tests are passed if completing QC inspection directly
      if (job.tests && job.tests.some((t) => t.result !== 'PASS')) {
        const allPass = (job.tests || []).map((t) => ({ ...t, result: 'PASS' }));
        await jobService.saveTests(job.id, allPass).catch(() => {});
      }
      const updated = await jobService.markReadyForPickup(job.id);
      setJob((prev) => ({ ...prev, ...updated }));
      toast.success('QC Inspection completed! Device marked Ready for Pickup.');
      // If user was on testing tab, advance to payments; if already on payments, remain on payments!
      setActiveTab((prev) => (prev === 'testing' ? 'payments' : prev));
    } catch (err) {
      toast.error(err.message || 'Failed to complete QC inspection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPickup = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await jobService.recordPickup(job.id, pickupForm);
      setJob((prev) => ({ ...prev, ...updated }));
      toast.success('Device delivered & final invoice sent to customer!');
      setIsPickupModalOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await paymentService.recordPayment({
        job_id: job.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference,
        notes: paymentForm.notes,
      });
      toast.success(`Payment of $${paymentForm.amount} recorded successfully.`);
      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: '',
        payment_method: 'CASH',
        transaction_reference: '',
        notes: '',
      });
      fetchJobData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelJob = () => {
    Swal.fire({
      title: 'Cancel this Repair Job?',
      text: 'Please enter the cancellation reason:',
      input: 'text',
      inputPlaceholder: 'Reason for cancellation...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Cancel Job',
      showLoaderOnConfirm: true,
      preConfirm: (reason) => {
        if (!reason) {
          Swal.showValidationMessage('Please provide a reason');
        }
        return reason;
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const updated = await jobService.cancelJob(job.id, result.value);
          setJob((prev) => ({ ...prev, ...updated }));
          toast.success('Job Sheet has been cancelled.');
        } catch (err) {
          toast.error(err.message);
        }
      }
    });
  };

  const handleDeleteJob = async () => {
    const result = await Swal.fire({
      title: 'Delete this Job Sheet?',
      text: `Are you sure you want to permanently delete Job #${job.job_number}? All diagnostic records, estimates, tests, invoices, and payments associated with this job will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Job',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await jobService.deleteJob(job.id);
        toast.success(`Job #${job.job_number} was successfully deleted.`);
        navigate('/jobs');
      } catch (err) {
        toast.error(err.message || 'Failed to delete job sheet');
      }
    }
  };

  const handleCopyApprovalLink = () => {
    const link = `${window.location.origin}/repair/${job.job_number}/approval?token=${job.approval_token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Customer approval link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading || !job) {
    return <LoadingSpinner label="Loading repair job sheet..." />;
  }

  const cond = job.device_condition || {};
  const accessories = job.accessories_received || [];

  return (
    <div className={`space-y-6 ${isPrintInvoiceOpen || isPrintJobSheetOpen ? 'print:hidden' : ''}`}>
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {job.job_number}
              </h2>
              <Badge status={job.status} />
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                job.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                job.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-700'
              }`}>
                {job.priority} Priority
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Intake Date: {new Date(job.created_at).toLocaleString()} • Technician: {job.technician?.full_name || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={Pencil}
            onClick={() => setIsJobEditModalOpen(true)}
          >
            Edit Job Sheet
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => setIsPrintJobSheetOpen(true)}
          >
            Service Order Sheet
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={FileText}
            onClick={() => setIsPrintInvoiceOpen(true)}
          >
            Invoice
          </Button>

          {job.approval_token && (
            <Button
              variant="outline"
              size="sm"
              icon={copiedLink ? Check : Share2}
              onClick={handleCopyApprovalLink}
            >
              Approval Link
            </Button>
          )}

          {!['DELIVERED', 'CANCELLED'].includes(job.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              icon={Ban}
              onClick={handleCancelJob}
            >
              Cancel
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            icon={Trash2}
            onClick={handleDeleteJob}
            title="Permanently Delete Job Sheet"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Prominent Next Action Banner */}
      <NextActionBanner
        job={job}
        userRole={user?.role_id}
        onStartDiagnosis={handleStartDiagnosis}
        onOpenEstimateModal={handleOpenEstimateModal}
        onStartRepair={handleStartRepair}
        onCompleteRepair={handleCompleteRepair}
        onOpenTestingTab={() => setActiveTab('testing')}
        onMarkReadyForPickup={handleMarkReadyForPickup}
        onOpenPickupModal={() => setIsPickupModalOpen(true)}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { key: 'overview', label: 'Overview & Intake' },
          { key: 'diagnosis', label: 'Diagnosis & Solution' },
          { key: 'estimate', label: 'Parts & Estimate' },
          { key: 'testing', label: 'Quality Check (16-Point)' },
          { key: 'payments', label: 'Payments & Invoice' },
          { key: 'timeline', label: 'Activity Audit Log' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info Card */}
            <Card
              title="Customer Details"
              action={
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditCustomerModalOpen(true)}
                    className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => navigate(`/customers/${job.customer?.id}`)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              }
            >
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <p><span className="text-slate-500">Full Name:</span> <strong className="text-slate-900">{job.customer?.full_name}</strong></p>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                    {job.customer?.user_type || 'End User'} • {job.customer?.gender || 'male'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <p><span className="text-slate-500">Phone:</span> <span className="font-mono font-medium">{job.customer?.phone}</span></p>
                  <p><span className="text-slate-500">WhatsApp:</span> <span className="font-mono">{job.customer?.whatsapp_number || job.customer?.phone}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2 bg-emerald-50/70 border border-emerald-200/60 rounded-lg">
                  <p><span className="text-slate-500">Alt Phone:</span> <span className="font-mono font-semibold text-slate-800">{job.customer?.alternate_phone || 'None'}</span></p>
                  <p><span className="text-emerald-700 font-semibold">Alt WP (In-Repair):</span> <span className="font-mono font-bold text-emerald-900">{job.customer?.alternate_whatsapp || job.customer?.alternate_phone || 'None'}</span></p>
                </div>
                {job.customer?.email && <p><span className="text-slate-500">Mail ID:</span> {job.customer.email}</p>}
                {job.customer?.address && <p><span className="text-slate-500">Address:</span> {job.customer.address}</p>}
              </div>
            </Card>

            {/* Device Info Card */}
            <Card title="Device Specifications">
              <div className="space-y-2.5 text-xs">
                <p><span className="text-slate-500">Model:</span> <strong className="text-slate-900">{job.device?.brand} {job.device?.model}</strong></p>
                <p><span className="text-slate-500">IMEI:</span> <span className="font-mono font-medium">{job.device?.imei || 'Not provided'}</span></p>
                <p><span className="text-slate-500">Passcode / PIN:</span> <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{job.device?.passcode || 'None'}</span></p>
                <p><span className="text-slate-500">Color / Storage:</span> {job.device?.color || 'N/A'} {job.device?.storage_capacity ? `• ${job.device.storage_capacity}` : ''}</p>
                <p><span className="text-slate-500">Operating System:</span> {job.device?.operating_system || 'iOS/Android'}</p>
              </div>
            </Card>
          </div>

          {/* Reported Complaint */}
          <Card title="Customer Reported Complaint">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs italic text-slate-800">
              "{job.customer_complaint}"
            </div>
          </Card>

          {/* Intake Condition & Accessories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Inward Inspection Checklist (12-Point)"
              action={
                <button
                  onClick={() => setIsEditJobModalOpen(true)}
                  className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Checklist</span>
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {INWARD_CHECKLIST_CONFIG.map((item) => {
                  const val = resolveChecklistValue(item.key, cond);
                  const isPositive = (item.type === 'working' && val === 'Yes') || (item.type === 'damage' && val === 'No');

                  return (
                    <div key={item.key} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 text-[11px]">{item.label}</span>
                      <span
                        className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Liquid / Water Damage Suspected:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${cond.water_damage ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                  {cond.water_damage ? 'YES (Detected)' : 'NO'}
                </span>
              </div>
              {cond.notes && (
                <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded">
                  Notes: {cond.notes}
                </p>
              )}
            </Card>

            <Card title="Accessories Handed Over">
              <div className="flex flex-wrap gap-2">
                {accessories.length > 0 ? (
                  accessories.map((acc, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                      ✓ {acc}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-xs">No accessories handed in (Device only)</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: DIAGNOSIS */}
      {activeTab === 'diagnosis' && (
        <Card
          title="Diagnostic Assessment"
          subtitle="Findings discovered by technician during inspection"
          action={
            ['admin', 'technician'].includes(user?.role_id) && (
              <Button size="sm" onClick={() => setIsDiagnosisModalOpen(true)}>
                {job.diagnosis ? 'Edit Diagnosis' : 'Log Diagnosis'}
              </Button>
            )
          }
        >
          {job.diagnosis ? (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Technician Findings</span>
                <p className="text-slate-800 text-sm font-medium leading-relaxed">{job.diagnosis.technician_findings}</p>
              </div>

              {job.diagnosis.root_cause && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Root Cause</span>
                  <p className="text-slate-800 leading-relaxed">{job.diagnosis.root_cause}</p>
                </div>
              )}

              <div className="p-3.5 bg-primary-50/50 rounded-xl border border-primary-200">
                <span className="text-[10px] uppercase font-bold text-primary-600 block mb-1">Recommended Solution / Repair Path</span>
                <p className="text-primary-950 font-medium leading-relaxed">{job.diagnosis.recommended_solution}</p>
              </div>

              {job.diagnosis.internal_technician_notes && ['admin', 'technician'].includes(user?.role_id) && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-amber-900">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">Internal Bench Notes</span>
                  <p className="italic">{job.diagnosis.internal_technician_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Wrench}
              title="No diagnosis recorded yet"
              description="Technician needs to examine hardware, discover root cause, and specify recommended fix."
              actionLabel="Start Diagnosis"
              onAction={handleStartDiagnosis}
            />
          )}
        </Card>
      )}

      {/* TAB 3: ESTIMATE */}
      {activeTab === 'estimate' && (
        <Card
          title="Repair Estimate & Parts Quotation"
          subtitle="Includes labor charge, replacement parts, tax, and customer authorization status"
          action={
            ['admin', 'technician'].includes(user?.role_id) && (
              <Button size="sm" onClick={handleOpenEstimateModal}>
                {job.estimate ? 'Update Estimate' : 'Create Estimate'}
              </Button>
            )
          }
        >
          {job.estimate ? (
            <div className="space-y-6 text-xs">
              {/* Approval status banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Customer Authorization:</span>
                  <Badge status={job.approval_status} />
                  {job.approval_decision_at && (
                    <span className="text-slate-500 font-mono text-[11px]">
                      ({new Date(job.approval_decision_at).toLocaleString()})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => window.open(`/repair/${job.job_number}/approval?token=${job.approval_token}`, '_blank')}
                  >
                    Open Customer Approval Page
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={copiedLink ? Check : Copy}
                    onClick={handleCopyApprovalLink}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5">Item Description</th>
                      <th className="px-4 py-2.5 text-center">Quantity</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Discount</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Number(job.estimate.labor_charge) > 0 && (
                      <tr className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          Diagnostic Bench Labor & Technical Service Fee
                        </td>
                        <td className="px-4 py-2.5 text-center">1</td>
                        <td className="px-4 py-2.5 text-right font-mono">{currSym}{Number(job.estimate.labor_charge).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{currSym}0.00</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {currSym}{Number(job.estimate.labor_charge).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {(job.estimate.items || []).map((item, index) => (
                      <tr key={index} className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{item.item_name}</td>
                        <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{currSym}{Number(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-600">
                          {item.discount > 0 ? `-${currSym}${Number(item.discount).toFixed(2)}` : `${currSym}0.00`}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {currSym}{Number(item.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Parts Subtotal:</span>
                    <span className="font-mono">{currSym}{Number(job.estimate.parts_subtotal).toFixed(2)}</span>
                  </div>
                  {Number(job.estimate.labor_charge) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Labor Charge:</span>
                      <span className="font-mono">{currSym}{Number(job.estimate.labor_charge).toFixed(2)}</span>
                    </div>
                  )}
                  {job.estimate.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono">-{currSym}{Number(job.estimate.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>{Number(job.estimate.tax_rate || 0) > 0 ? `GST / Tax (${job.estimate.tax_rate}%):` : 'GST / Tax:'}</span>
                    <span className="font-mono">
                      {Number(job.estimate.tax_rate || 0) > 0
                        ? `${currSym}${Number(job.estimate.tax_amount).toFixed(2)}`
                        : 'Nil / Exempt (₹0.00)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Estimated Total:</span>
                    <span className="font-mono">{currSym}{Number(job.estimate.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No estimate prepared"
              description="Calculate labor fees and required components to generate customer repair quotation."
              actionLabel="Create Estimate"
              onAction={handleOpenEstimateModal}
            />
          )}
        </Card>
      )}

      {/* TAB 4: QUALITY CHECK TESTING */}
      {activeTab === 'testing' && (
        <Card
          title="Hardware Quality Assurance (QC)"
          subtitle="Mandatory 16-point checklist verified before customer release"
        >
          <QualityChecklist
            tests={job.tests || []}
            onSave={handleSaveTests}
            readOnly={!['admin', 'technician'].includes(user?.role_id)}
            isSaving={isSaving}
          />
        </Card>
      )}

      {/* TAB 5: PAYMENTS & INVOICE */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Cost</p>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">${Number(job.total_amount).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Amount Paid</p>
              <p className="text-2xl font-black text-emerald-600 font-mono mt-1">${Number(job.paid_amount || 0).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Remaining Balance</p>
              <p className={`text-2xl font-black font-mono mt-1 ${job.balance_due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                ${Number(job.balance_due || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <Card
            title={`Payment Ledger (${job.payments?.length || 0})`}
            subtitle="Record transactions via Cash, Card, UPI, or Bank Transfer"
            action={
              job.balance_due > 0 && ['admin', 'staff'].includes(user?.role_id) && (
                <Button size="sm" icon={CreditCard} onClick={() => setIsPaymentModalOpen(true)}>
                  Record Payment
                </Button>
              )
            }
            bodyClassName="p-0"
          >
            {job.payments && job.payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Receipt / Ref</th>
                      <th className="px-5 py-3">Payment Method</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3">Paid Date</th>
                      <th className="px-5 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {job.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-700">{p.payment_number}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{p.payment_method}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600">
                          ${Number(p.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">
                          {new Date(p.paid_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No payments recorded"
                description="Record customer deposit or final payment to settle invoice."
                actionLabel={job.balance_due > 0 ? "Record Payment" : null}
                onAction={() => setIsPaymentModalOpen(true)}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 6: TIMELINE */}
      {activeTab === 'timeline' && (
        <Card title="Job Status Activity & Audit Trail" subtitle="Chronological history of all technician actions and state changes">
          <JobTimeline history={job.history || []} />
        </Card>
      )}

      {/* MODAL 1: Diagnosis Modal */}
      <Modal
        isOpen={isDiagnosisModalOpen}
        onClose={() => setIsDiagnosisModalOpen(false)}
        title="Log Device Diagnosis Findings"
        subtitle="Record technician evaluation, root cause, and proposed repair solution"
      >
        <form onSubmit={handleSaveDiagnosis} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Technician Findings *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Display backlight is dead due to blown inductor on mainboard. Charging port pins are oxidized."
              value={diagnosisForm.technician_findings}
              onChange={(e) => setDiagnosisForm({ ...diagnosisForm, technician_findings: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Discovered Root Cause
            </label>
            <input
              type="text"
              placeholder="e.g. Physical drop impact damaged display flex connector"
              value={diagnosisForm.root_cause}
              onChange={(e) => setDiagnosisForm({ ...diagnosisForm, root_cause: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Recommended Solution *
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Replace OLED display assembly and clean USB-C charging port board."
              value={diagnosisForm.recommended_solution}
              onChange={(e) => setDiagnosisForm({ ...diagnosisForm, recommended_solution: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Internal Bench Notes (Hidden from customer)
            </label>
            <textarea
              rows={2}
              placeholder="Internal notes for lead technician..."
              value={diagnosisForm.internal_technician_notes}
              onChange={(e) => setDiagnosisForm({ ...diagnosisForm, internal_technician_notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsDiagnosisModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSaving}>
              Save Diagnosis
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Estimate Modal */}
      <Modal
        isOpen={isEstimateModalOpen}
        onClose={() => setIsEstimateModalOpen(false)}
        title="Prepare Repair Estimate"
        subtitle="Write required parts or repair details and applicable discounts"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEstimate} className="space-y-5">
          {/* Discount Card */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200">
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Discount ({currSym})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                  {currSym}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={estimateForm.discount}
                  onChange={(e) => setEstimateForm({ ...estimateForm, discount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Promotional or customer loyalty discount</p>
            </div>
          </div>

          {/* GST / Tax Toggle & Rate Control */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estimateForm.apply_tax}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEstimateForm({
                        ...estimateForm,
                        apply_tax: checked,
                        tax_rate: checked ? (parseFloat(estimateForm.tax_rate) > 0 ? estimateForm.tax_rate : 18) : 0,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                    {estimateForm.apply_tax ? 'GST / Tax is Applied (ON)' : 'GST / Tax is Disabled (OFF)'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {estimateForm.apply_tax
                      ? 'Tax will be computed and itemized on the quotation and final invoice'
                      : 'Tax exempt / Nil. Customer will only pay subtotal without additional GST'}
                  </p>
                </div>
              </div>

              {estimateForm.apply_tax && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-600">GST Rate:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={estimateForm.tax_rate}
                      onChange={(e) => setEstimateForm({ ...estimateForm, tax_rate: e.target.value })}
                      className="w-12 text-xs font-mono font-bold text-slate-900 focus:outline-none text-right"
                    />
                    <span className="text-xs font-bold text-slate-700">%</span>
                  </div>
                </div>
              )}
            </div>

            {estimateForm.apply_tax && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Presets:</span>
                {[5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setEstimateForm({ ...estimateForm, tax_rate: rate })}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                      Number(estimateForm.tax_rate) === rate
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {rate}% GST
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parts & Repair Details List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Parts & Repair Details
                </label>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-700 rounded-full">
                  {(estimateForm.items || []).length} {(estimateForm.items || []).length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {availableParts.length > 0 && (
                <select
                  onChange={(e) => {
                    const partId = e.target.value;
                    if (!partId) return;
                    const selected = availableParts.find((p) => p.id === partId);
                    if (selected) {
                      setEstimateForm((prev) => {
                        const items = [...(prev.items || [])];
                        const lastIdx = items.length - 1;
                        if (lastIdx >= 0 && !items[lastIdx].item_name && (!items[lastIdx].unit_price || items[lastIdx].unit_price === '')) {
                          items[lastIdx] = {
                            part_id: selected.id,
                            item_name: selected.name,
                            quantity: 1,
                            unit_price: selected.selling_price,
                            discount: 0,
                          };
                          return { ...prev, items };
                        } else {
                          return {
                            ...prev,
                            items: [
                              ...items,
                              {
                                part_id: selected.id,
                                item_name: selected.name,
                                quantity: 1,
                                unit_price: selected.selling_price,
                                discount: 0,
                              },
                            ],
                          };
                        }
                      });
                    }
                    e.target.value = '';
                  }}
                  className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors focus:outline-none"
                >
                  <option value="">+ From Inventory...</option>
                  {availableParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({currSym}{Number(p.selling_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Column Headers for larger screens */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1.5 bg-slate-100/80 rounded-lg text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <div className="col-span-6">Part or Repair Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price ({currSym})</div>
              <div className="col-span-2 text-right pr-6">Total</div>
            </div>

            {/* Field Rows */}
            <div className="space-y-2">
              {(estimateForm.items || []).map((item, idx) => {
                const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                const price = Math.max(0, parseFloat(item.unit_price) || 0);
                const lineTotal = qty * price;

                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-2 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Part or Repair Details Input */}
                      <div className="sm:col-span-6">
                        <label className="block sm:hidden text-[11px] font-semibold text-slate-600 mb-1">
                          Part / Repair Details
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Original Display Combo, Battery, Charging IC..."
                          value={item.item_name || ''}
                          onChange={(e) => handleUpdateEstimateItem(idx, 'item_name', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none font-medium"
                          autoFocus={idx === (estimateForm.items.length - 1) && idx > 0}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="grid grid-cols-3 sm:contents gap-2 items-center">
                        <div className="sm:col-span-2">
                          <label className="block sm:hidden text-[11px] font-semibold text-slate-600 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateEstimateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center text-slate-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          />
                        </div>

                        {/* Price */}
                        <div className="sm:col-span-2">
                          <label className="block sm:hidden text-[11px] font-semibold text-slate-600 mb-1">
                            Price ({currSym})
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                              {currSym}
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateEstimateItem(idx, 'unit_price', e.target.value)}
                              className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-right text-slate-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Total & Remove */}
                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-1.5">
                          <div className="sm:hidden">
                            <span className="text-[11px] font-semibold text-slate-600 block">Total</span>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {currSym}{lineTotal.toFixed(2)}
                            </span>
                          </div>

                          <span className="hidden sm:inline font-mono text-xs font-bold text-slate-900 min-w-[65px] text-right">
                            {currSym}{lineTotal.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveEstimateItem(idx)}
                            title="Remove this item"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* + Add Another Part or Repair Detail Button */}
              <button
                type="button"
                onClick={handleAddEstimateItem}
                className="w-full py-2.5 px-3 bg-white hover:bg-primary-50/60 text-primary-600 hover:text-primary-700 border-2 border-dashed border-primary-200 hover:border-primary-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm group"
              >
                <div className="w-5 h-5 rounded-full bg-primary-100 group-hover:bg-primary-200 text-primary-700 flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>+ Add Another Part or Repair Detail</span>
              </button>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Estimate Notes & Terms (Optional)
            </label>
            <textarea
              rows="2"
              value={estimateForm.notes || ''}
              onChange={(e) => setEstimateForm({ ...estimateForm, notes: e.target.value })}
              placeholder="e.g. Quotation valid for 7 days. 90-day warranty on replaced parts."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Live Summary Card */}
          {(() => {
            const partsTotal = (estimateForm.items || []).reduce((acc, item) => {
              const q = Math.max(1, parseInt(item.quantity, 10) || 1);
              const p = Math.max(0, parseFloat(item.unit_price) || 0);
              return acc + (q * p);
            }, 0);
            const labor = Math.max(0, parseFloat(estimateForm.labor_charge) || 0);
            const discount = Math.max(0, parseFloat(estimateForm.discount) || 0);
            const subtotal = Math.max(0, partsTotal + labor - discount);
            const taxRate = estimateForm.apply_tax ? Math.max(0, parseFloat(estimateForm.tax_rate) || 0) : 0;
            const taxAmount = (subtotal * taxRate) / 100;
            const grandTotal = subtotal + taxAmount;

            return (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-md border border-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3 pb-3 border-b border-slate-700/60">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Labor Charge</span>
                    <span className="font-mono text-sm font-semibold text-slate-100">
                      {currSym}{labor.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Parts & Repairs ({(estimateForm.items || []).filter(i => i.item_name || i.unit_price).length})
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-100">
                      {currSym}{partsTotal.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Discount</span>
                    <span className="font-mono text-sm font-semibold text-emerald-400">
                      {discount > 0 ? `-${currSym}${discount.toFixed(2)}` : `${currSym}0.00`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {taxRate > 0 ? `GST / Tax (${taxRate}%)` : 'GST / Tax'}
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-300">
                      {taxRate > 0 ? `${currSym}${taxAmount.toFixed(2)}` : 'Nil (0%)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                      Total Estimated Amount
                    </span>
                    <p className="text-[11px] text-slate-400">Total payable by customer upon repair approval</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {currSym}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsEstimateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" icon={Send} loading={isSaving}>
              Save & Send to Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Customer Payment"
        subtitle={`Remaining Balance: $${Number(job.balance_due || 0).toFixed(2)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Payment Amount ($) *
            </label>
            <input
              type="number"
              step="0.01"
              max={job.balance_due}
              required
              placeholder={String(job.balance_due)}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setPaymentForm({ ...paymentForm, amount: String(job.balance_due) })}
              className="text-[11px] text-primary-600 hover:underline font-medium mt-1 inline-block"
            >
              Pay Full Remaining Balance (${Number(job.balance_due).toFixed(2)})
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Payment Method *
            </label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="UPI">UPI / Digital QR</option>
              <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
              <option value="OTHER">Other Method</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Transaction Reference / Receipt ID
            </label>
            <input
              type="text"
              placeholder="e.g. TXN-89410 or Card Slip #481"
              value={paymentForm.transaction_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="Optional payment notes..."
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" icon={DollarSign} loading={isSaving}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Customer Pickup & Handover Modal */}
      <Modal
        isOpen={isPickupModalOpen}
        onClose={() => setIsPickupModalOpen(false)}
        title="Customer Pickup & Delivery Confirmation"
        subtitle="Customer inspection and device release protocol"
      >
        <form onSubmit={handleRecordPickup} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={pickupForm.customer_tested_device}
                onChange={(e) => setPickupForm({ ...pickupForm, customer_tested_device: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span>Customer physically tested device in shop: <strong>YES</strong></span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={pickupForm.customer_acceptance_confirmed}
                onChange={(e) => setPickupForm({ ...pickupForm, customer_acceptance_confirmed: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span>Customer confirms: <em>"Device received and working properly."</em></span>
            </label>
          </div>

          {job.balance_due > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Warning: Outstanding balance of ${job.balance_due.toFixed(2)} must be collected before handover.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Delivery Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Handed over with charger and warranty receipt."
              value={pickupForm.delivery_notes}
              onChange={(e) => setPickupForm({ ...pickupForm, delivery_notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200/80 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Automatic Invoice & Receipt Dispatch</span>
              <p className="text-[11px] text-sky-700 leading-normal">
                Tax invoice and warranty certificate will be sent immediately to customer's WhatsApp & Email upon clicking delivery.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsPickupModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              icon={CheckCircle2}
              loading={isSaving}
              disabled={job.balance_due > 0 || !pickupForm.customer_tested_device || !pickupForm.customer_acceptance_confirmed}
            >
              Complete Delivery & Send Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Job Sheet Modal Portal */}
      {isPrintJobSheetOpen && createPortal(
        <div id="print-jobsheet-portal" className="print-modal-portal fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static">
          {/* Click outside backdrop */}
          <div
            className="fixed inset-0 bg-transparent no-print cursor-pointer"
            onClick={() => setIsPrintJobSheetOpen(false)}
          />

          <div
            className="print-modal-card relative w-full max-w-5xl my-4 sm:my-8 bg-white rounded-2xl shadow-2xl border border-slate-300 z-10 overflow-hidden flex flex-col print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Mobotech Mobile Care — Service Order Sheet</h3>
                  <p className="text-[11px] text-slate-400">Ref: {job.job_number} • Print-Ready Intake Document</p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintJobSheetOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>✕ Close</span>
              </button>
            </div>

            {/* Document Content */}
            <div className="p-3 sm:p-6 overflow-y-auto max-h-[82vh] bg-slate-100 print:max-h-none print:overflow-visible print:p-0 print:bg-white">
              <JobSheetPrintable job={job} shop={shop} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Printable Invoice Modal Portal */}
      {isPrintInvoiceOpen && createPortal(
        <div id="print-invoice-portal" className="print-modal-portal fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static">
          {/* Click outside backdrop */}
          <div
            className="fixed inset-0 bg-transparent no-print cursor-pointer"
            onClick={() => setIsPrintInvoiceOpen(false)}
          />

          <div
            className="print-modal-card relative w-full max-w-5xl my-4 sm:my-8 bg-white rounded-2xl shadow-2xl border border-slate-300 z-10 overflow-hidden flex flex-col print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Mobotech Mobile Care — Official Tax Invoice & Service Record</h3>
                  <p className="text-[11px] text-slate-400">Job: {job.job_number} • Invoice: {job.invoice?.invoice_number || 'INV-FINAL'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintInvoiceOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>✕ Close</span>
              </button>
            </div>

            {/* Document Content */}
            <div className="p-3 sm:p-6 overflow-y-auto max-h-[82vh] bg-slate-100 print:max-h-none print:overflow-visible print:p-0 print:bg-white">
              <InvoicePrintable invoice={job.invoice || { invoice_number: `INV-PREVIEW` }} job={job} shop={shop} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Job Sheet Modal */}
      {isJobEditModalOpen && (
        <JobEditModal
          isOpen={isJobEditModalOpen}
          onClose={() => setIsJobEditModalOpen(false)}
          job={job}
          onSave={(updatedJob) => {
            setJob((prev) => ({ ...prev, ...updatedJob }));
            fetchJobData();
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {isEditCustomerModalOpen && (
        <CustomerEditModal
          isOpen={isEditCustomerModalOpen}
          onClose={() => setIsEditCustomerModalOpen(false)}
          customer={job.customer}
          onSave={(updatedCustomer) => {
            setJob((prev) => ({
              ...prev,
              customer: { ...prev.customer, ...updatedCustomer },
            }));
          }}
        />
      )}
    </div>
  );
};
