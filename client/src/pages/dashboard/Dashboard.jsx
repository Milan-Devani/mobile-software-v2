import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  Eye,
  Trash2,
  Edit3,
  Layers,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { dashboardService } from '../../services/dashboardService';
import { jobService } from '../../services/jobService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { BulkActionBar } from '../../components/common/BulkActionBar';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  const [fetchError, setFetchError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await dashboardService.getStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setFetchError(err.message || 'Failed to load dashboard metrics');
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage label="Loading workshop statistics..." />;
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

  const filteredJobs = recentJobs.filter((job) => {
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    const matchesSearch =
      !search ||
      job.job_number.toLowerCase().includes(search.toLowerCase()) ||
      job.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      job.device?.model?.toLowerCase().includes(search.toLowerCase()) ||
      job.customer_complaint?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalItems = filteredJobs.length;
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
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
          fetchStats();
        } catch (err) {
          toast.error(err.message || 'Failed to update job status');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--spatial-text-title)] tracking-tight">Workshop Operations</h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Real-time repair lifecycle tracking and revenue metrics
          </p>
        </div>
        <div className="flex items-center gap-2.5">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Jobs */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Total Jobs</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--spatial-text-title)] mt-2 font-mono">{summary.total_jobs || 0}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--spatial-text-muted)]">
            <span className="text-sky-400 font-bold">{summary.today_jobs || 0}</span> new today
          </div>
        </div>

        {/* In Progress */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-400 mt-2 font-mono">{summary.in_progress || 0}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--spatial-text-muted)]">
            <span className="text-purple-400 font-bold">{summary.testing || 0}</span> in QC testing
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Ready for Pickup</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2 font-mono">{summary.ready_for_pickup || 0}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--spatial-text-muted)]">
            <span className="text-emerald-400 font-bold">{summary.completed || 0}</span> delivered
          </div>
        </div>

        {/* Pending Receivables / Balance */}
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Pending Balance</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2 font-mono">
            ₹{Number(summary.pending_payments || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--spatial-text-muted)]">
            Today's revenue: <strong className="text-[var(--spatial-text-title)] font-mono">₹{Number(summary.today_revenue || 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Repair Lifecycle Pipeline Grid */}
      <Card title="Repair Lifecycle Pipeline" subtitle="Click any stage to filter repair jobs" hover={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {pipeline.map((p) => {
            const isSelected = statusFilter === p.status;
            return (
              <button
                key={p.status}
                onClick={() => setStatusFilter(isSelected ? 'ALL' : p.status)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/20 shadow-md ring-2 ring-sky-500/30 -translate-y-1'
                    : 'spatial-inner-box hover:border-sky-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--spatial-text-title)] truncate">
                    {p.label}
                  </span>
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--spatial-bg-card-hover)] text-sky-400 border border-sky-400/20">
                    {p.count}
                  </span>
                </div>
                <div className="mt-2">
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
        subtitle={`Showing ${paginatedJobs.length} of ${filteredJobs.length} jobs`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter recent..."
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
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline ml-2"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
        bodyClassName="p-0"
      >
        {filteredJobs.length === 0 ? (
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
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isPageAllSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-sky-500 cursor-pointer accent-sky-500"
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
                            <span className="font-semibold text-[var(--spatial-text-title)]">{job.customer?.full_name || 'Walk-in'}</span>
                            {job.customer?.phone && (
                              <span className="text-[11px] text-[var(--spatial-text-muted)] font-mono">({job.customer.phone})</span>
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
                        <td className="px-5 py-3.5 text-right font-mono font-medium text-[var(--spatial-text-title)] whitespace-nowrap">
                          ₹{Number(job.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold whitespace-nowrap">
                          {job.balance_due > 0 ? (
                            <span className="text-rose-400">₹{Number(job.balance_due).toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-400">₹0</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                              title="View Job Sheet"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSingleDelete(job)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
