import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wrench,
  Search,
  Filter,
  Plus,
  Eye,
  Calendar,
  Phone,
  Smartphone,
  ArrowUpDown,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Clock,
  X,
  Send,
  PhoneForwarded,
  MessageSquare,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { jobService } from '../../services/jobService';
import { invoiceService } from '../../services/invoiceService';
import { Card, LoadingSpinner, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { BulkActionBar } from '../../components/common/BulkActionBar';
import { SpatialSelect } from '../../components/common/SpatialSelect';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Jobs' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'DIAGNOSING', label: 'Diagnosing' },
  { key: 'ESTIMATE_SENT', label: 'Estimate Sent' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'TESTING', label: 'Testing' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Direct Number Send Invoice Modal State
  const [directSendJob, setDirectSendJob] = useState(null);
  const [isDirectSendOpen, setIsDirectSendOpen] = useState(false);
  const [directPhone, setDirectPhone] = useState('');
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  const currentStatus = searchParams.get('status') || 'ALL';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sortBy') || 'created_at';
  const currentDir = searchParams.get('sortDir') || 'desc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const debouncedSearch = useDebounce(searchInput, 500);

  // Sync external search changes to local searchInput
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Automatically update search params 500ms after user stops typing
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed !== currentSearch) {
      const params = new URLSearchParams(searchParams);
      if (trimmed) {
        params.set('search', trimmed);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      setSearchParams(params);
    }
  }, [debouncedSearch]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy: currentSort,
        sortDir: currentDir,
      };
      if (currentStatus !== 'ALL') {
        params.status = currentStatus;
      }
      if (currentSearch) {
        params.search = currentSearch;
      }

      const res = await jobService.getJobs(params);
      setJobs(res.jobs || []);
      setTotal(res.total || 0);
    } catch {
      toast.error('Failed to load repair jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [currentStatus, currentSearch, currentSort, currentDir, page, pageSize]);

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handlePageSizeChange = (newSize) => {
    const params = new URLSearchParams(searchParams);
    params.set('pageSize', String(newSize));
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleStatusChange = (status) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed !== currentSearch) {
      const params = new URLSearchParams(searchParams);
      if (trimmed) {
        params.set('search', trimmed);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      setSearchParams(params);
    }
  };

  const toggleSelectAll = () => {
    const pageIds = jobs.map((j) => j.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...pageIds]));
      setSelectedIds(merged);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Swal.fire({
      title: `Delete ${selectedIds.length} Job Sheet(s)?`,
      text: 'All selected repair jobs, diagnostics, estimates, and invoices will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, Delete (${selectedIds.length}) Jobs`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await jobService.bulkDeleteJobs(selectedIds);
          toast.success(res.message || `Deleted ${selectedIds.length} jobs`);
          setSelectedIds([]);
          fetchJobs();
        } catch (err) {
          toast.error(err.message || 'Failed to delete jobs');
        }
      }
    });
  };

  const handleBulkStatusUpdate = () => {
    if (selectedIds.length === 0) return;
    Swal.fire({
      title: `Update Status for ${selectedIds.length} Jobs`,
      input: 'select',
      inputOptions: {
        RECEIVED: 'Received / Intake',
        DIAGNOSING: 'Diagnosing',
        ESTIMATE_SENT: 'Estimate Sent',
        APPROVED: 'Approved',
        REJECTED: 'Estimate Rejected',
        IN_PROGRESS: 'In Progress / Repairing',
        TESTING: 'QC Testing',
        READY_FOR_PICKUP: 'Ready for Pickup',
        DELIVERED: 'Delivered / Completed',
        CANCELLED: 'Cancelled',
      },
      inputPlaceholder: 'Select new lifecycle status',
      showCancelButton: true,
      confirmButtonText: 'Apply Status Update',
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      inputValidator: (value) => {
        if (!value) return 'Please choose a status';
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const res = await jobService.bulkUpdateStatus(selectedIds, result.value);
          toast.success(res.message || `Updated status for ${selectedIds.length} jobs`);
          setSelectedIds([]);
          fetchJobs();
        } catch (err) {
          toast.error(err.message || 'Failed to update job status');
        }
      }
    });
  };

  const handleDeleteJob = (e, job) => {
    e.stopPropagation();
    Swal.fire({
      title: 'Delete this Job Sheet?',
      text: `Are you sure you want to permanently delete Job #${job.job_number}? All diagnostic records, estimates, tests, invoices, and payments associated with this job will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Job',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await jobService.deleteJob(job.id);
          setJobs((prev) => prev.filter((j) => j.id !== job.id));
          setTotal((prev) => Math.max(0, prev - 1));
          toast.success(`Job #${job.job_number} deleted successfully.`);
        } catch (err) {
          toast.error(err.message || 'Failed to delete job sheet');
        }
      }
    });
  };

  const handleQuickReopen = async (e, job) => {
    e.stopPropagation();
    const isDelivered = job.status === 'DELIVERED';
    const { value: reason } = await Swal.fire({
      title: isDelivered ? `Reopen Job #${job.job_number} (Warranty)?` : `Reopen Job #${job.job_number}?`,
      text: isDelivered
        ? 'Customer is returning within warranty period. Enter reported problem:'
        : 'Enter reason to reactivate this repair job:',
      input: 'textarea',
      inputPlaceholder: isDelivered
        ? 'e.g. Screen touch unresponsive after 3 days of delivery...'
        : 'e.g. Customer decided to proceed with repair...',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return 'Please provide a reason or warranty issue';
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Yes, Reopen Job',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
    });

    if (reason) {
      try {
        const res = await jobService.reopenJob(job.id, {
          reason: reason.trim(),
          target_status: 'DIAGNOSING',
        });
        toast.success(res.message || 'Job successfully reopened!');
        fetchJobs();
      } catch (err) {
        toast.error(err.message || 'Failed to reopen job');
      }
    }
  };

  // 1. Resend invoice to customer's registered number
  const handleResendCustomerInvoice = async (e, job) => {
    e.stopPropagation();
    const phone = job.customer?.phone || job.customer?.whatsapp_number;
    const customerName = job.customer?.full_name || 'Customer';

    if (!phone) {
      toast.error('No phone number recorded for this customer. Enter a number to send invoice.');
      handleOpenDirectSendModal(e, job);
      return;
    }

    const result = await Swal.fire({
      title: `Resend Invoice #${job.job_number}?`,
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.5; color: inherit;">
          <p style="margin-bottom: 8px;">Dispatch official tax invoice PDF & service details to:</p>
          <div style="margin: 10px 0; padding: 12px; border-radius: 10px; background: rgba(0, 113, 227, 0.08); border: 1px solid rgba(0, 113, 227, 0.2);">
            <div style="font-weight: 600;">${customerName}</div>
            <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #10b981; margin-top: 2px;">📞 ${phone}</div>
            <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
              Device: ${job.device?.brand || ''} ${job.device?.model || 'Device'} • Total: ₹${Number(job.total_amount || 0).toLocaleString()}
            </div>
          </div>
          <p style="font-size: 11px; opacity: 0.7; margin: 0;">Dispatches via WhatsApp & SMS with vector PDF invoice attached.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Send Invoice',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
    });

    if (result.isConfirmed) {
      const toastId = toast.loading(`Sending invoice to ${phone}...`);
      try {
        await invoiceService.resendInvoice(job.id, ['EMAIL', 'WHATSAPP', 'SMS']);
        toast.success(`Invoice sent to ${phone} successfully!`, { id: toastId });
      } catch (err) {
        toast.error(err.response?.data?.message || err.message || 'Failed to send invoice', { id: toastId });
      }
    }
  };

  // 2. Open Direct Phone Number Invoice Popup Modal
  const handleOpenDirectSendModal = (e, job) => {
    e.stopPropagation();
    setDirectSendJob(job);
    setDirectPhone(job.customer?.phone || job.customer?.whatsapp_number || '');
    setIsDirectSendOpen(true);
  };

  const handleCloseDirectSendModal = () => {
    setIsDirectSendOpen(false);
    setDirectSendJob(null);
    setDirectPhone('');
  };

  // 3. Send invoice to custom typed number
  const handleSendDirectInvoice = async (e) => {
    if (e) e.preventDefault();
    if (!directSendJob) return;

    const cleanDigits = directPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      toast.error('Please enter a valid mobile number (at least 10 digits)');
      return;
    }

    try {
      setIsSendingDirect(true);
      const toastId = toast.loading(`Dispatching invoice to ${directPhone.trim()}...`);
      await invoiceService.resendInvoice(directSendJob.id, {
        targetPhone: directPhone.trim(),
        channels: ['WHATSAPP', 'SMS'],
      });
      toast.success(`Invoice sent to ${directPhone.trim()} successfully!`, { id: toastId });
      handleCloseDirectSendModal();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send invoice to direct number');
    } finally {
      setIsSendingDirect(false);
    }
  };

  // 4. Open directly in WhatsApp Web / App chat
  const handleOpenDirectWhatsAppChat = () => {
    if (!directSendJob) return;
    const cleanDigits = directPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      toast.error('Please enter a valid phone number first');
      return;
    }
    const intlPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const trackingUrl = `${window.location.origin}/repair/${directSendJob.job_number}/approval?token=${directSendJob.approval_token || ''}`;
    const downloadPdfLink = `${window.location.origin}/api/invoices/public/${directSendJob.id}/download-pdf`;

    const text =
      `*Service Record & Tax Invoice - Mobotech mobile care*\n` +
      `Dear ${directSendJob.customer?.full_name || 'Customer'},\n` +
      `Your repair invoice #${directSendJob.job_number} is ready.\n\n` +
      `📱 *Device:* ${directSendJob.device?.brand || ''} ${directSendJob.device?.model || ''}\n` +
      `💰 *Total Amount:* ₹${Number(directSendJob.total_amount || 0).toFixed(2)}\n` +
      (directSendJob.balance_due > 0 ? `⚠️ *Balance Due:* ₹${Number(directSendJob.balance_due).toFixed(2)}\n` : `✓ *Paid in Full*\n`) +
      `\n📄 *Download Invoice PDF:* ${downloadPdfLink}\n` +
      `🌐 *View Repair Record Online:* ${trackingUrl}\n\n` +
      `Thank you for choosing Mobotech mobile care!`;

    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight">
            Repair Job Sheets
          </h2>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
            Browse, search, and manage all active and archived service tickets
          </p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/jobs/new')}>
          Create Job Sheet
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="spatial-card p-3.5 sm:p-4 rounded-2xl space-y-3">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--spatial-border)] no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const active = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 ${active
                  ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                  : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Job #, Customer, Phone, IMEI (500ms debounce)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs spatial-input rounded-xl"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  const params = new URLSearchParams(searchParams);
                  params.delete('search');
                  params.set('page', '1');
                  setSearchParams(params);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 text-xs text-[var(--spatial-text-muted)]">
            <span className="shrink-0 font-medium">Sort by:</span>
            <div className="w-40">
              <SpatialSelect
                value={`${currentSort}:${currentDir}`}
                onChange={(val) => {
                  const [sortBy, sortDir] = val.split(':');
                  const params = new URLSearchParams(searchParams);
                  params.set('sortBy', sortBy);
                  params.set('sortDir', sortDir);
                  setSearchParams(params);
                }}
                options={[
                  { value: 'created_at:desc', label: 'Newest First' },
                  { value: 'created_at:asc', label: 'Oldest First' },
                  { value: 'total_amount:desc', label: 'Highest Cost' },
                  { value: 'total_amount:asc', label: 'Lowest Cost' },
                ]}
                size="sm"
                searchable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkUpdate={handleBulkStatusUpdate}
        updateLabel="Change Status"
        onBulkDelete={handleBulkDelete}
        deleteLabel={`Delete (${selectedIds.length})`}
      />

      {/* Jobs Table Card */}
      <Card
        title={`Matching Jobs (${total})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={7} columns={7} showHeader={false} showPagination={false} />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No repair jobs found"
            description="No jobs match your search or status criteria. Try clearing filters or create a new job."
            actionLabel="Create Job Sheet"
            onAction={() => navigate('/jobs/new')}
          />
        ) : (
          <div className="spatial-tab-pane">
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1250px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-medium text-[11px] tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={jobs.length > 0 && jobs.every((j) => selectedIds.includes(j.id))}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-[#0071e3] cursor-pointer accent-[#0071e3]"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Job Number</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer Number</th>
                    <th className="px-5 py-3 whitespace-nowrap">Device & Model</th>
                    <th className="px-5 py-3 whitespace-nowrap">Complaint / Issue</th>
                    <th className="px-5 py-3 whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Estimate</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Balance</th>
                    <th className="px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {jobs.map((job) => {
                    const isSelected = selectedIds.includes(job.id);
                    return (
                      <tr
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className={`hover:bg-[var(--spatial-bg-card-subtle)]/70 transition-colors cursor-pointer ${isSelected ? 'bg-blue-500/[0.08]' : ''
                          }`}
                      >
                        <td
                          className="w-10 px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(job.id)}
                            aria-label={`Select job ${job.job_number}`}
                            className="w-4 h-4 rounded text-[#0071e3] cursor-pointer accent-[#0071e3]"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#0071e3] dark:text-[#0a84ff] whitespace-nowrap tracking-tight">
                          {job.job_number}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-[var(--spatial-text-title)]">
                            {job.customer?.full_name || 'Walk-in Customer'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap tabular-nums text-[11px] text-[var(--spatial-text-body)]">
                          {job.customer?.phone || job.customer?.whatsapp_number || '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-[var(--spatial-text-title)]">
                            {job.device?.brand} {job.device?.model}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-body)] whitespace-nowrap max-w-sm truncate" title={job.customer_complaint}>
                          {job.customer_complaint || '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              <Badge status={job.status} />
                              {job.is_warranty_claim && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap" title={`Warranty Claim #${job.reopen_count || 1}`}>
                                  Warranty #{job.reopen_count || 1}
                                </span>
                              )}
                            </div>
                            {/* Pending or Remaining Warranty Days */}
                            {(() => {
                              const totalDays = job.warranty_days !== undefined ? Number(job.warranty_days) : 90;
                              if (job.status === 'DELIVERED') {
                                if (totalDays <= 0) {
                                  return (
                                    <span className="text-[10px] text-[var(--spatial-text-muted)] font-normal">
                                      No warranty
                                    </span>
                                  );
                                }
                                const deliveryDate = new Date(job.delivered_at || job.updated_at);
                                const elapsed = Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24));
                                const remaining = Math.max(0, totalDays - elapsed);
                                if (remaining > 0) {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                      <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                      {remaining}d warranty left
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[10px] text-[var(--spatial-text-muted)] font-normal">
                                    Warranty expired
                                  </span>
                                );
                              }
                              if (['CANCELLED', 'REJECTED'].includes(job.status)) {
                                return null;
                              }
                              if (totalDays <= 0) {
                                return (
                                  <span className="text-[10px] text-[var(--spatial-text-muted)] font-normal">
                                    No warranty
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                  Pending ({totalDays}d)
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-[var(--spatial-text-title)] whitespace-nowrap tabular-nums">
                          ₹{Number(job.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap tabular-nums">
                          {job.balance_due > 0 ? (
                            <span className="text-rose-500 dark:text-rose-400">₹{Number(job.balance_due).toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">₹0</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap tabular-nums text-[11px]">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* Reopen Job Sheet */}
                            {['DELIVERED', 'CANCELLED', 'REJECTED'].includes(job.status) && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickReopen(e, job)}
                                className="p-1.5 text-[var(--spatial-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all active:scale-95 cursor-pointer"
                                title={job.status === 'DELIVERED' ? 'Reopen Job (Warranty Claim)' : 'Reopen Repair Job'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}

                            {/* Resend Invoice to Customer Number */}
                            <button
                              type="button"
                              onClick={(e) => handleResendCustomerInvoice(e, job)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title={
                                job.customer?.phone || job.customer?.whatsapp_number
                                  ? `Resend Invoice to ${job.customer?.phone || job.customer?.whatsapp_number}`
                                  : 'Resend Invoice to Customer Number'
                              }
                            >
                              <Send className="w-4 h-4" />
                            </button>

                            {/* Send Invoice to Direct / Custom Number (Opens Popup) */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenDirectSendModal(e, job)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-[#0071e3] hover:bg-blue-500/10 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Send Invoice to Direct Number (Custom Phone)"
                            >
                              <PhoneForwarded className="w-4 h-4" />
                            </button>

                            {/* View / Edit Job Sheet */}
                            <button
                              type="button"
                              onClick={() => navigate(`/jobs/${job.id}?tab=estimate`)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-[#0071e3] hover:bg-blue-500/10 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Open Job Sheet (Parts & Estimate)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Delete Job Sheet */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteJob(e, job)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Delete Job Sheet"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <SpatialPagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 15, 20]}
            />
          </div>
        )}
      </Card>

      {/* Direct Phone Number Invoice Popup Modal */}
      {isDirectSendOpen && directSendJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCloseDirectSendModal}
        >
          <div
            className="relative w-full max-w-md bg-[var(--spatial-bg-card,#18181b)] border border-[var(--spatial-border,#27272a)] rounded-2xl shadow-2xl p-6 overflow-hidden text-[var(--spatial-text-title,#fafafa)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--spatial-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 flex items-center justify-center">
                  <PhoneForwarded className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Send Invoice to Direct Number</h3>
                  <p className="text-xs text-[var(--spatial-text-muted)]">
                    Job #{directSendJob.job_number} • {directSendJob.customer?.full_name || 'Walk-in Customer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDirectSendModal}
                className="p-1.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-lg hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Job Details Pill */}
            <div className="mt-4 p-3 bg-[var(--spatial-bg-card-subtle)] rounded-xl border border-[var(--spatial-border)] flex items-center justify-between text-xs">
              <div>
                <span className="text-[var(--spatial-text-muted)] block text-[10px] uppercase font-semibold">Device</span>
                <span className="font-medium text-[var(--spatial-text-title)]">
                  {directSendJob.device?.brand} {directSendJob.device?.model || 'Device'}
                </span>
              </div>
              <div>
                <span className="text-[var(--spatial-text-muted)] block text-[10px] uppercase font-semibold">Status</span>
                <Badge status={directSendJob.status} />
              </div>
              <div className="text-right">
                <span className="text-[var(--spatial-text-muted)] block text-[10px] uppercase font-semibold">Total Amount</span>
                <span className="font-semibold text-emerald-500">
                  ₹{Number(directSendJob.total_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSendDirectInvoice} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--spatial-text-title)] mb-1.5">
                  Recipient Mobile / WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="Enter 10-digit phone number (e.g. 9876543210)"
                    autoFocus
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-title)] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
                  />
                </div>
                <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1.5">
                  Enter any direct phone number to dispatch this repair job's official invoice PDF & service details.
                </p>

                {/* Customer's saved numbers if available for quick filling */}
                {(directSendJob.customer?.phone || directSendJob.customer?.whatsapp_number) && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] text-[var(--spatial-text-muted)]">Saved:</span>
                    {directSendJob.customer?.phone && (
                      <button
                        type="button"
                        onClick={() => setDirectPhone(directSendJob.customer.phone)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer"
                        title="Click to copy saved customer phone"
                      >
                        {directSendJob.customer.phone}
                      </button>
                    )}
                    {directSendJob.customer?.whatsapp_number && directSendJob.customer.whatsapp_number !== directSendJob.customer?.phone && (
                      <button
                        type="button"
                        onClick={() => setDirectPhone(directSendJob.customer.whatsapp_number)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                        title="Click to copy saved WhatsApp number"
                      >
                        WA: {directSendJob.customer.whatsapp_number}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--spatial-border)]">
                {/* <button
                  type="button"
                  onClick={handleOpenDirectWhatsAppChat}
                  disabled={!directPhone.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  title="Open invoice message in WhatsApp Web / App"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </button> */}

                <div className="flex items-center justify-end w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseDirectSendModal}
                    disabled={isSendingDirect}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    icon={Send}
                    loading={isSendingDirect}
                    disabled={!directPhone.trim() || isSendingDirect}
                  >
                    Send Invoice
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
