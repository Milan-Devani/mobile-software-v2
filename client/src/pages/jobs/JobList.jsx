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
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { jobService } from '../../services/jobService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--spatial-text-title)] tracking-tight">Repair Job Sheets</h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Browse, search, and manage all active and archived service tickets
          </p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/jobs/new')}>
          Create Job Sheet
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="spatial-card p-4 rounded-2xl space-y-3">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--spatial-border)] no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const active = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-950/20'
                    : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 text-xs text-[var(--spatial-text-muted)]">
            <span className="shrink-0 font-medium">Sort by:</span>
            <div className="w-36">
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
          <LoadingSpinner label="Fetching jobs from database..." />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No repair jobs found"
            description="No jobs match your search or status criteria. Try clearing filters or create a new job."
            actionLabel="Create Job Sheet"
            onAction={() => navigate('/jobs/new')}
          />
        ) : (
          <div>
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1250px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={jobs.length > 0 && jobs.every((j) => selectedIds.includes(j.id))}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-sky-500 cursor-pointer accent-sky-500"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Job Number</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer</th>
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
                        className={`hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer ${
                          isSelected ? 'bg-sky-500/10' : ''
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
                            className="w-4 h-4 rounded text-sky-500 cursor-pointer accent-sky-500"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-sky-400 whitespace-nowrap">
                          {job.job_number}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-semibold text-[var(--spatial-text-title)]">{job.customer?.full_name || 'Walk-in Customer'}</span>
                            {job.customer?.phone && (
                              <span className="text-[11px] text-[var(--spatial-text-muted)] font-mono">({job.customer.phone})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-medium text-[var(--spatial-text-title)]">{job.device?.brand} {job.device?.model}</span>
                            {job.device?.imei && (
                              <span className="text-[10px] text-[var(--spatial-text-muted)] font-mono bg-[var(--spatial-bg-card-subtle)] px-1.5 py-0.5 rounded border border-[var(--spatial-border)]">
                                IMEI: {job.device.imei}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-body)] whitespace-nowrap max-w-sm truncate" title={job.customer_complaint}>
                          {job.customer_complaint || '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <Badge status={job.status} />
                            {job.is_warranty_claim && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap" title={`Warranty Claim #${job.reopen_count || 1}`}>
                                Warranty #{job.reopen_count || 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-medium text-[var(--spatial-text-title)] whitespace-nowrap">
                          ₹{Number(job.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                          {job.balance_due > 0 ? (
                            <span className="text-rose-400">₹{Number(job.balance_due).toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-400">₹0</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {['DELIVERED', 'CANCELLED', 'REJECTED'].includes(job.status) && (
                              <button
                                onClick={(e) => handleQuickReopen(e, job)}
                                className="p-1.5 text-[var(--spatial-text-muted)] hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title={job.status === 'DELIVERED' ? 'Reopen Job (Warranty Claim)' : 'Reopen Repair Job'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                              title="Open Job Sheet"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteJob(e, job)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
    </div>
  );
};
