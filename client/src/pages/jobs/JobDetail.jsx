import React, { useState, useEffect } from 'react';
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
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { jobService } from '../../services/jobService';
import { partsService } from '../../services/partsService';
import { paymentService } from '../../services/paymentService';
import { invoiceService } from '../../services/invoiceService';
import { settingsService } from '../../services/settingsService';

import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { NextActionBanner } from '../../components/jobs/NextActionBanner';
import { JobTimeline } from '../../components/jobs/JobTimeline';
import { QualityChecklist } from '../../components/jobs/QualityChecklist';
import { JobSheetPrintable } from '../../components/print/JobSheetPrintable';
import { InvoicePrintable } from '../../components/print/InvoicePrintable';

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
    tax_rate: 8.25,
    notes: '',
    items: [],
  });

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
        setEstimateForm({
          labor_charge: jobData.estimate.labor_charge || 0,
          discount: jobData.estimate.discount || 0,
          tax_rate: jobData.estimate.tax_rate ?? 8.25,
          notes: jobData.estimate.notes || '',
          items: (jobData.estimate.items || []).map((i) => ({
            part_id: i.part_id,
            item_name: i.item_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount: i.discount || 0,
          })),
        });
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

  const handleSaveEstimate = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await jobService.saveEstimate(job.id, {
        ...estimateForm,
        send_notification: true,
      });
      setJob(res.job);
      toast.success(`Estimate saved and customer notified!`);
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
      const updated = await jobService.markReadyForPickup(job.id);
      setJob((prev) => ({ ...prev, ...updated }));
      toast.success('Device marked Ready for Pickup! Customer notified via Email, WhatsApp & SMS.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRecordPickup = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await jobService.recordPickup(job.id, pickupForm);
      setJob((prev) => ({ ...prev, ...updated }));
      toast.success('Device successfully delivered to customer!');
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
    <div className="space-y-6">
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
            icon={Printer}
            onClick={() => setIsPrintJobSheetOpen(true)}
          >
            Job Sheet
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
        </div>
      </div>

      {/* Prominent Next Action Banner */}
      <NextActionBanner
        job={job}
        userRole={user?.role_id}
        onStartDiagnosis={handleStartDiagnosis}
        onOpenEstimateModal={() => setIsEstimateModalOpen(true)}
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
                <button
                  onClick={() => navigate(`/customers/${job.customer?.id}`)}
                  className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              }
            >
              <div className="space-y-2.5 text-xs">
                <p><span className="text-slate-500">Full Name:</span> <strong className="text-slate-900">{job.customer?.full_name}</strong></p>
                <p><span className="text-slate-500">Phone:</span> <span className="font-mono">{job.customer?.phone}</span></p>
                <p><span className="text-slate-500">WhatsApp:</span> <span className="font-mono">{job.customer?.whatsapp_number || job.customer?.phone}</span></p>
                {job.customer?.email && <p><span className="text-slate-500">Email:</span> {job.customer.email}</p>}
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
            <Card title="Intake Physical Condition">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className="text-slate-500">Screen:</span> <strong>{cond.screen || 'Intact'}</strong></p>
                <p><span className="text-slate-500">Body:</span> <strong>{cond.body || 'Good'}</strong></p>
                <p><span className="text-slate-500">Scratches:</span> <strong>{cond.scratches || 'Minor'}</strong></p>
                <p><span className="text-slate-500">Cracks:</span> <strong>{cond.cracks || 'None'}</strong></p>
                <p><span className="text-slate-500">Charging Port:</span> <strong>{cond.charging_port || 'Normal'}</strong></p>
                <p><span className="text-slate-500">Liquid Damage:</span> <strong className={cond.water_damage ? 'text-rose-600' : 'text-emerald-600'}>{cond.water_damage ? 'YES' : 'NO'}</strong></p>
              </div>
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
              <Button size="sm" onClick={() => setIsEstimateModalOpen(true)}>
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
                    <tr className="bg-white">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        Diagnostic Bench Labor & Technical Service Fee
                      </td>
                      <td className="px-4 py-2.5 text-center">1</td>
                      <td className="px-4 py-2.5 text-right font-mono">${Number(job.estimate.labor_charge).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">$0.00</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                        ${Number(job.estimate.labor_charge).toFixed(2)}
                      </td>
                    </tr>
                    {(job.estimate.items || []).map((item, index) => (
                      <tr key={index} className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{item.item_name}</td>
                        <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-600">
                          {item.discount > 0 ? `-$${Number(item.discount).toFixed(2)}` : '$0.00'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                          ${Number(item.total_price).toFixed(2)}
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
                    <span className="font-mono">${Number(job.estimate.parts_subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Labor Charge:</span>
                    <span className="font-mono">${Number(job.estimate.labor_charge).toFixed(2)}</span>
                  </div>
                  {job.estimate.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono">-${Number(job.estimate.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({job.estimate.tax_rate}%):</span>
                    <span className="font-mono">${Number(job.estimate.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Estimated Total:</span>
                    <span className="font-mono">${Number(job.estimate.total_amount).toFixed(2)}</span>
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
              onAction={() => setIsEstimateModalOpen(true)}
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
        subtitle="Specify diagnostic labor fee and select replacement components"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEstimate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Labor & Bench Charge ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimateForm.labor_charge}
                onChange={(e) => setEstimateForm({ ...estimateForm, labor_charge: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Discount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimateForm.discount}
                onChange={(e) => setEstimateForm({ ...estimateForm, discount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Add Part from Catalog */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Replacement Parts Required
              </label>
              <select
                onChange={(e) => {
                  const partId = e.target.value;
                  if (!partId) return;
                  const selectedPart = availableParts.find((p) => p.id === partId);
                  if (selectedPart) {
                    setEstimateForm({
                      ...estimateForm,
                      items: [
                        ...estimateForm.items,
                        {
                          part_id: selectedPart.id,
                          item_name: selectedPart.name,
                          quantity: 1,
                          unit_price: selectedPart.selling_price,
                          discount: 0,
                        },
                      ],
                    });
                  }
                  e.target.value = '';
                }}
                className="px-2.5 py-1 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-lg focus:outline-none"
              >
                <option value="">+ Add Part from Inventory...</option>
                {availableParts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${Number(p.selling_price).toFixed(2)}) - Stock: {p.stock_quantity}
                  </option>
                ))}
              </select>
            </div>

            {/* List of items */}
            {estimateForm.items.length === 0 ? (
              <p className="text-slate-400 italic text-xs py-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No parts added yet. Select a part from inventory or service fees only.
              </p>
            ) : (
              <div className="space-y-2">
                {estimateForm.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="flex-1 font-medium text-slate-800">{item.item_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          const newItems = [...estimateForm.items];
                          newItems[idx].quantity = val;
                          setEstimateForm({ ...estimateForm, items: newItems });
                        }}
                        className="w-14 px-2 py-1 bg-white border border-slate-200 rounded font-mono text-center"
                      />
                      <span className="text-slate-500">Price:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const newItems = [...estimateForm.items];
                          newItems[idx].unit_price = val;
                          setEstimateForm({ ...estimateForm, items: newItems });
                        }}
                        className="w-20 px-2 py-1 bg-white border border-slate-200 rounded font-mono text-right"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEstimateForm({
                            ...estimateForm,
                            items: estimateForm.items.filter((_, i) => i !== idx),
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              Complete Delivery
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Job Sheet Modal */}
      {isPrintJobSheetOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPrintJobSheetOpen(false)}
              className="no-print absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              ✕ Close
            </button>
            <JobSheetPrintable job={job} shop={shop} />
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {isPrintInvoiceOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPrintInvoiceOpen(false)}
              className="no-print absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              ✕ Close
            </button>
            <InvoicePrintable invoice={job.invoice || { invoice_number: `INV-PREVIEW` }} job={job} shop={shop} />
          </div>
        </div>
      )}
    </div>
  );
};
