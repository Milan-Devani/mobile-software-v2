import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  IndianRupee,
  Plus,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  Eye,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  Wallet,
  Receipt,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { dashboardService } from '../../services/dashboardService';
import { useDebounce } from '../../hooks/useDebounce';
import { jobService } from '../../services/jobService';
import { Card, LoadingSpinner, EmptyState, StatsSkeleton, TableSkeleton, Skeleton } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { SpatialDateFilter } from '../../components/common/SpatialDateFilter';
import { BulkActionBar } from '../../components/common/BulkActionBar';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const [fetchError, setFetchError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await dashboardService.getStats(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setFetchError(err.message || 'Failed to load dashboard metrics');
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const [isSlowLoading, setIsSlowLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setIsSlowLoading(true), 3000);
    } else {
      setIsSlowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // ---- Repair jobs table: server-side pagination (status / search / date range) ----
  const [jobRows, setJobRows] = useState([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(false);
  const jobsRequestIdRef = useRef(0);

  const fetchJobsPage = useCallback(async () => {
    const requestId = ++jobsRequestIdRef.current;
    try {
      setJobsLoading(true);
      const params = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy: 'created_at',
        sortDir: 'desc',
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await jobService.getJobs(params);
      if (requestId !== jobsRequestIdRef.current) return;
      const rows = res?.jobs || [];
      const total = res?.total ?? rows.length;
      if (rows.length === 0 && currentPage > 1 && total > 0) {
        setCurrentPage(Math.max(1, Math.ceil(total / pageSize)));
        return;
      }
      setJobRows(rows);
      setJobsTotal(total);
    } catch (err) {
      if (requestId === jobsRequestIdRef.current) {
        console.error('Failed to load repair jobs:', err);
      }
    } finally {
      if (requestId === jobsRequestIdRef.current) setJobsLoading(false);
    }
  }, [statusFilter, debouncedSearch, startDate, endDate, currentPage, pageSize]);

  useEffect(() => {
    fetchJobsPage();
  }, [fetchJobsPage]);

  // Status / search changed → back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch]);

  if (loading) {
    return (
      <div className="space-y-6 spatial-tab-pane">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 opacity-70" />
          </div>
          {isSlowLoading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>Connecting to cloud server...</span>
            </div>
          ) : (
            <Skeleton className="h-10 w-36" rounded="rounded-xl" />
          )}
        </div>
        <StatsSkeleton count={4} />
        <TableSkeleton rows={5} columns={6} showHeader={false} />
      </div>
    );
  }

  if (!data && fetchError) {
    return (
      <div className="py-8">
        <EmptyState
          icon={AlertCircle}
          title="Unable to load workshop metrics"
          description={fetchError}
          actionLabel="Retry Loading"
          onAction={fetchStats}
        />
      </div>
    );
  }

  const summary = data?.summary || {};
  const pipeline = data?.pipeline || [];
  const recentJobs = data?.recent_jobs || [];

  // Jobs table rows come from GET /jobs (already filtered + paginated on the server)
  const filteredJobs = jobRows;
  const totalItems = jobsTotal;
  const paginatedJobs = jobRows;
  const isPageAllSelected =
    paginatedJobs.length > 0 && paginatedJobs.every((j) => selectedIds.includes(j.id));

  const toggleSelectAll = () => {
    const pageIds = paginatedJobs.map((j) => j.id);
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

  const handleDateFilterChange = ({ preset, startDate: s, endDate: e }) => {
    setDatePreset(preset || 'ALL');
    setStartDate(s || '');
    setEndDate(e || '');
    setCurrentPage(1);
  };

  const handleSingleDelete = (job) => {
    Swal.fire({
      title: `Delete Job Sheet #${job.job_number}?`,
      text: 'This will delete the job, diagnostics, invoice, and all associated service history.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Job',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await jobService.deleteJob(job.id);
          toast.success(`Job #${job.job_number} deleted successfully`);
          setSelectedIds((prev) => prev.filter((id) => id !== job.id));
          fetchStats();
          fetchJobsPage();
        } catch (err) {
          toast.error(err.message || 'Failed to delete job');
        }
      }
    });
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
          fetchStats();
          fetchJobsPage();
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
        IN_PROGRESS: 'In Progress / Repairing',
        TESTING: 'QC Testing',
        READY_FOR_PICKUP: 'Ready for Pickup',
        DELIVERED: 'Delivered / Completed',
        REJECTED: 'Estimate Rejected',
        CANCELLED: 'Returned Unrepaired',
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
          fetchStats();
          fetchJobsPage();
        } catch (err) {
          toast.error(err.message || 'Failed to update job status');
        }
      }
    });
  };

  return (
    <div className="space-y-6 spatial-tab-pane">
      {/* Welcome & Primary Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight">
            Workshop Operations
          </h2>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
            Real-time repair lifecycle tracking and revenue metrics
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <SpatialDateFilter
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateFilterChange}
          />
          <Button
            icon={Plus}
            onClick={() => navigate('/jobs/new')}
            className="shadow-sm"
          >
            Create Job Sheet
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Active Jobs */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Total Jobs</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/15 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--spatial-text-title)] tabular-nums">
              {summary.total_jobs || 0}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              <span className="text-[#0071e3] dark:text-[#0a84ff] font-semibold">{summary.today_jobs || 0}</span> new today
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/15 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-indigo-500 dark:text-indigo-400 tabular-nums">
              {summary.in_progress || 0}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              <span className="text-indigo-500 dark:text-indigo-400 font-semibold">{summary.testing || 0}</span> in QC testing
            </div>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Ready for Pickup</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {summary.ready_for_pickup || 0}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{summary.completed || 0}</span> delivered
            </div>
          </div>
        </div>

        {/* Returned Unrepaired */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Returned Unrepaired</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {summary.returned_unrepaired || 0}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{summary.rejected || 0}</span> estimate rejected
            </div>
          </div>
        </div>

        {/* Pending Receivables / Balance */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Pending Balance</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/15 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-rose-500 dark:text-rose-400 tabular-nums">
              ₹{Number(summary.pending_payments || 0).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              Today's revenue: <strong className="text-[var(--spatial-text-title)] font-semibold tabular-nums">₹{Number(summary.today_revenue || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Total Balance (Collected) */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Total Balance</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₹{Number(summary.total_revenue || 0).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              Total collected (jobs + sales)
            </div>
          </div>
        </div>

        {/* Repaired Job Balance */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Repaired Job Balance</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/15 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-sky-600 dark:text-sky-400 tabular-nums">
              ₹{Number(summary.repair_balance || 0).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              Collected from repair jobs
            </div>
          </div>
        </div>

        {/* Sales Balance */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Sales Balance</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/15 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-violet-600 dark:text-violet-400 tabular-nums">
              ₹{Number(summary.sales_balance || 0).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs text-[var(--spatial-text-muted)]">
              Collected from sales invoices
            </div>
          </div>
        </div>
      </div>

      {/* Repair Lifecycle Pipeline Grid */}
      <Card title="Repair Lifecycle Pipeline" subtitle="Click any stage to filter repair jobs" hover={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {pipeline.map((p) => {
            const isSelected = statusFilter === p.status;
            return (
              <button
                key={p.status}
                onClick={() => setStatusFilter(isSelected ? 'ALL' : p.status)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? 'border-[#0071e3] bg-blue-500/10 shadow-sm ring-1 ring-[#0071e3]/30'
                    : 'spatial-inner-box hover:border-[var(--spatial-border-highlight)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[12px] font-medium text-[var(--spatial-text-title)] truncate">
                    {p.label}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                    isSelected
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-[var(--spatial-bg-card-hover)] text-[var(--spatial-text-muted)] border border-[var(--spatial-border)]'
                  }`}>
                    {p.count}
                  </span>
                </div>
                <div className="mt-2.5">
                  <Badge status={p.status} size="sm" />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Bulk Action Bar (when rows are selected) */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkUpdate={handleBulkStatusUpdate}
        updateLabel="Change Status"
        onBulkDelete={handleBulkDelete}
        deleteLabel={`Delete (${selectedIds.length})`}
      />

      {/* Recent Jobs Table */}
      <Card
        title="Recent Repair Jobs"
        subtitle={`Showing ${paginatedJobs.length} of ${totalItems} jobs`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs spatial-input rounded-xl w-40 sm:w-52"
              />
            </div>
            <button
              onClick={() => navigate('/jobs')}
              className="text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:opacity-80 flex items-center gap-1 ml-2 transition-opacity active:scale-95"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
        bodyClassName="p-0"
      >
        {totalItems === 0 && !jobsLoading ? (
          <EmptyState
            icon={Wrench}
            title="No repair jobs match this filter"
            description="Adjust your search or status filter to see other jobs, or create a new job sheet."
            actionLabel="Clear Filter"
            onAction={() => {
              setSearch('');
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
          />
        ) : (
          <div>
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-medium text-[11px] tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isPageAllSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-[#0071e3] cursor-pointer accent-[#0071e3]"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Job Number</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                    <th className="px-5 py-3 whitespace-nowrap">Device & Issue</th>
                    <th className="px-5 py-3 whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Estimate / Total</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Balance</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {paginatedJobs.map((job) => {
                    const isSelected = selectedIds.includes(job.id);
                    const hasPendingBalance = Number(job.balance_due) > 0;
                    return (
                      <tr
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/[0.08]'
                            : hasPendingBalance
                              ? 'bg-rose-500/[0.07] hover:bg-rose-500/[0.14] dark:bg-rose-500/10 dark:hover:bg-rose-500/20'
                              : 'hover:bg-[var(--spatial-bg-card-subtle)]/70'
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
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-medium text-[var(--spatial-text-title)]">{job.customer?.full_name || 'Walk-in'}</span>
                            {job.customer?.phone && (
                              <span className="text-[11px] text-[var(--spatial-text-muted)] tabular-nums">({job.customer.phone})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-medium text-[var(--spatial-text-title)]">{job.device?.brand} {job.device?.model}</span>
                            {job.customer_complaint && (
                              <span className="text-[11px] text-[var(--spatial-text-muted)] max-w-xs truncate" title={job.customer_complaint}>
                                • {job.customer_complaint}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge status={job.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-[var(--spatial-text-title)] whitespace-nowrap tabular-nums">
                          ₹{Number(job.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium whitespace-nowrap tabular-nums">
                          {job.balance_due > 0 ? (
                            <span className="text-rose-500 dark:text-rose-400 font-semibold">₹{Number(job.balance_due).toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">₹0</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-[#0071e3] hover:bg-blue-500/10 rounded-lg transition-all active:scale-95"
                              title="View Job Sheet"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSingleDelete(job)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95"
                              title="Delete Job"
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
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 15, 20]}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
