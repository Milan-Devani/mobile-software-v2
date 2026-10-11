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
  Layers,
  Sparkles
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading workshop statistics..." />;
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

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Workshop Operations</h2>
          <p className="text-xs text-slate-500 mt-1">
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
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Jobs</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-mono">{summary.total_jobs || 0}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span className="text-primary-600 font-bold">{summary.today_jobs || 0}</span> new today
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-2 font-mono">{summary.in_progress || 0}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span className="text-purple-600 font-bold">{summary.testing || 0}</span> in QC testing
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready for Pickup</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2 font-mono">{summary.ready_for_pickup || 0}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-bold">{summary.completed || 0}</span> completed & delivered
          </div>
        </div>

        {/* Pending Receivables / Balance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Balance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-2 font-mono">
            ${Number(summary.pending_payments || 0).toFixed(2)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            Today's revenue: <strong className="text-slate-800">${Number(summary.today_revenue || 0).toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Repair Lifecycle Pipeline Grid */}
      <Card title="Repair Lifecycle Pipeline" subtitle="Click any stage to filter repair jobs">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {pipeline.map((p) => {
            const isSelected = statusFilter === p.status;
            return (
              <button
                key={p.status}
                onClick={() => setStatusFilter(isSelected ? 'ALL' : p.status)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50/50 shadow-xs ring-2 ring-primary-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 truncate">{p.label}</span>
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
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

      {/* Recent Jobs Table */}
      <Card
        title="Recent Repair Jobs"
        subtitle={`Showing ${filteredJobs.length} jobs`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter recent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-40 sm:w-52 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={() => navigate('/jobs')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline ml-2"
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
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Job Number</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Device & Issue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Estimate / Total</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job) => (
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
                      <p className="text-[11px] text-slate-500">{job.customer?.phone}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{job.device?.brand} {job.device?.model}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{job.customer_complaint}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-slate-800">
                      ${Number(job.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold">
                      {job.balance_due > 0 ? (
                        <span className="text-rose-600">${Number(job.balance_due).toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-600">$0.00</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Job Sheet"
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
