import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ExternalLink,
  RotateCcw,
  Search,
  Filter,
  Copy,
  Check,
  Settings,
  ShieldAlert,
  Smartphone,
  MessageSquare,
  Wrench,
  X,
  RefreshCw,
  Save,
  Globe,
  Sliders,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { reviewService } from '../../services/reviewService';
import { copyTextToClipboard } from '../../utils/clipboard';
import { Card, LoadingSpinner, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { formatInvoiceDate } from '../../utils/billFormatters';

export const GoogleReviewsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    opened: 0,
    redirected: 0,
  });
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({
    google_review_url: '',
    is_enabled: true,
    invitation_channel: 'WHATSAPP',
    invitation_message: '',
    ai_enabled: true,
    ai_providers_status: null,
  });

  // Request Details Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch Requests & Dashboard Stats
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reviewService.getRequests({
        page,
        limit: pageSize,
        status: statusFilter,
        rating: ratingFilter,
        search: debouncedSearch,
      });

      setRequests(res.requests || []);
      setTotalCount(res.total || 0);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      toast.error('Failed to load review requests.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, ratingFilter, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load Settings for Modal
  const handleOpenSettings = async () => {
    try {
      const data = await reviewService.getSettings();
      setSettingsData(data);
      setIsSettingsOpen(true);
    } catch (err) {
      toast.error('Could not load review settings.');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await reviewService.updateSettings({
        google_review_url: settingsData.google_review_url,
        is_enabled: settingsData.is_enabled,
        invitation_channel: settingsData.invitation_channel,
        invitation_message: settingsData.invitation_message,
        ai_enabled: settingsData.ai_enabled,
      });
      toast.success('Review Assistant settings saved successfully.');
      setIsSettingsOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRetry = async (requestId) => {
    try {
      const res = await reviewService.retryRequest(requestId);
      toast.success(res.message || 'Invitation resent successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to retry invitation.');
    }
  };

  const handleRevoke = async (requestId) => {
    const confirm = await Swal.fire({
      title: 'Revoke Review Invitation?',
      text: 'This will invalidate the review link for this customer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Revoke Link',
    });

    if (confirm.isConfirmed) {
      try {
        await reviewService.revokeRequest(requestId);
        toast.success('Invitation link revoked.');
        fetchData();
      } catch (err) {
        toast.error(err.message || 'Failed to revoke link.');
      }
    }
  };

  const handleCopyLink = async (token, id) => {
    const origin = window.location.origin;
    const link = `${origin}/review/${token}`;
    await copyTextToClipboard(link);
    setCopiedId(id);
    toast.success('Public review link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/25">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--spatial-text-title)] tracking-tight">
                Google Review Management
              </h1>
              <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
                Automated customer feedback & AI-assisted Google review invitation system
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            className="flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenSettings}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Review Settings</span>
          </Button>
        </div>
      </div>

      {/* 6 Key Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-[var(--spatial-text-title)] font-mono">
            {stats.total}
          </div>
          <p className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5">All Invitations</p>
        </div>

        {/* Sent */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-500 font-mono">
            {stats.sent}
          </div>
          <p className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5">Dispatched OK</p>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-500 font-mono">
            {stats.pending}
          </div>
          <p className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5">In Queue</p>
        </div>

        {/* Failed */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">Failed</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-500 font-mono">
            {stats.failed}
          </div>
          <p className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5">Needs Retry</p>
        </div>

        {/* Page Visits */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">Visits</span>
            <Eye className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400 font-mono">
            {stats.opened}
          </div>
          <p className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5">Page Opened</p>
        </div>

        {/* Google Redirects */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Redirects</span>
            <ExternalLink className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-indigo-400 font-mono">
            {stats.redirected}
          </div>
          <p className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5">To Google Page</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by customer name, phone, job number, device..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500/50"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="w-36">
              <SpatialSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'FAILED', label: 'Failed' },
                  { value: 'REVOKED', label: 'Revoked' },
                ]}
              />
            </div>

            <div className="w-36">
              <SpatialSelect
                value={ratingFilter}
                onChange={(val) => {
                  setRatingFilter(val);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Ratings' },
                  { value: '5', label: '⭐⭐⭐⭐⭐ (5)' },
                  { value: '4', label: '⭐⭐⭐⭐ (4)' },
                  { value: '3', label: '⭐⭐⭐ (3)' },
                  { value: '2', label: '⭐⭐ (2)' },
                  { value: '1', label: '⭐ (1)' },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Review Requests Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No review invitations found"
            description="When repair jobs are delivered and final invoices generated, invitations will automatically appear here."
            icon={Star}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Job #</th>
                  <th className="py-3 px-3">Device & Problem</th>
                  <th className="py-3 px-3 text-center">Channel</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Rating</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--spatial-border)] text-[12px]">
                {requests.map((req) => {
                  const statusColors = {
                    SENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    REVOKED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                  };

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--spatial-text-title)]">
                          {req.customer_name}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--spatial-text-muted)]">
                          {req.customer_phone}
                        </div>
                      </td>

                      {/* Job Number */}
                      <td className="py-3 px-3 font-mono font-bold text-sky-400">
                        #{req.job_number}
                      </td>

                      {/* Device & Issue */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-[var(--spatial-text-title)] truncate">
                          {req.device_brand} {req.device_model}
                        </div>
                        <div className="text-[11px] text-[var(--spatial-text-muted)] truncate">
                          {req.problem || 'Standard Service'}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          WHATSAPP
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            statusColors[req.invitation_status] || statusColors.PENDING
                          }`}
                        >
                          {req.invitation_status}
                        </span>
                        {req.google_redirected_at && (
                          <div className="text-[9px] font-semibold text-indigo-400 mt-0.5 flex items-center justify-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            <span>Redirected</span>
                          </div>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-3 text-center">
                        {req.rating ? (
                          <div className="inline-flex items-center gap-1 font-bold text-amber-400">
                            <span>{req.rating}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--spatial-text-muted)] italic">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-[11px] text-[var(--spatial-text-muted)] whitespace-nowrap">
                        {formatInvoiceDate(req.created_at)}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(req.unique_token, req.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy Public Review Link"
                          >
                            {copiedId === req.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Retry */}
                          {req.invitation_status !== 'REVOKED' && (
                            <button
                              type="button"
                              onClick={() => handleRetry(req.id)}
                              className="p-1.5 rounded-lg text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              title="Resend Invitation Message"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Revoke */}
                          {req.invitation_status !== 'REVOKED' && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(req.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Revoke Review Link"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Spatial Pagination */}
        {totalCount > pageSize && (
          <div className="p-4 border-t border-[var(--spatial-border)]">
            <SpatialPagination
              currentPage={page}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Google Review Assistant Configuration"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)]">
            <div>
              <p className="text-xs font-bold text-[var(--spatial-text-title)]">
                Automated Review Invitations
              </p>
              <p className="text-[11px] text-[var(--spatial-text-muted)]">
                Automatically invite customers when repair jobs are completed and invoiced
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settingsData.is_enabled}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, is_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Google Review URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)]">
              Official Google Review URL:
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                required
                value={settingsData.google_review_url}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, google_review_url: e.target.value })
                }
                placeholder="https://g.page/r/CX_tsygbzKLqEBM/review"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60"
              />
            </div>
            <p className="text-[10px] text-[var(--spatial-text-muted)]">
              The direct Google Maps or Business Profile review link where customers submit their reviews.
            </p>
          </div>

          {/* Invitation Channel */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)]">
              Dispatch Channel:
            </label>
            <SpatialSelect
              value={settingsData.invitation_channel || 'WHATSAPP'}
              onChange={(val) =>
                setSettingsData({ ...settingsData, invitation_channel: val })
              }
              options={[
                { value: 'WHATSAPP', label: 'WhatsApp Only' },
              ]}
            />
          </div>

          {/* AI Suggestions Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)]">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-[var(--spatial-text-title)]">
                  AI Review Assistant Suggestions
                </p>
                <p className="text-[11px] text-[var(--spatial-text-muted)]">
                  Provide customers with an AI button to draft personalized, honest review suggestions
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settingsData.ai_enabled}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, ai_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Backend AI Provider Hierarchy (Secure Display — No Keys Exposed) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Backend AI Engine Priority & Status</span>
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] text-sky-400 font-bold uppercase block">
                  Priority 1
                </span>
                <span className="font-semibold text-white">Google Gemini</span>
                <span className="text-[9px] text-emerald-400 block mt-0.5 font-bold">
                  ● Active
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">
                  Fallback 1
                </span>
                <span className="font-semibold text-white">Groq Cloud</span>
                <span className="text-[9px] text-emerald-400 block mt-0.5 font-bold">
                  ● Ready
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] text-indigo-400 font-bold uppercase block">
                  Fallback 2
                </span>
                <span className="font-semibold text-white">OpenRouter</span>
                <span className="text-[9px] text-emerald-400 block mt-0.5 font-bold">
                  ● Ready
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Provider credentials are kept securely on the backend server and never sent to clients.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--spatial-border)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingSettings}
              className="flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request Details Drawer/Modal */}
      {selectedRequest && (
        <Modal
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          title={`Review Details - Job #${selectedRequest.job_number}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {/* Customer & Job Meta */}
            <div className="p-3.5 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[var(--spatial-text-muted)] uppercase font-semibold">
                  Customer
                </span>
                <p className="font-bold text-[var(--spatial-text-title)]">
                  {selectedRequest.customer_name}
                </p>
                <p className="font-mono text-slate-400">{selectedRequest.customer_phone}</p>
              </div>

              <div>
                <span className="text-[10px] text-[var(--spatial-text-muted)] uppercase font-semibold">
                  Device
                </span>
                <p className="font-bold text-[var(--spatial-text-title)]">
                  {selectedRequest.device_brand} {selectedRequest.device_model}
                </p>
                <p className="text-slate-400 truncate">{selectedRequest.problem}</p>
              </div>
            </div>

            {/* Rating Section */}
            <div className="p-3.5 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-1">
              <span className="text-[10px] text-[var(--spatial-text-muted)] uppercase font-semibold">
                Customer Rating
              </span>
              <div className="flex items-center gap-2">
                {selectedRequest.rating ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= selectedRequest.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-amber-300">
                      ({selectedRequest.rating} / 5)
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500 italic">No rating submitted yet</span>
                )}
              </div>
            </div>

            {/* Customer Feedback */}
            {selectedRequest.customer_feedback && (
              <div className="p-3.5 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-1">
                <span className="text-[10px] text-[var(--spatial-text-muted)] uppercase font-semibold">
                  Customer Personal Feedback
                </span>
                <p className="text-slate-200 italic">"{selectedRequest.customer_feedback}"</p>
              </div>
            )}

            {/* Final Edited / Generated Review */}
            {(selectedRequest.edited_review || selectedRequest.generated_review) && (
              <div className="p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sky-400 uppercase font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Review Text Drafted ({selectedRequest.ai_provider || 'AI'}):
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await copyTextToClipboard(
                        selectedRequest.edited_review || selectedRequest.generated_review
                      );
                      toast.success('Review text copied!');
                    }}
                    className="text-[10px] text-sky-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-slate-200 leading-relaxed pt-1">
                  {selectedRequest.edited_review || selectedRequest.generated_review}
                </p>
              </div>
            )}

            {/* Status Timeline */}
            <div className="p-3.5 rounded-2xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Invitation Status:</span>
                <span className="font-bold text-white uppercase">
                  {selectedRequest.invitation_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Page Opened At:</span>
                <span className="font-mono text-slate-300">
                  {selectedRequest.review_page_opened_at
                    ? formatInvoiceDate(selectedRequest.review_page_opened_at)
                    : 'Not visited yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Google Redirected At:</span>
                <span className="font-mono text-indigo-300">
                  {selectedRequest.google_redirected_at
                    ? formatInvoiceDate(selectedRequest.google_redirected_at)
                    : 'Not redirected'}
                </span>
              </div>
              {selectedRequest.error_message && (
                <div className="flex justify-between text-rose-400 pt-1 border-t border-[var(--spatial-border)]">
                  <span>Error Note:</span>
                  <span>{selectedRequest.error_message}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  handleCopyLink(selectedRequest.unique_token, selectedRequest.id)
                }
                className="flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Review Link</span>
              </Button>

              <div className="flex items-center gap-2">
                {selectedRequest.invitation_status !== 'REVOKED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleRetry(selectedRequest.id);
                      setSelectedRequest(null);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Resend Invitation</span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
