import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationService } from '../../services/notificationService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const NotificationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getLogs({ limit: 150 });
      setLogs(res || []);
    } catch (err) {
      toast.error('Failed to load notification logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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

  const filteredLogs = logs.filter((l) => {
    const matchesChannel = channelFilter === 'ALL' || l.channel === channelFilter;
    const matchesSearch =
      !search ||
      l.recipient.toLowerCase().includes(search.toLowerCase()) ||
      l.message_type.toLowerCase().includes(search.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const getChannelIcon = (ch) => {
    switch (ch) {
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-sky-600" />;
      case 'WHATSAPP':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case 'SMS':
        return <Smartphone className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Notification Logs & Dispatch</h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit trail of customer automated messages sent via Brevo (Email), OpenWA (WhatsApp), and MSG91 (SMS)
          </p>
        </div>
        <Button variant="outline" icon={RotateCcw} size="sm" onClick={fetchLogs}>
          Refresh Logs
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient or message type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Channels</option>
            <option value="EMAIL">Email (Brevo)</option>
            <option value="WHATSAPP">WhatsApp (OpenWA)</option>
            <option value="SMS">SMS (MSG91)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card title={`Dispatch History (${filteredLogs.length})`} bodyClassName="p-0">
        {loading ? (
          <LoadingSpinner label="Fetching dispatch logs..." />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notification logs found"
            description="When jobs are created, estimates sent, or devices marked ready for pickup, automated notifications will log here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Event / Message Type</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Sent At</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        {getChannelIcon(log.channel)}
                        <span>{log.channel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-800 font-medium">
                      {log.message_type}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">
                      {log.recipient}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-semibold">
                      {log.provider || 'DEFAULT'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {log.job_id && (
                        <button
                          onClick={() => handleResend(log)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] transition-colors"
                          title="Resend message"
                        >
                          Resend
                        </button>
                      )}
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
