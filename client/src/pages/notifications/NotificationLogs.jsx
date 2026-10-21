import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { notificationService } from '../../services/notificationService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { BulkActionBar } from '../../components/common/BulkActionBar';

export const NotificationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getLogs({
        channel: channelFilter,
        search: debouncedSearch,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      const logsList = Array.isArray(res) ? res : (res?.logs || []);
      const totalCount = res?.total ?? (logsList ? logsList.length : 0);

      setLogs(logsList);
      setTotal(totalCount);
    } catch (err) {
      toast.error('Failed to load notification logs');
    } finally {
      setLoading(false);
    }
  }, [channelFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (newChannel) => {
    setChannelFilter(newChannel);
    setPage(1);
    setSelectedIds([]);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
    setSelectedIds([]);
  };

  const handleResend = async (log) => {
    try {
      await notificationService.resend({
        jobId: log.job_id,
        channel: log.channel,
        type: log.message_type,
      });
      toast.success(`Notification re-queued for ${log.recipient}!`);
      fetchLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to resend notification');
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = logs.map((l) => l.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIdSet = new Set(logs.map((l) => l.id));
      setSelectedIds(selectedIds.filter((id) => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllCurrentPageSelected =
    logs.length > 0 && logs.every((l) => selectedIds.includes(l.id));

  // Single delete
  const handleDeleteLog = async (log) => {
    const result = await Swal.fire({
      title: 'Delete Notification Log?',
      text: `Remove audit entry for ${log.channel} dispatch to "${log.recipient}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      background: 'var(--spatial-card-bg, #0f172a)',
      color: 'var(--spatial-text-title, #f8fafc)',
    });

    if (result.isConfirmed) {
      try {
        await notificationService.deleteNotification(log.id);
        toast.success('Notification log removed');
        setSelectedIds((prev) => prev.filter((id) => id !== log.id));
        fetchLogs();
      } catch (err) {
        toast.error(err.message || 'Failed to delete notification log');
      }
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} Notification Logs?`,
      text: 'This will permanently remove the selected dispatch audit entries from your database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Delete ${selectedIds.length} Logs`,
      cancelButtonText: 'Cancel',
      background: 'var(--spatial-card-bg, #0f172a)',
      color: 'var(--spatial-text-title, #f8fafc)',
    });

    if (result.isConfirmed) {
      try {
        setIsBulkDeleting(true);
        const res = await notificationService.bulkDeleteNotifications(selectedIds);
        toast.success(res.message || `Deleted ${selectedIds.length} logs`);
        setSelectedIds([]);
        fetchLogs();
      } catch (err) {
        toast.error(err.message || 'Failed to delete selected logs');
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const getChannelIcon = (ch) => {
    switch (ch) {
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      case 'WHATSAPP':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'SMS':
        return <Smartphone className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--spatial-text-title)] tracking-tight">
            Notification Logs & Dispatch
          </h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Audit trail of customer automated messages sent via Email, WhatsApp, and SMS
          </p>
        </div>
        <Button variant="outline" icon={RotateCcw} size="sm" onClick={fetchLogs} loading={loading}>
          Refresh Logs
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="spatial-card p-3 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-card-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search recipient or message type (500ms debounce)..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-[var(--spatial-card-subtle)] border border-[var(--spatial-border)] rounded-lg text-[var(--spatial-text-body)] focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                setSelectedIds([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={channelFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-[var(--spatial-card-subtle)] border border-[var(--spatial-border)] rounded-lg text-xs font-semibold text-[var(--spatial-text-body)] focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Channels</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title={`Dispatch History (${total})`}
        subtitle="Real-time log of customer notifications and transmission receipts"
        bodyClassName="p-0"
      >
        {loading && logs.length === 0 ? (
          <LoadingSpinner label="Fetching dispatch logs..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notification logs found"
            description="When jobs are created, estimates sent, or devices marked ready for pickup, automated notifications will log here."
          />
        ) : (
          <div>
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-[var(--spatial-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleSelectAll}
                        className="rounded border-[var(--spatial-border)] text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Channel</th>
                    <th className="px-5 py-3 whitespace-nowrap">Event / Message Type</th>
                    <th className="px-5 py-3 whitespace-nowrap">Recipient</th>
                    <th className="px-5 py-3 whitespace-nowrap">Provider</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 whitespace-nowrap">Sent At</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {logs.map((log) => {
                    const isSelected = selectedIds.includes(log.id);
                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-sky-500/10'
                            : 'hover:bg-[var(--spatial-card-subtle)]'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(log.id)}
                            className="rounded border-[var(--spatial-border)] text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-[var(--spatial-text-title)] whitespace-nowrap">
                            {getChannelIcon(log.channel)}
                            <span>{log.channel}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[var(--spatial-text-title)] font-medium whitespace-nowrap">
                          {log.message_type}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[var(--spatial-text-body)] whitespace-nowrap">
                          {log.recipient}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] font-semibold whitespace-nowrap">
                          {log.provider === 'BAILEYS' ? 'WHATSAPP' : log.provider === 'BREVO' ? 'EMAIL' : log.provider === 'MSG91' ? 'SMS' : (log.provider || log.channel || 'SYSTEM')}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                              log.status === 'SENT'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-400/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {log.job_id && (
                              <button
                                type="button"
                                onClick={() => handleResend(log)}
                                className="px-2 py-1 bg-[var(--spatial-card-subtle)] hover:bg-sky-500/20 text-sky-400 font-medium rounded text-[11px] transition-colors border border-[var(--spatial-border)]"
                                title="Resend message"
                              >
                                Resend
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log)}
                              className="p-1 text-[var(--spatial-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Delete Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Spatial Pagination */}
            <SpatialPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={[10, 15, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        isDeleting={isBulkDeleting}
        itemLabel="notification log"
      />
    </div>
  );
};
export default NotificationLogs;
