import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Cloud,
  ShieldCheck,
  Clock,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  HardDrive,
  Info,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { backupService } from '../../services/backupService';
import { Card, LoadingSpinner, EmptyState } from '../common/Card';
import { Button } from '../common/Button';

export const BackupManagementTab = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [isTriggering, setIsTriggering] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const pollIntervalRef = useRef(null);

  const fetchStatusAndHistory = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        backupService.getBackupStatus(),
        backupService.getBackupHistory({ limit: 15 }),
      ]);
      setStatus(statusRes || null);
      setHistory(historyRes?.backups || []);
      setTotal(historyRes?.total || 0);
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.message || err.message || 'Failed to load backup status');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndHistory();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Poll status while a job is running
  useEffect(() => {
    if (status?.isRunning) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const currentStatus = await backupService.getBackupStatus();
            setStatus(currentStatus || null);
            if (!currentStatus?.isRunning) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              fetchStatusAndHistory(true);
              if (currentStatus?.latestBackup?.status === 'COMPLETED') {
                toast.success('Database backup completed and uploaded to Google Drive!');
              } else if (currentStatus?.latestBackup?.status === 'FAILED') {
                toast.error(`Backup failed: ${currentStatus?.latestBackup?.error_message || 'Unknown error'}`);
              }
            }
          } catch (_) {}
        }, 3000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [status?.isRunning]);

  const handleTriggerBackup = () => {
    if (status?.isRunning) {
      toast.error('A backup is already currently running.');
      return;
    }

    Swal.fire({
      title: 'Start Database Backup?',
      text: 'A full logical dump of your Supabase database will be created, encrypted with AES-256-GCM, and uploaded to your Google Drive backup folder.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Start Backup',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
      },
      buttonsStyling: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setIsTriggering(true);
          const res = await backupService.triggerBackup();
          toast.success(res?.message || 'Backup initiated in background');
          setStatus((prev) => ({ ...prev, isRunning: true }));
          fetchStatusAndHistory(true);
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || 'Failed to start backup');
        } finally {
          setIsTriggering(false);
        }
      }
    });
  };

  const copyRestoreCommand = () => {
    navigator.clipboard.writeText('node server/src/scripts/restoreBackup.js');
    setCopiedCommand(true);
    toast.success('Recovery command copied to clipboard');
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  if (loading && !status) {
    return <LoadingSpinner label="Loading database backup configuration..." />;
  }

  const isRunning = status?.isRunning;
  const latest = status?.latestBackup;

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (ms) => {
    if (!ms || isNaN(ms)) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Status & Quick Action (Theme Adaptive) */}
      <div className="p-5 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-[var(--spatial-border-hover)] transition-all">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-sky-500 dark:text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[var(--spatial-text-title)]">
                Automated Database Backups
              </h2>
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Backup in Progress...
                </span>
              ) : latest?.status === 'COMPLETED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Protected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-[var(--spatial-text-muted)] border border-[var(--spatial-border)]">
                  Idle
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
              Encrypted with AES-256-GCM and securely stored in your personal Google Drive folder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchStatusAndHistory(false)}
            disabled={loading || isTriggering}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerBackup}
            disabled={isRunning || isTriggering}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-950/20"
          >
            {isRunning || isTriggering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Backup...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Trigger Backup Now</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid: 3 Summary Cards (Crisp High-Contrast Theme Adaptive) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Encryption & Security */}
        <div className="p-4 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm space-y-2 hover:border-[var(--spatial-border-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Encryption
            </span>
            {status?.hasEncryptionKey ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                AES-256-GCM
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                Missing Key
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
            Authenticated Cipher
          </p>
          <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
            Encrypted before leaving server. Plaintext dumps are never uploaded or stored in the cloud.
          </p>
        </div>

        {/* Card 2: Google Drive Destination */}
        <div className="p-4 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm space-y-2 hover:border-[var(--spatial-border-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              Google Drive
            </span>
            {status?.hasGoogleDrive ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                Connected
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Setup Required
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
            Personal Google Drive
          </p>
          <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
            Backups upload to dedicated private folder. Retention prunes archives older than {status?.retentionDays || 30} days.
          </p>
        </div>

        {/* Card 3: Automation & Render Schedule */}
        <div className="p-4 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm space-y-2 hover:border-[var(--spatial-border-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Daily Schedule
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-mono">
              {status?.schedule || '0 2 * * *'}
            </span>
          </div>
          <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
            2:00 AM UTC Daily
          </p>
          <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
            Runs via Render Cron Job independently of web service sleep cycles on free tier.
          </p>
        </div>
      </div>

      {/* Latest Backup Details */}
      {latest && (
        <Card
          title="Latest Backup Record"
          subtitle={latest.completed_at ? `Completed ${new Date(latest.completed_at).toLocaleString()}` : `Started ${new Date(latest.started_at).toLocaleString()}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="min-w-0">
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">Filename</span>
              <span className="font-mono text-[var(--spatial-text-title)] font-semibold text-xs block truncate" title={latest.filename || latest.file_name}>
                {latest.filename || latest.file_name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">Archive Size</span>
              <span className="text-[var(--spatial-text-title)] font-semibold">
                {formatBytes(latest.file_size_bytes)}
              </span>
            </div>
            <div>
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">Duration</span>
              <span className="text-[var(--spatial-text-title)] font-semibold">
                {formatDuration(latest.duration_ms)}
              </span>
            </div>
            <div>
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">Status</span>
              {latest.status === 'COMPLETED' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Success
                </span>
              ) : latest.status === 'RUNNING' ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold" title={latest.error_message}>
                  <XCircle className="w-3.5 h-3.5" /> Failed
                </span>
              )}
            </div>
          </div>
          {latest.error_message && (
            <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300">
              <span className="font-bold">Error:</span> {latest.error_message}
            </div>
          )}
        </Card>
      )}

      {/* Backup History Table */}
      <Card
        title="Backup History"
        subtitle={`Displaying last ${history.length} backup executions.`}
      >
        {history.length === 0 ? (
          <EmptyState
            title="No Backups Recorded"
            description="Trigger your first manual backup or wait for the scheduled daily backup run."
            action={
              <Button size="sm" variant="primary" onClick={handleTriggerBackup}>
                Start First Backup
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--spatial-table-header-bg)] text-[var(--spatial-text-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--spatial-border)]">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">Date & Time</th>
                  <th className="py-3 px-3.5 font-semibold">Type</th>
                  <th className="py-3 px-3.5 font-semibold">Status</th>
                  <th className="py-3 px-3.5 font-semibold">Filename</th>
                  <th className="py-3 px-3.5 font-semibold">Size</th>
                  <th className="py-3 px-3.5 font-semibold">Duration</th>
                  <th className="py-3 px-3.5 font-semibold">Google Drive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {history.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--spatial-table-row-hover)] transition-colors">
                    <td className="py-3 px-3.5 font-medium text-[var(--spatial-text-title)] whitespace-nowrap">
                      {new Date(b.started_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)]">
                        {b.backup_type || b.type}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      {b.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : b.status === 'RUNNING' ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]" title={b.error_message}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-[var(--spatial-text-title)] max-w-[220px]" title={b.filename || b.file_name}>
                      <span className="block truncate">{b.filename || b.file_name || '—'}</span>
                    </td>
                    <td className="py-3 px-3.5 text-[var(--spatial-text-muted)] font-mono whitespace-nowrap">
                      {formatBytes(b.file_size_bytes)}
                    </td>
                    <td className="py-3 px-3.5 text-[var(--spatial-text-muted)] font-mono whitespace-nowrap">
                      {formatDuration(b.duration_ms)}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                      {b.drive_file_id ? (
                        <a
                          href={`https://drive.google.com/file/d/${b.drive_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 font-medium hover:underline transition-colors"
                          title="Open backup in Google Drive"
                        >
                          <span>{b.drive_file_id.slice(0, 10)}...</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-[var(--spatial-text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Disaster Recovery Guide Note (High Contrast & User Friendly) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-sky-500 dark:text-sky-400" />
        </div>
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-[var(--spatial-text-title)] text-xs">
              Safe Database Restoration & Disaster Recovery:
            </span>
            <button
              type="button"
              onClick={copyRestoreCommand}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)] hover:bg-[var(--spatial-bg-card-hover)] transition-all cursor-pointer"
            >
              {copiedCommand ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--spatial-text-muted)] leading-relaxed">
            To restore a backup safely without risking unintentional production overwrites, run the dedicated CLI restoration workflow on your terminal:
          </p>
          <div className="p-2.5 rounded-xl bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-sky-600 dark:text-sky-300 font-semibold select-all break-all">
              node server/src/scripts/restoreBackup.js
            </code>
          </div>
          <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
            The CLI workflow verifies archive integrity, inspects SQL contents, takes a pre-restore safety snapshot of the target database, and requires typing <span className="font-mono font-semibold text-sky-500">RESTORE_CONFIRMED</span> before executing.
          </p>
        </div>
      </div>
    </div>
  );
};
