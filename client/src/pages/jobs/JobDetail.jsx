import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  IndianRupee,
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
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { jobService } from '../../services/jobService';
import { partsService } from '../../services/partsService';
import { paymentService } from '../../services/paymentService';
import { invoiceService } from '../../services/invoiceService';
import { settingsService } from '../../services/settingsService';
import { INWARD_CHECKLIST_CONFIG, resolveChecklistValue } from '../../utils/checklistConstants';

import { Card, LoadingSpinner, EmptyState, DetailSkeleton } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { SpatialPartsPicker } from '../../components/common/SpatialPartsPicker';
import { SpatialWarrantyInput } from '../../components/common/SpatialWarrantyInput';
import { NextActionBanner } from '../../components/jobs/NextActionBanner';
import { JobTimeline } from '../../components/jobs/JobTimeline';
import { QualityChecklist } from '../../components/jobs/QualityChecklist';
import { JobSheetPrintable } from '../../components/print/JobSheetPrintable';
import { InvoicePrintable } from '../../components/print/InvoicePrintable';
import { JobEditModal } from '../../components/jobs/JobEditModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';

export const getDefaultTabForStatus = (status) => {
  switch (status) {
    case 'RECEIVED':
      return 'overview';
    case 'DIAGNOSING':
      return 'diagnosis';
    case 'ESTIMATE_SENT':
    case 'APPROVED':
    case 'IN_PROGRESS':
      return 'estimate';
    case 'TESTING':
      return 'testing';
    case 'READY_FOR_PICKUP':
    case 'DELIVERED':
      return 'payments';
    default:
      return 'overview';
  }
};

const STATUS_OPTIONS = [
  { key: 'RECEIVED', label: 'Received', desc: 'Device intake complete, awaiting technician diagnosis' },
  { key: 'DIAGNOSING', label: 'Diagnosing', desc: 'Hardware fault analysis & diagnostic testing in progress' },
  { key: 'ESTIMATE_SENT', label: 'Estimate Sent', desc: 'Quotation sent, awaiting customer authorization' },
  { key: 'APPROVED', label: 'Approved', desc: 'Customer authorized repair estimate' },
  { key: 'REJECTED', label: 'Estimate Rejected', desc: 'Customer declined repair quote, prepare return' },
  { key: 'IN_PROGRESS', label: 'In Progress', desc: 'Active hardware replacement & workbench repairs' },
  { key: 'TESTING', label: 'QC Testing', desc: '16-point Quality Check checklist testing bench' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', desc: 'All tests verified, packaged for customer pickup' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Device handed over to customer & invoice finalized' },
  { key: 'CANCELLED', label: 'Cancelled', desc: 'Repair order cancelled and ticket closed' },
];

