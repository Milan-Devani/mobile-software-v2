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
                    ? 'border-sky-400 bg-sky-500/15 shadow-sm ring-2 ring-sky-500/20'
                    : 'border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] hover:border-[var(--spatial-border-hover)] hover:bg-[var(--spatial-bg-card-hover)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--spatial-text-title)] truncate">{p.label}</span>
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--spatial-bg-card-hover)] text-sky-400">
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
              <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter recent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px]">
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
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {filteredJobs.map((job) => (
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
                      <p className="text-[11px] text-[var(--spatial-text-muted)] truncate max-w-xs">{job.customer_complaint}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-[var(--spatial-text-title)]">
                      ₹{Number(job.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold">
                      {job.balance_due > 0 ? (
                        <span className="text-rose-400">₹{Number(job.balance_due).toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-400">₹0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                        className="p-1.5 text-[var(--spatial-text-muted)] hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
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
