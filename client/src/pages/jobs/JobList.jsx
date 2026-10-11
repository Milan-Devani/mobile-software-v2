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
  ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
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
    } catch (err) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Repair Job Sheets</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse, search, and manage all active and archived service tickets
          </p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/jobs/new')}>
          Create Job Sheet
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const active = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Job #, Customer, Phone, IMEI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </form>

          <div className="flex items-center gap-2 text-xs text-slate-500">
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
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
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
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
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
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-primary-600">
                      {job.job_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{job.customer?.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{job.customer?.phone}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{job.device?.brand} {job.device?.model}</p>
                      <p className="text-[11px] text-slate-500 font-mono">IMEI: {job.device?.imei || 'N/A'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {job.customer_complaint}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-slate-900">
                      ${Number(job.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold">
                      {job.balance_due > 0 ? (
                        <span className="text-rose-600">${Number(job.balance_due).toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-600">$0.00</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Open Job Sheet"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