export const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const { user } = useSelector((state) => state.auth);

  const [job, setJob] = useState(null);
  const [shop, setShop] = useState(null);
  const [availableParts, setAvailableParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(queryTab || 'overview');
  const tabManuallySelectedRef = useRef(Boolean(queryTab));

  // Modals
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isPrintJobSheetOpen, setIsPrintJobSheetOpen] = useState(false);
  const [isPrintInvoiceOpen, setIsPrintInvoiceOpen] = useState(false);
  const [isJobEditModalOpen, setIsJobEditModalOpen] = useState(false);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [sendStatusNotification, setSendStatusNotification] = useState(true);

  const [discountModalForm, setDiscountModalForm] = useState({
    discount_type: 'AMOUNT',
    discount_value: '',
    notes: '',
  });

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
    discount_type: 'AMOUNT', // 'AMOUNT' | 'PERCENTAGE'
    discount_value: '',
    discount: 0,
    apply_tax: false,
    tax_rate: 18,
    notes: '',
    items: [{ item_name: '', quantity: 1, unit_price: '', discount: 0 }],
  });

  const [reopenForm, setReopenForm] = useState({
    reason: '',
    target_status: 'DIAGNOSING',
    notes: '',
    claim_type: 'SAME_ISSUE',
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
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isFreeWarranty = Boolean(
    job?.is_warranty_claim &&
    (job?.warranty_same_issue || job?.warranty_free_rework || Number(job?.balance_due) === 0 || Number(job?.total_amount) === 0)
  );

  const isEstimateRejected = Boolean(
    job?.status === 'REJECTED' || job?.approval_status === 'REJECTED'
  );

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

      // Auto-select tab: if queryTab is present (?tab=diagnosis from eye icon), honor it!
      if (queryTab) {
        setActiveTab(queryTab);
        tabManuallySelectedRef.current = true;
      } else if (!tabManuallySelectedRef.current) {
        setActiveTab(getDefaultTabForStatus(jobData.status));
      }

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
          warranty: i.warranty || '',
          quantity: i.quantity || 1,
          unit_price: i.unit_price ?? '',
          discount: i.discount || 0,
        }));
        const existingTaxRate = Number(jobData.estimate.tax_rate !== undefined ? jobData.estimate.tax_rate : 18);
        const existingDiscountType = jobData.estimate.discount_type || 'AMOUNT';
        const existingDiscountValue = jobData.estimate.discount_value !== undefined
          ? jobData.estimate.discount_value
          : (jobData.estimate.discount || '');

        setEstimateForm({
          labor_charge: jobData.estimate.labor_charge || 0,
          discount_type: existingDiscountType,
          discount_value: existingDiscountValue,
          discount: jobData.estimate.discount || 0,
          apply_tax: existingTaxRate > 0,
          tax_rate: existingTaxRate > 0 ? existingTaxRate : (shopData?.tax_rate || 18),
          notes: jobData.estimate.notes || '',
          items: loadedItems.length > 0 ? loadedItems : [{ item_name: '', warranty: '', quantity: 1, unit_price: '', discount: 0 }],
        });
      } else {
        setEstimateForm((prev) => ({
          ...prev,
          discount_type: 'AMOUNT',
          discount_value: '',
          discount: 0,
          apply_tax: false,
          tax_rate: shopData?.tax_rate || 18,
          items: prev.items && prev.items.length > 0 ? prev.items : [{ item_name: '', warranty: '', quantity: 1, unit_price: '', discount: 0 }],
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
    tabManuallySelectedRef.current = Boolean(queryTab);
    fetchJobData();
  }, [id, queryTab]);

  // Status transitions
  const handleStartDiagnosis = async () => {
    try {
      const updated = await jobService.startDiagnosis(job.id);
      setJob((prev) => ({ ...prev, ...updated }));
      setActiveTab('diagnosis');
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
    if (isFreeWarranty) {
      toast.info('This job is covered under warranty for the same issue. Repair rework is 100% free with no estimate or approval needed.');
      return;
    }
    if (job?.estimate) {
      setEstimateForm({
        labor_charge: job.estimate.labor_charge || 0,
        discount_type: job.estimate.discount_type || 'AMOUNT',
        discount_value: job.estimate.discount_value !== undefined ? job.estimate.discount_value : (job.estimate.discount || 0),
        discount: job.estimate.discount || 0,
        apply_tax: Number(job.estimate.tax_rate || 0) > 0,
        tax_rate: job.estimate.tax_rate || 18,
        notes: job.estimate.notes || '',
        items: job.estimate.items && job.estimate.items.length > 0
          ? job.estimate.items.map(it => ({
            part_id: it.part_id || null,
            item_name: it.item_name || '',
            warranty: it.warranty || '',
            quantity: it.quantity || 1,
            unit_price: it.unit_price || '',
            discount: it.discount || 0,
          }))
          : [{ item_name: '', warranty: '90 Days', quantity: 1, unit_price: '', discount: 0 }],
      });
    } else {
      setEstimateForm((prev) => ({
        ...prev,
        items: prev.items && prev.items.length > 0
          ? prev.items.map(it => ({ ...it, warranty: it.warranty || '' }))
          : [{ item_name: '', warranty: '90 Days', quantity: 1, unit_price: '', discount: 0 }],
      }));
    }
    setIsEstimateModalOpen(true);
  };

  const handleAddEstimateItem = () => {
    setEstimateForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { item_name: '', warranty: '90 Days', quantity: 1, unit_price: '', discount: 0 },
      ],
    }));
  };

  const handleRemoveEstimateItem = (index) => {
    setEstimateForm((prev) => {
      const items = [...(prev.items || [])];
      items.splice(index, 1);
      return {
        ...prev,
        items: items.length > 0 ? items : [{ item_name: '', warranty: '90 Days', quantity: 1, unit_price: '', discount: 0 }],
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

  const computeEffectiveDiscount = (type, value, baseTotal) => {
    const num = Math.max(0, parseFloat(value) || 0);
    if (type === 'PERCENTAGE') {
      const pct = Math.min(100, num);
      return Math.round(((baseTotal * pct) / 100) * 100) / 100;
    }
    return Math.min(baseTotal, num);
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
          warranty: i.warranty?.trim() || '',
          quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
          unit_price: Math.max(0, parseFloat(i.unit_price) || 0),
          discount: Math.max(0, parseFloat(i.discount) || 0),
        }));

      const partsTotal = validItems.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0);
      const laborTotal = Math.max(0, parseFloat(estimateForm.labor_charge) || 0);
      const effectiveDiscount = computeEffectiveDiscount(
        estimateForm.discount_type,
        estimateForm.discount_value,
        partsTotal + laborTotal
      );

      const effectiveTaxRate = estimateForm.apply_tax
        ? Math.max(0, parseFloat(estimateForm.tax_rate) || 0)
        : 0;

      const res = await jobService.saveEstimate(job.id, {
        labor_charge: laborTotal,
        discount: effectiveDiscount,
        discount_type: estimateForm.discount_type,
        discount_value: parseFloat(estimateForm.discount_value) || 0,
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

  const handleChangeStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) {
      toast.error('Please select a target status');
      return;
    }
    if (selectedStatus === job.status) {
      toast.error(`The job is already in "${selectedStatus}" status`);
      return;
    }
    try {
      setIsSaving(true);
      const res = await jobService.updateJobStatus(job.id, {
        status: selectedStatus,
        notes: statusNotes.trim(),
        send_notification: sendStatusNotification,
      });
      setJob(res.job);
      toast.success(res.message || `Job status updated to ${selectedStatus}!`);
      setIsChangeStatusModalOpen(false);

      setActiveTab(getDefaultTabForStatus(selectedStatus));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update job status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenReopenModal = () => {
    if (job?.approval_status === 'REJECTED') {
      setReopenForm({
        reason: 'Customer requested revised estimate / re-quoting',
        target_status: 'ESTIMATE_SENT',
        notes: '',
        claim_type: 'NEW_ISSUE',
      });
    } else {
      setReopenForm({
        reason: '',
        target_status: 'DIAGNOSING',
        notes: '',
        claim_type: 'SAME_ISSUE',
      });
    }
    setIsReopenModalOpen(true);
  };

  const handleReopenJob = async (e) => {
    e.preventDefault();
    if (!reopenForm.reason.trim()) {
      toast.error('Please specify the reason for reopening.');
      return;
    }
    try {
      setIsSaving(true);
      const isRejectedFlow = job?.approval_status === 'REJECTED';
      const targetStatus = reopenForm.target_status || (isRejectedFlow ? 'ESTIMATE_SENT' : 'DIAGNOSING');
      const res = await jobService.reopenJob(job.id, {
        reason: reopenForm.reason.trim(),
        target_status: targetStatus,
        notes: reopenForm.notes.trim(),
        claim_type: isRejectedFlow ? 'NEW_ISSUE' : (reopenForm.claim_type || 'SAME_ISSUE'),
      });
      setJob(res.job);
      toast.success(res.message || 'Job successfully reopened!');
      setIsReopenModalOpen(false);
      setReopenForm({
        reason: '',
        target_status: 'DIAGNOSING',
        notes: '',
        claim_type: 'SAME_ISSUE',
      });
      if (isRejectedFlow || targetStatus === 'ESTIMATE_SENT') {
        setActiveTab('estimate');
      } else if (targetStatus === 'DIAGNOSING') {
        setActiveTab('diagnosis');
      } else if (targetStatus === 'TESTING') {
        setActiveTab('testing');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reopen job');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthorizeWarrantyRework = async () => {
    try {
      setIsSaving(true);
      const res = await jobService.authorizeWarrantyRework(job.id, {
        is_same_issue: true,
        notes: 'Pre-approved free rework for same issue under warranty',
      });
      setJob(res.data?.job || res.job);
      toast.success('Authorized as Free Warranty Rework! Customer approval and payment set to ₹0.');
      fetchJobData();
    } catch (err) {
      toast.error(err.message || 'Failed to authorize warranty rework');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendInvoice = async () => {
    try {
      setIsSendingInvoice(true);
      await invoiceService.resendInvoice(job.id, ['EMAIL', 'WHATSAPP', 'SMS']);
      toast.success('Tax Invoice & Delivery Receipt sent to customer via WhatsApp and Email!');
      fetchJobData();
    } catch (err) {
      toast.error(err.message || 'Failed to send invoice');
    } finally {
      setIsSendingInvoice(false);
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
          setActiveTab('estimate');
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
        await jobService.saveTests(job.id, allPass).catch(() => { });
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
      toast.success(
        isEstimateRejected
          ? 'Device returned to customer in original condition!'
          : 'Device delivered & final invoice sent to customer!'
      );
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
      toast.success(`Payment of ${currSym}${paymentForm.amount} recorded successfully.`);
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

  const handleOpenDiscountModal = () => {
    const existingType = job?.discount_type || job?.estimate?.discount_type || 'AMOUNT';
    const existingVal = job?.discount_value !== undefined
      ? job.discount_value
      : (job?.estimate?.discount_value !== undefined ? job.estimate.discount_value : (job?.discount || ''));

    setDiscountModalForm({
      discount_type: existingType,
      discount_value: existingVal !== 0 ? existingVal : '',
      notes: '',
    });
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscountSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await jobService.applyDiscount(job.id, {
        discount_type: discountModalForm.discount_type,
        discount_value: parseFloat(discountModalForm.discount_value) || 0,
        notes: discountModalForm.notes.trim(),
      });
      if (res.data?.job) {
        setJob((prev) => ({ ...prev, ...res.data.job }));
      }
      toast.success(res.message || 'Discount applied successfully!');
      setIsDiscountModalOpen(false);
      fetchJobData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to apply discount');
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
    return <DetailSkeleton />;
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
            className="p-2 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] rounded-xl transition-all border border-[var(--spatial-border)] active:scale-95"
            title="Back to repair jobs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight">
                {job.job_number}
              </h2>
              <Badge status={job.status} />
              {job.is_warranty_claim && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Warranty Claim #{job.reopen_count || 1}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                job.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                job.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                'bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)] border border-[var(--spatial-border)]'
              }`}>
                {job.priority} Priority
              </span>
            </div>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
              Intake Date: {new Date(job.created_at).toLocaleString()} • Technician: {job.technician?.full_name || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {['admin', 'staff'].includes(user?.role_id) && (
            <Button
              variant="outline"
              size="sm"
              icon={SlidersHorizontal}
              className="bg-blue-500/10 border-[#0071e3]/30 text-[#0071e3] dark:text-[#0a84ff] hover:bg-blue-500/20 font-semibold transition-all active:scale-95"
              onClick={() => {
                setSelectedStatus(job.status);
                setStatusNotes('');
                setSendStatusNotification(true);
                setIsChangeStatusModalOpen(true);
              }}
            >
              Change Status
            </Button>
          )}

          {['DELIVERED', 'CANCELLED', 'REJECTED'].includes(job.status) && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold"
              icon={RotateCcw}
              onClick={handleOpenReopenModal}
            >
              Reopen Job {job.status === 'DELIVERED' && job.approval_status !== 'REJECTED' ? '(Warranty)' : ''}
            </Button>
          )}

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

          <Button
            variant="outline"
            size="sm"
            icon={Send}
            onClick={handleResendInvoice}
            loading={isSendingInvoice}
            className="text-[#0071e3] dark:text-[#0a84ff] border-blue-500/30 hover:bg-blue-500/10 font-medium"
            title="Dispatch Tax Invoice & Receipt to Customer via WhatsApp & Email"
          >
            Send Invoice
          </Button>

          {job.approval_token && !isFreeWarranty && (
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
              className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              icon={Ban}
              onClick={handleCancelJob}
            >
              Cancel
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 font-semibold transition-all active:scale-95"
            icon={Trash2}
            onClick={handleDeleteJob}
            title="Permanently Delete Job Sheet"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Warranty Claim Banner if active */}
      {job.is_warranty_claim && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 text-xs ${isFreeWarranty
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-950 dark:text-emerald-200'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-200'
          }`}>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${isFreeWarranty ? 'text-emerald-500' : 'text-amber-500'
              }`} />
            <div>
              <p className="font-semibold flex items-center gap-2 flex-wrap">
                <span>Active Warranty Claim #{job.reopen_count || 1}</span>
                {isFreeWarranty ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    ✓ Same Issue • 100% Free Rework (₹0 Balance Due)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    New Issue • Chargeable Parts
                  </span>
                )}
              </p>
              <p className="opacity-90 mt-0.5">{job.last_warranty_issue || 'Customer reported issue within warranty period.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isFreeWarranty && (job.approval_status === 'PENDING' || job.balance_due > 0) && (
              <Button
                size="sm"
                variant="outline"
                icon={ShieldCheck}
                onClick={handleAuthorizeWarrantyRework}
                loading={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none font-semibold text-xs shadow-xs"
              >
                Mark Same Issue (Free Rework)
              </Button>
            )}
            {job.reopened_at && (
              <span className="text-[11px] tabular-nums opacity-80 whitespace-nowrap">
                Reopened: {new Date(job.reopened_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

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
        onReopenJob={handleOpenReopenModal}
        onChangeStatus={() => {
          setSelectedStatus(job.status);
          setStatusNotes('');
          setSendStatusNotification(true);
          setIsChangeStatusModalOpen(true);
        }}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-2xl overflow-x-auto no-scrollbar">
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
            onClick={() => {
              tabManuallySelectedRef.current = true;
              setActiveTab(tab.key);
            }}
            className={`px-3.5 py-1.5 text-xs rounded-xl whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 ${
              activeTab === tab.key
                ? 'bg-[var(--spatial-bg-card)] text-[var(--spatial-text-title)] shadow-xs font-semibold border border-[var(--spatial-border)]'
                : 'border border-transparent text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card)]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div key="overview" className="spatial-tab-pane space-y-6">
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
                        className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${isPositive
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
        <div key="diagnosis" className="spatial-tab-pane">
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
        </div>
      )}

      {/* TAB 3: ESTIMATE */}
      {activeTab === 'estimate' && (
        <div key="estimate" className="spatial-tab-pane">
          <Card
          title="Repair Estimate & Parts Quotation"
          subtitle="Includes labor charge, replacement parts, tax, and customer authorization status"
          action={
            ['admin', 'technician'].includes(user?.role_id) && !isFreeWarranty && (
              <Button size="sm" onClick={handleOpenEstimateModal}>
                {job.estimate ? 'Update Estimate' : 'Create Estimate'}
              </Button>
            )
          }
        >
          {job.estimate ? (
            <div className="space-y-6 text-xs">
              {isFreeWarranty && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                        100% Free Warranty Claim (Same Issue Rework)
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        No additional parts or labor billed. No customer estimate or approval is required. Pre-authorized at ₹0.00.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700">
                    ₹0.00 Due
                  </span>
                </div>
              )}
              {/* Approval status banner */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Customer Authorization:</span>
                  {isFreeWarranty ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Pre-Authorized (Warranty Covered — Free Rework)
                    </span>
                  ) : (
                    <>
                      <Badge status={job.approval_status} />
                      {job.approval_decision_at && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          ({new Date(job.approval_decision_at).toLocaleString()})
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {job.is_warranty_claim && !isFreeWarranty && (
                    <Button
                      size="sm"
                      icon={ShieldCheck}
                      onClick={handleAuthorizeWarrantyRework}
                      loading={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      Authorize Free Warranty Rework (Same Issue)
                    </Button>
                  )}
                  {!isFreeWarranty && (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto table-scrollbar border border-slate-200 rounded-xl pb-1">
                <table className="w-full text-left text-xs min-w-[650px] whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-2.5 whitespace-nowrap">Item Description</th>
                      <th className="px-4 py-2.5 text-center whitespace-nowrap">Warranty</th>
                      <th className="px-4 py-2.5 text-center whitespace-nowrap">Quantity</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Unit Price</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Discount</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Number(job.estimate.labor_charge) > 0 && (
                      <tr className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          Diagnostic Bench Labor & Technical Service Fee
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-400 text-[11px]">—</td>
                        <td className="px-4 py-2.5 text-center">1</td>
                        <td className="px-4 py-2.5 text-right font-mono">{currSym}{Number(job.estimate.labor_charge).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{currSym}0.00</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {isFreeWarranty ? `${currSym}0.00 (Warranty)` : `${currSym}${Number(job.estimate.labor_charge).toFixed(2)}`}
                        </td>
                      </tr>
                    )}
                    {(job.estimate.items || []).map((item, index) => (
                      <tr key={index} className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {item.item_name}
                          {isFreeWarranty && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                              Warranty
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {item.warranty ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              {item.warranty}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{currSym}{Number(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-600">
                          {item.discount > 0 ? `-${currSym}${Number(item.discount).toFixed(2)}` : `${currSym}0.00`}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {isFreeWarranty ? `${currSym}0.00 (Free)` : `${currSym}${Number(item.total_price).toFixed(2)}`}
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
                      <span>
                        Discount
                        {job.estimate.discount_type === 'PERCENTAGE' && job.estimate.discount_value
                          ? ` (${job.estimate.discount_value}%)`
                          : ''}:
                      </span>
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
                  {isFreeWarranty ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 mt-2">
                      <div className="flex justify-between font-bold text-emerald-800 text-xs">
                        <span>Covered Under Warranty:</span>
                        <span>100% Free Rework</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Original Order Total:</span>
                        <span className="font-mono line-through">{currSym}{Number(job.previous_total_amount || job.estimate.total_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-emerald-200">
                        <span>Current Due:</span>
                        <span className="font-mono text-emerald-600">{currSym}0.00</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Estimated Total:</span>
                      <span className="font-mono">{currSym}{Number(job.estimate.total_amount).toFixed(2)}</span>
                    </div>
                  )}
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
        </div>
      )}

      {/* TAB 4: QUALITY CHECK TESTING */}
      {activeTab === 'testing' && (
        <div key="testing" className="spatial-tab-pane">
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
        </div>
      )}

      {/* TAB 5: PAYMENTS & INVOICE */}
      {activeTab === 'payments' && (
        <div key="payments" className="spatial-tab-pane space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Cost</p>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                {isFreeWarranty ? `${currSym}0.00` : `${currSym}${Number(job.total_amount).toFixed(2)}`}
              </p>
              {isFreeWarranty ? (
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Covered Under Warranty (₹0.00)</span>
              ) : Number(job.discount || 0) > 0 ? (
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                  <Tag className="w-3 h-3 shrink-0" />
                  Discount: -{currSym}{Number(job.discount).toFixed(2)} ({job.discount_type === 'PERCENTAGE' ? `${job.discount_value}%` : `${currSym}${Number(job.discount_value).toFixed(2)}`})
                </span>
              ) : null}
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Amount Paid</p>
              <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{currSym}{Number(job.paid_amount || 0).toFixed(2)}</p>
              {isFreeWarranty && (
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Original invoice settled</span>
              )}
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Remaining Balance</p>
              <p className={`text-2xl font-black font-mono mt-1 ${!isFreeWarranty && !isEstimateRejected && job.balance_due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {isFreeWarranty || isEstimateRejected ? `${currSym}0.00` : `${currSym}${Number(job.balance_due || 0).toFixed(2)}`}
              </p>
              {isFreeWarranty && (
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">No balance due</span>
              )}
              {isEstimateRejected && (
                <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">Estimate declined — {currSym}0.00 due</span>
              )}
            </div>
          </div>

          <Card
            title={`Payment Ledger (${job.payments?.length || 0})`}
            subtitle="Record transactions via Cash, Card, UPI, or Bank Transfer"
            action={
              <div className="flex items-center gap-2">
                {!isFreeWarranty && !isEstimateRejected && ['admin', 'staff'].includes(user?.role_id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Tag}
                    onClick={handleOpenDiscountModal}
                    className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
                    title="Apply or edit flat/percentage discount"
                  >
                    {Number(job.discount || 0) > 0 ? 'Edit Discount' : 'Add Discount'}
                  </Button>
                )}
                {!isEstimateRejected && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Send}
                    onClick={handleResendInvoice}
                    loading={isSendingInvoice}
                    title="Send Tax Invoice & Receipt to Customer via WhatsApp and Email"
                  >
                    Send Invoice
                  </Button>
                )}
                {!isFreeWarranty && !isEstimateRejected && job.balance_due > 0 && ['admin', 'staff'].includes(user?.role_id) && (
                  <Button size="sm" icon={CreditCard} onClick={() => setIsPaymentModalOpen(true)}>
                    Record Payment
                  </Button>
                )}
              </div>
            }
            bodyClassName="p-0"
          >
            {job.payments && job.payments.length > 0 ? (
              <div className="overflow-x-auto table-scrollbar w-full pb-1">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Receipt / Ref</th>
                      <th className="px-5 py-3 whitespace-nowrap">Payment Method</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Amount</th>
                      <th className="px-5 py-3 whitespace-nowrap">Paid Date</th>
                      <th className="px-5 py-3 whitespace-nowrap">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {job.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[var(--spatial-table-row-hover)] transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-[var(--spatial-text-title)]">{p.payment_number}</td>
                        <td className="px-5 py-3.5 font-semibold text-[var(--spatial-text-title)]">{p.payment_method}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-500">
                          {currSym}{Number(p.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] font-mono">
                          {new Date(p.paid_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-body)]">{p.notes || '—'}</td>
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
        <div key="timeline" className="spatial-tab-pane">
          <Card title="Job Status Activity & Audit Trail" subtitle="Chronological history of all technician actions and state changes">
            <JobTimeline history={job.history || []} />
          </Card>
        </div>
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
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveEstimate} className="space-y-5">
          {/* Discount Card with Radio Option (Fixed Amount vs Percentage) */}
          <div className="p-4 bg-[var(--spatial-bg-card-subtle)] rounded-xl border border-[var(--spatial-border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
                Discount Mode
              </label>
              {/* Radio options: Amount vs Percentage */}
              <div className="inline-flex items-center gap-4 bg-[var(--spatial-input-bg)] px-3 py-1.5 rounded-lg border border-[var(--spatial-border)] text-xs font-semibold">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--spatial-text-body)] hover:text-sky-500 transition-colors">
                  <input
                    type="radio"
                    name="discount_mode"
                    value="AMOUNT"
                    checked={estimateForm.discount_type === 'AMOUNT'}
                    onChange={() => setEstimateForm((prev) => ({ ...prev, discount_type: 'AMOUNT' }))}
                    className="w-4 h-4 text-sky-500 border-[var(--spatial-border)] focus:ring-sky-500 cursor-pointer"
                  />
                  <span>Amount ({currSym})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--spatial-text-body)] hover:text-sky-500 transition-colors">
                  <input
                    type="radio"
                    name="discount_mode"
                    value="PERCENTAGE"
                    checked={estimateForm.discount_type === 'PERCENTAGE'}
                    onChange={() => setEstimateForm((prev) => ({ ...prev, discount_type: 'PERCENTAGE' }))}
                    className="w-4 h-4 text-sky-500 border-[var(--spatial-border)] focus:ring-sky-500 cursor-pointer"
                  />
                  <span>Percentage (%)</span>
                </label>
              </div>
            </div>

            <div className="max-w-md">
              <div className="relative">
                {estimateForm.discount_type === 'AMOUNT' ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)] font-mono text-sm">
                    {currSym}
                  </span>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)] font-mono text-sm font-bold">
                    %
                  </span>
                )}
                <input
                  type="number"
                  step={estimateForm.discount_type === 'PERCENTAGE' ? '0.1' : '0.01'}
                  min="0"
                  max={estimateForm.discount_type === 'PERCENTAGE' ? '100' : undefined}
                  placeholder={estimateForm.discount_type === 'PERCENTAGE' ? 'e.g. 10 (%)' : '0.00'}
                  value={estimateForm.discount_value}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    setEstimateForm((prev) => ({
                      ...prev,
                      discount_value: rawVal,
                    }));
                  }}
                  className={`w-full py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-lg text-sm font-mono text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none ${estimateForm.discount_type === 'AMOUNT' ? 'pl-7 pr-3' : 'pl-3 pr-8'
                    }`}
                />
              </div>

              {/* Informative helper text with live calculation preview */}
              <div className="flex items-center justify-between text-[11px] text-[var(--spatial-text-muted)] mt-1.5">
                <span>
                  {estimateForm.discount_type === 'PERCENTAGE'
                    ? 'Promotional or loyalty percentage discount'
                    : 'Fixed currency discount deduction'}
                </span>
                {estimateForm.discount_type === 'PERCENTAGE' && parseFloat(estimateForm.discount_value) > 0 && (() => {
                  const partsTotal = (estimateForm.items || []).reduce((acc, item) => {
                    const q = Math.max(1, parseInt(item.quantity, 10) || 1);
                    const p = Math.max(0, parseFloat(item.unit_price) || 0);
                    return acc + (q * p);
                  }, 0);
                  const labor = Math.max(0, parseFloat(estimateForm.labor_charge) || 0);
                  const previewDisc = computeEffectiveDiscount(
                    'PERCENTAGE',
                    estimateForm.discount_value,
                    partsTotal + labor
                  );
                  return (
                    <span className="font-semibold text-emerald-500 font-mono">
                      = -{currSym}{previewDisc.toFixed(2)} off
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* GST / Tax Toggle & Rate Control */}
          <div className="p-4 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-xl space-y-3">
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
                  <div className="w-11 h-6 bg-[var(--spatial-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <div>
                  <span className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wide block">
                    {estimateForm.apply_tax ? 'GST / Tax is Applied (ON)' : 'GST / Tax is Disabled (OFF)'}
                  </span>
                  <p className="text-[11px] text-[var(--spatial-text-muted)]">
                    {estimateForm.apply_tax
                      ? 'Tax will be computed and itemized on the quotation and final invoice'
                      : 'Tax exempt / Nil. Customer will only pay subtotal without additional GST'}
                  </p>
                </div>
              </div>

              {estimateForm.apply_tax && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-lg px-3 py-1.5 shadow-2xs">
                    <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">GST Rate:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={estimateForm.tax_rate}
                      onChange={(e) => setEstimateForm({ ...estimateForm, tax_rate: e.target.value })}
                      className="w-12 text-xs font-mono font-bold text-[var(--spatial-text-title)] bg-transparent focus:outline-none text-right"
                    />
                    <span className="text-xs font-bold text-[var(--spatial-text-title)]">%</span>
                  </div>
                </div>
              )}
            </div>

            {estimateForm.apply_tax && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--spatial-border)]">
                <span className="text-[10px] text-[var(--spatial-text-muted)] font-semibold uppercase">Presets:</span>
                {[5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setEstimateForm({ ...estimateForm, tax_rate: rate })}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${Number(estimateForm.tax_rate) === rate
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-hover)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)]'
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
                <label className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
                  Parts & Repair Details
                </label>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 rounded-full">
                  {(estimateForm.items || []).length} {(estimateForm.items || []).length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {availableParts.length > 0 && (
                <SpatialPartsPicker
                  parts={availableParts}
                  onSelect={(selected) => {
                    setEstimateForm((prev) => {
                      const items = [...(prev.items || [])];
                      const lastIdx = items.length - 1;
                      if (lastIdx >= 0 && !items[lastIdx].item_name && (!items[lastIdx].unit_price || items[lastIdx].unit_price === '')) {
                        items[lastIdx] = {
                          part_id: selected.id,
                          item_name: selected.name,
                          warranty: '90 Days',
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
                              warranty: '90 Days',
                              quantity: 1,
                              unit_price: selected.selling_price,
                              discount: 0,
                            },
                          ],
                        };
                      }
                    });
                    toast.success(`Added "${selected.name}" from inventory!`);
                  }}
                  placeholder="+ From Inventory..."
                />
              )}
            </div>

            {/* Column Headers for larger screens */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1.5 bg-[var(--spatial-table-header-bg)] rounded-lg text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider border border-[var(--spatial-border)]">
              <div className="col-span-5">Part or Repair Description</div>
              <div className="col-span-3">Warranty</div>
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
                    className="p-3 sm:p-2.5 bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-hover)] border border-[var(--spatial-border)] rounded-xl transition-all shadow-sm"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Part or Repair Details Input */}
                      <div className="sm:col-span-5">
                        <label className="block sm:hidden text-[11px] font-semibold text-[var(--spatial-text-muted)] mb-1">
                          Part / Repair Details
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Original Display Combo, Battery, IC..."
                          value={item.item_name || ''}
                          onChange={(e) => handleUpdateEstimateItem(idx, 'item_name', e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-lg text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none font-medium"
                          autoFocus={idx === (estimateForm.items.length - 1) && idx > 0}
                        />
                      </div>

                      {/* Warranty Period Input */}
                      <div className="sm:col-span-3">
                        <label className="block sm:hidden text-[11px] font-semibold text-[var(--spatial-text-muted)] mb-1">
                          Warranty Period
                        </label>
                        <SpatialWarrantyInput
                          value={item.warranty || ''}
                          onChange={(val) => handleUpdateEstimateItem(idx, 'warranty', val)}
                          placeholder="e.g. 30 Days, 90 Days..."
                          heightClass="h-9"
                          presets={[
                            'No Warranty',
                            '30 Days',
                            '40 Days',
                            '60 Days',
                            '90 Days',
                            '180 Days',
                            '1 Year',
                          ]}
                        />
                      </div>

                      {/* Price */}
                      <div className="sm:col-span-2">
                        <label className="block sm:hidden text-[11px] font-semibold text-[var(--spatial-text-muted)] mb-1">
                          Price ({currSym})
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)] text-xs font-mono">
                            {currSym}
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateEstimateItem(idx, 'unit_price', e.target.value)}
                            className="w-full pl-6 pr-2 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-lg text-xs font-mono text-right text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Total & Remove */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-1.5">
                        <div className="sm:hidden">
                          <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)] block">Total</span>
                          <span className="font-mono text-xs font-bold text-[var(--spatial-text-title)]">
                            {currSym}{lineTotal.toFixed(2)}
                          </span>
                        </div>

                        <span className="hidden sm:inline font-mono text-xs font-bold text-[var(--spatial-text-title)] min-w-[65px] text-right">
                          {currSym}{lineTotal.toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveEstimateItem(idx)}
                          title="Remove this item"
                          className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* + Add Another Part or Repair Detail Button */}
              <button
                type="button"
                onClick={handleAddEstimateItem}
                className="w-full py-2.5 px-3 bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-bg-card-hover)] text-sky-500 hover:text-sky-400 border-2 border-dashed border-sky-500/30 hover:border-sky-500/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm group"
              >
                <div className="w-5 h-5 rounded-full bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-500 flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>+ Add Another Part or Repair Detail</span>
              </button>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1">
              Estimate Notes & Terms (Optional)
            </label>
            <textarea
              rows="2"
              value={estimateForm.notes || ''}
              onChange={(e) => setEstimateForm({ ...estimateForm, notes: e.target.value })}
              placeholder="e.g. Quotation valid for 7 days. 90-day warranty on replaced parts."
              className="w-full px-3 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-1 focus:ring-sky-500 focus:outline-none"
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
            const baseSubtotal = partsTotal + labor;
            const discount = computeEffectiveDiscount(
              estimateForm.discount_type,
              estimateForm.discount_value,
              baseSubtotal
            );
            const subtotal = Math.max(0, baseSubtotal - discount);
            const taxRate = estimateForm.apply_tax ? Math.max(0, parseFloat(estimateForm.tax_rate) || 0) : 0;
            const taxAmount = (subtotal * taxRate) / 100;
            const grandTotal = subtotal + taxAmount;

            return (
              <div className="bg-[var(--spatial-bg-card)] text-[var(--spatial-text-title)] p-4 rounded-xl shadow-md border border-[var(--spatial-border)]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3 pb-3 border-b border-[var(--spatial-border)]">
                  <div>
                    <span className="text-[var(--spatial-text-muted)] block text-[11px]">Labor Charge</span>
                    <span className="font-mono text-sm font-semibold text-[var(--spatial-text-title)]">
                      {currSym}{labor.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--spatial-text-muted)] block text-[11px]">
                      Parts & Repairs ({(estimateForm.items || []).filter(i => i.item_name || i.unit_price).length})
                    </span>
                    <span className="font-mono text-sm font-semibold text-[var(--spatial-text-title)]">
                      {currSym}{partsTotal.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--spatial-text-muted)] block text-[11px]">
                      Discount {estimateForm.discount_type === 'PERCENTAGE' && parseFloat(estimateForm.discount_value) > 0 ? `(${estimateForm.discount_value}%)` : ''}
                    </span>
                    <span className="font-mono text-sm font-semibold text-emerald-500 dark:text-emerald-400">
                      {discount > 0 ? `-${currSym}${discount.toFixed(2)}` : `${currSym}0.00`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--spatial-text-muted)] block text-[11px]">
                      {taxRate > 0 ? `GST / Tax (${taxRate}%)` : 'GST / Tax'}
                    </span>
                    <span className="font-mono text-sm font-semibold text-[var(--spatial-text-title)]">
                      {taxRate > 0 ? `${currSym}${taxAmount.toFixed(2)}` : 'Nil (0%)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[var(--spatial-text-title)]">
                      Total Estimated Amount
                    </span>
                    <p className="text-[11px] text-[var(--spatial-text-muted)]">Total payable by customer upon repair approval</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-emerald-500 dark:text-emerald-400">
                      {currSym}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--spatial-border)]">
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
        subtitle={`Remaining Balance: ${currSym}${Number(job.balance_due || 0).toFixed(2)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Payment Amount ({currSym}) *
            </label>
            <input
              type="number"
              step="0.01"
              max={job.balance_due}
              required
              placeholder={String(job.balance_due)}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full px-3 py-2 spatial-input rounded-xl text-sm font-bold font-mono"
            />
            <button
              type="button"
              onClick={() => setPaymentForm({ ...paymentForm, amount: String(job.balance_due) })}
              className="text-[11px] text-primary-600 hover:underline font-medium mt-1 inline-block"
            >
              Pay Full Remaining Balance ({currSym}{Number(job.balance_due).toFixed(2)})
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Payment Method *
            </label>
            <SpatialSelect
              value={paymentForm.payment_method}
              onChange={(val) => setPaymentForm({ ...paymentForm, payment_method: val })}
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'CARD', label: 'Credit / Debit Card' },
                { value: 'UPI', label: 'UPI / Digital QR' },
                { value: 'BANK_TRANSFER', label: 'Bank Wire / Transfer' },
                { value: 'OTHER', label: 'Other Method' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Transaction Reference / Receipt ID
            </label>
            <input
              type="text"
              placeholder="e.g. TXN-89410 or Card Slip #481"
              value={paymentForm.transaction_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="Optional payment notes..."
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--spatial-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" icon={IndianRupee} loading={isSaving}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Customer Pickup & Handover Modal */}
      <Modal
        isOpen={isPickupModalOpen}
        onClose={() => setIsPickupModalOpen(false)}
        title={isEstimateRejected ? "Return Device to Customer (Unrepaired)" : "Customer Pickup & Delivery Confirmation"}
        subtitle={isEstimateRejected ? "Handover device in original intake condition after estimate decline" : "Customer inspection and device release protocol"}
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
              <span>
                {isEstimateRejected ? (
                  <>Customer inspected and verified device in shop: <strong>YES</strong></>
                ) : (
                  <>Customer physically tested device in shop: <strong>YES</strong></>
                )}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={pickupForm.customer_acceptance_confirmed}
                onChange={(e) => setPickupForm({ ...pickupForm, customer_acceptance_confirmed: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span>
                {isEstimateRejected ? (
                  <>Customer confirms: <em>"Device received back in original intake condition (Unrepaired)."</em></>
                ) : (
                  <>Customer confirms: <em>"Device received and working properly."</em></>
                )}
              </span>
            </label>
          </div>

          {isFreeWarranty ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Covered under Warranty — Free Rework ({currSym}0.00 Balance Due. No payment required).</span>
            </div>
          ) : isEstimateRejected ? null : job.balance_due > 0 ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Warning: Outstanding balance of {currSym}{Number(job.balance_due).toFixed(2)} must be collected before handover.</span>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Delivery Notes (Optional)
            </label>
            <input
              type="text"
              placeholder={isEstimateRejected ? "e.g. Handed over unrepaired as customer declined estimate." : "e.g. Handed over with charger and warranty receipt."}
              value={pickupForm.delivery_notes}
              onChange={(e) => setPickupForm({ ...pickupForm, delivery_notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200/80 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">
                {isEstimateRejected ? "Handover Return Notification" : "Automatic Invoice & Receipt Dispatch"}
              </span>
              <p className="text-[11px] text-sky-700 leading-normal">
                {isEstimateRejected
                  ? "Handover confirmation message will be sent to customer's WhatsApp & Email confirming device return in original condition."
                  : "Tax invoice and warranty certificate will be sent immediately to customer's WhatsApp & Email upon clicking delivery."}
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
              disabled={(!isFreeWarranty && !isEstimateRejected && job.balance_due > 0) || !pickupForm.customer_tested_device || !pickupForm.customer_acceptance_confirmed}
            >
              {isEstimateRejected
                ? 'Complete Return & Handover Device'
                : isFreeWarranty
                ? 'Complete Handover & Send Receipt'
                : 'Complete Delivery & Send Invoice'}
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

      {/* REOPEN JOB MODAL */}
      <Modal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        title={job.approval_status === 'REJECTED' ? 'Reopen Job Sheet (Revise Estimate)' : (job.status === 'DELIVERED' ? 'Reopen Job for Warranty Claim' : 'Reopen Repair Job')}
        subtitle={`Job #${job.job_number} • ${job.customer?.full_name || 'Customer'} • ${job.device?.brand || ''} ${job.device?.model || ''}`}
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReopenModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="reopen-job-form"
              size="sm"
              loading={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
              icon={RotateCcw}
            >
              {job.approval_status === 'REJECTED'
                ? 'Reopen & Go to Estimate Tab'
                : 'Reopen Job Sheet'}
            </Button>
          </div>
        }
      >
        <form id="reopen-job-form" onSubmit={handleReopenJob} className="space-y-4">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold">
                {job.approval_status === 'REJECTED'
                  ? 'Reopening Estimate-Declined Job'
                  : job.status === 'DELIVERED'
                  ? 'Customer Returning Within Warranty Period'
                  : 'Reactivating Closed/Cancelled Repair Job'}
              </p>
              <p className="mt-0.5 opacity-90">
                {job.approval_status === 'REJECTED'
                  ? 'Reopening moves the job sheet back to the quotation stage so you can update parts, modify prices or discounts, and send a revised estimate to the customer.'
                  : job.status === 'DELIVERED'
                  ? 'Reopening moves the device back to the active repair pipeline so technicians can re-inspect the hardware, resolve the issue, and conduct QC tests.'
                  : 'Reopening restores this job sheet so diagnosis and repair can proceed.'}
              </p>
            </div>
          </div>

          {job.status === 'DELIVERED' && job.approval_status !== 'REJECTED' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Warranty Claim Coverage Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setReopenForm((prev) => ({ ...prev, claim_type: 'SAME_ISSUE' }))}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition-all ${reopenForm.claim_type === 'SAME_ISSUE'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <input
                      type="radio"
                      name="claim_type"
                      checked={reopenForm.claim_type === 'SAME_ISSUE'}
                      onChange={() => setReopenForm((prev) => ({ ...prev, claim_type: 'SAME_ISSUE' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Same Issue (Free Warranty Rework)</span>
                  </div>
                  <p className="text-[11px] opacity-80 pl-5 space-y-0.5">
                    <span className="block">✓ No approval required from customer</span>
                    <span className="block">✓ ₹0.00 cost / No payment needed</span>
                    <span className="block">✓ Handover once QC test passes</span>
                  </p>
                </label>

                <label
                  onClick={() => setReopenForm((prev) => ({ ...prev, claim_type: 'NEW_ISSUE' }))}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition-all ${reopenForm.claim_type === 'NEW_ISSUE'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <input
                      type="radio"
                      name="claim_type"
                      checked={reopenForm.claim_type === 'NEW_ISSUE'}
                      onChange={() => setReopenForm((prev) => ({ ...prev, claim_type: 'NEW_ISSUE' }))}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>New Issue / Different Parts</span>
                  </div>
                  <p className="text-[11px] opacity-80 pl-5 space-y-0.5">
                    <span className="block">• Additional/new parts replacement</span>
                    <span className="block">• Chargeable repair quote prepared</span>
                    <span className="block">• Requires customer approval & payment</span>
                  </p>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {job.approval_status === 'REJECTED' ? 'Reason for Reopening / Customer Notes' : 'Customer Complaint / Warranty Issue'} <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reopenForm.reason}
              onChange={(e) => setReopenForm({ ...reopenForm, reason: e.target.value })}
              placeholder={job.approval_status === 'REJECTED' ? 'e.g. Customer requested revised quote or agreed to alternative parts...' : 'Describe the issue reported by customer under warranty (e.g. Screen touch unresponsive on upper right after 5 days of delivery, battery draining quickly, etc.)...'}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1.5">
                Target Workbench Stage
              </label>
              <SpatialSelect
                value={reopenForm.target_status}
                onChange={(val) => setReopenForm({ ...reopenForm, target_status: val })}
                options={
                  job.approval_status === 'REJECTED'
                    ? [
                        { value: 'ESTIMATE_SENT', label: 'Estimate Stage (Revise & Send Quotation)' },
                        { value: 'DIAGNOSING', label: 'Diagnosing (Inspection Bench)' },
                        { value: 'IN_PROGRESS', label: 'In Progress (Hardware Workbench)' },
                      ]
                    : [
                        { value: 'DIAGNOSING', label: 'Diagnosing (Inspection Bench)' },
                        { value: 'IN_PROGRESS', label: 'In Progress (Hardware Workbench)' },
                        { value: 'TESTING', label: 'Testing (Quality Check Bench)' },
                        { value: 'RECEIVED', label: 'Received (Intake Awaiting)' },
                      ]
                }
              />
            </div>

            {job.approval_status !== 'REJECTED' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Warranty Claim Tag
                </label>
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Claim #{(job.reopen_count || 0) + 1}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Internal Staff / Tech Notes (Optional)
            </label>
            <input
              type="text"
              value={reopenForm.notes}
              onChange={(e) => setReopenForm({ ...reopenForm, notes: e.target.value })}
              placeholder="e.g. Free warranty rework authorized by shop manager..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* CHANGE JOB STATUS (SHOP OWNER OVERRIDE) MODAL */}
      <Modal
        isOpen={isChangeStatusModalOpen}
        onClose={() => setIsChangeStatusModalOpen(false)}
        title="Change Job Status (Shop Owner Override)"
        subtitle={`Job #${job.job_number} • Current Status: ${job.status}`}
        maxWidth="max-w-3xl"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">Target:</span>
              <Badge status={selectedStatus || job.status} size="sm" />
              {selectedStatus === job.status && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">
                  (Current Status)
                </span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsChangeStatusModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="change-status-form"
                size="sm"
                loading={isSaving}
                icon={Check}
                disabled={!selectedStatus || selectedStatus === job.status}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-sm"
              >
                Update Status to {selectedStatus}
              </Button>
            </div>
          </div>
        }
      >
        <form id="change-status-form" onSubmit={handleChangeStatusSubmit} className="space-y-3">
          <div className="py-2 px-3 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <div className="text-xs text-sky-900 dark:text-sky-200 min-w-0">
              <span className="font-bold mr-1">Shop Owner Control:</span>
              <span className="opacity-90">Manually advance or rollback this job to any stage. Updates are logged to audit trail.</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Target Status <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                10 stages available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.key;
                const isCurrent = job.status === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedStatus(opt.key)}
                    className={`py-2 px-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer group ${isSelected
                        ? 'border-apple-blue bg-apple-blue/10 ring-2 ring-apple-blue/30 shadow-xs'
                        : 'border-[var(--spatial-border)] bg-[var(--spatial-bg-card)] hover:border-[var(--spatial-border-hover)] hover:bg-[var(--spatial-bg-card-hover)]'
                      }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge status={opt.key} size="sm" />
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-1">
                        {opt.desc}
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all ${isSelected
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-transparent group-hover:border-slate-400'
                      }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Reason / Remarks for Status Change (Optional)
            </label>
            <textarea
              rows={2}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="e.g. Customer verbally authorized estimate over phone, fast-tracked by owner, waiting for special parts..."
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={sendStatusNotification}
                onChange={(e) => setSendStatusNotification(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
              />
              <span>Send notification update to customer (Email / WhatsApp / SMS)</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* APPLY DISCOUNT MODAL */}
      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title={Number(job.discount || 0) > 0 ? "Edit Job Discount" : "Add Discount"}
        subtitle={`Job #${job.job_number} • Current Total: ${currSym}${Number(job.total_amount).toFixed(2)}`}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDiscountModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="discount-form"
              size="sm"
              loading={isSaving}
              icon={Tag}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            >
              Apply Discount
            </Button>
          </div>
        }
      >
        {(() => {
          const baseSubtotal = (job?.estimate?.parts_subtotal || 0) + (job?.estimate?.labor_charge || 0) > 0
            ? ((job.estimate.parts_subtotal || 0) + (job.estimate.labor_charge || 0))
            : (job?.subtotal > 0 ? job.subtotal : Math.max(0, (job?.total_amount || 0) + (job?.discount || 0)));

          const discountVal = parseFloat(discountModalForm.discount_value) || 0;
          const isPercent = discountModalForm.discount_type === 'PERCENTAGE';
          const calculatedDiscount = isPercent
            ? parseFloat(((baseSubtotal * Math.min(100, discountVal)) / 100).toFixed(2))
            : Math.min(baseSubtotal, discountVal);

          const subtotalAfterDisc = Math.max(0, baseSubtotal - calculatedDiscount);
          const taxRate = job?.tax_rate !== undefined ? job.tax_rate : (job?.estimate?.tax_rate || 0);
          const calculatedTax = parseFloat(((subtotalAfterDisc * taxRate) / 100).toFixed(2));
          const calculatedTotal = parseFloat((subtotalAfterDisc + calculatedTax).toFixed(2));
          const calculatedRemaining = Math.max(0, parseFloat((calculatedTotal - (job?.paid_amount || 0)).toFixed(2)));

          return (
            <form id="discount-form" onSubmit={handleApplyDiscountSubmit} className="space-y-4">
              {/* Radio options: Amount vs Percentage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Discount Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${discountModalForm.discount_type === 'AMOUNT'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : 'border-[var(--spatial-border)] bg-[var(--spatial-bg-card)] hover:border-[var(--spatial-border-hover)] hover:bg-[var(--spatial-bg-card-hover)]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="discount_type"
                      value="AMOUNT"
                      checked={discountModalForm.discount_type === 'AMOUNT'}
                      onChange={() => setDiscountModalForm({ ...discountModalForm, discount_type: 'AMOUNT' })}
                      className="w-4 h-4 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-[var(--spatial-text-title)]">
                        Amount ({currSym})
                      </span>
                      <span className="block text-[11px] text-[var(--spatial-text-muted)]">
                        Fixed rupee discount
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${discountModalForm.discount_type === 'PERCENTAGE'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : 'border-[var(--spatial-border)] bg-[var(--spatial-bg-card)] hover:border-[var(--spatial-border-hover)] hover:bg-[var(--spatial-bg-card-hover)]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="discount_type"
                      value="PERCENTAGE"
                      checked={discountModalForm.discount_type === 'PERCENTAGE'}
                      onChange={() => setDiscountModalForm({ ...discountModalForm, discount_type: 'PERCENTAGE' })}
                      className="w-4 h-4 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                        Percentage (%)
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        % of repair subtotal
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Discount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Discount Value {discountModalForm.discount_type === 'PERCENTAGE' ? '(%)' : `(${currSym})`} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    {discountModalForm.discount_type === 'PERCENTAGE' ? '%' : currSym}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={discountModalForm.discount_type === 'PERCENTAGE' ? '100' : baseSubtotal}
                    required
                    value={discountModalForm.discount_value}
                    onChange={(e) => setDiscountModalForm({ ...discountModalForm, discount_value: e.target.value })}
                    placeholder={discountModalForm.discount_type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 250'}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Discount Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={discountModalForm.notes}
                  onChange={(e) => setDiscountModalForm({ ...discountModalForm, notes: e.target.value })}
                  placeholder="e.g. Repeat customer courtesy, festive promotion..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Live Calculation Preview Box */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Base Subtotal:</span>
                  <span className="font-mono font-medium">{currSym}{baseSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-{currSym}{calculatedDiscount.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-mono font-medium">+{currSym}{calculatedTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between text-slate-900 dark:text-slate-100 font-bold">
                  <span>New Grand Total:</span>
                  <span className="font-mono text-sm">{currSym}{calculatedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Already Paid:</span>
                  <span className="font-mono">{currSym}{Number(job.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                  <span>New Balance Due:</span>
                  <span className="font-mono text-sm">{currSym}{calculatedRemaining.toFixed(2)}</span>
                </div>
              </div>
            </form>
          );
        })()}
      </Modal>
    </div>
  );
};
