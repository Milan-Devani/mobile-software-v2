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
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { jobService } from '../../services/jobService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentStatus = searchParams.get('status') || 'ALL';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sortBy') || 'created_at';
  const currentDir = searchParams.get('sortDir') || 'desc';

  const [searchInput, setSearchInput] = useState(currentSearch);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
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
  }, [currentStatus, currentSearch, currentSort, currentDir]);

  const handleStatusChange = (status) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    setSearchParams(params);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    setSearchParams(params);
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
              placeholder="Search Job #, Customer, Phone, IMEI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-xs spatial-input rounded-xl"
            />
          </form>

          <div className="flex items-center gap-2 text-xs text-[var(--spatial-text-muted)]">
            <span>Sort by:</span>
            <select
              value={`${currentSort}:${currentDir}`}
              onChange={(e) => {
                const [sortBy, sortDir] = e.target.value.split(':');
                const params = new URLSearchParams(searchParams);
                params.set('sortBy', sortBy);
                params.set('sortDir', sortDir);
                setSearchParams(params);
              }}
              className="px-2.5 py-1.5 spatial-input rounded-xl text-xs font-medium"
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="total_amount:desc">Highest Cost</option>
              <option value="total_amount:asc">Lowest Cost</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Table Card */}
      <Card
        title={`Matching Jobs (${total})`}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Job Number</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Device & Model</th>
                  <th className="px-5 py-3">Complaint / Issue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Estimate</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">
                      {job.job_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[var(--spatial-text-title)]">{job.customer?.full_name}</p>
                      <p className="text-[11px] text-[var(--spatial-text-muted)] font-mono">{job.customer?.phone}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--spatial-text-title)]">{job.device?.brand} {job.device?.model}</p>
                      <p className="text-[11px] text-[var(--spatial-text-muted)] font-mono">IMEI: {job.device?.imei || 'N/A'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--spatial-text-body)] max-w-xs truncate">
                      {job.customer_complaint}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-[var(--spatial-text-title)]">
                      ₹{Number(job.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold">
                      {job.balance_due > 0 ? (
                        <span className="text-rose-400">₹{Number(job.balance_due).toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-400">₹0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/${job.id}`);
                          }}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
