import React, { useState, useEffect, useRef } from "react";
import {
  Database,
  Cloud,
  ShieldCheck,
  Clock,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  UploadCloud,
  FileArchive,
  RotateCcw,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { backupService } from "../../services/backupService";
import { copyTextToClipboard } from "../../utils/clipboard";
import { Card, EmptyState, CardSkeleton } from "../common/Card";
import { Button } from "../common/Button";
import { SpatialPagination } from "../common/SpatialPagination";
import { useSelector } from "react-redux";

export const BackupManagementTab = () => {
  const { user } = useSelector((state) => state.auth);
  const isDeveloper = user?.role_id === "developer";
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  // Backup history pagination (server-side via limit/offset)
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  // Refs let polling/action refreshes always load the page the user is viewing
  const historyPagingRef = useRef({ page: 1, pageSize: 10 });
  historyPagingRef.current = { page: historyPage, pageSize: historyPageSize };
  const historyRequestIdRef = useRef(0);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const pollIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Optional decryption key to use when restoring legacy .enc files
  const [restoreDecryptionKey, setRestoreDecryptionKey] = useState("");
  const [showRestoreKey, setShowRestoreKey] = useState(false);

  const fetchStatusAndHistory = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { page: hPage, pageSize: hSize } = historyPagingRef.current;
      const requestId = ++historyRequestIdRef.current;
      const [statusRes, historyRes] = await Promise.all([
        backupService.getBackupStatus(),
        backupService.getBackupHistory({ limit: hSize, offset: (hPage - 1) * hSize }),
      ]);
      setStatus(statusRes || null);
      if (requestId !== historyRequestIdRef.current) return;
      const rows = historyRes?.backups || [];
      const totalRows = historyRes?.total || 0;
      // Page emptied (e.g. after deleting its last backup) → go to the last valid page
      if (rows.length === 0 && hPage > 1 && totalRows > 0) {
        setHistoryPage(Math.max(1, Math.ceil(totalRows / hSize)));
        return;
      }
      setHistory(rows);
      setTotal(totalRows);
    } catch (err) {
      if (!silent) {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Failed to load backup status",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Page / page-size change → load that page quietly (first load handled below)
  const historyPagingMountedRef = useRef(false);
  useEffect(() => {
    if (!historyPagingMountedRef.current) {
      historyPagingMountedRef.current = true;
      return;
    }
    setSelectedIds([]);
    fetchStatusAndHistory(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, historyPageSize]);

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
              if (currentStatus?.latestBackup?.status === "COMPLETED") {
                toast.success(
                  "Database backup completed and uploaded to Google Drive!",
                );
              } else if (currentStatus?.latestBackup?.status === "FAILED") {
                toast.error(
                  `Backup failed: ${currentStatus?.latestBackup?.error_message || "Unknown error"}`,
                );
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
      toast.error("A backup is already currently running.");
      return;
    }

    Swal.fire({
      title: "Start Database Backup?",
      text: "A full logical SQL dump (.sql) of your Supabase database will be created and uploaded to your Google Drive backup folder.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Start Backup",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "swal2-popup",
        title: "swal2-title",
        htmlContainer: "swal2-html-container",
        confirmButton: "swal2-confirm",
        cancelButton: "swal2-cancel",
      },
      buttonsStyling: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setIsTriggering(true);
          const res = await backupService.triggerBackup();
          toast.success(res?.message || "Backup initiated in background");
          setStatus((prev) => ({ ...prev, isRunning: true }));
          fetchStatusAndHistory(true);
        } catch (err) {
          toast.error(
            err.response?.data?.message ||
              err.message ||
              "Failed to start backup",
          );
        } finally {
          setIsTriggering(false);
        }
      }
    });
  };


  const copyRestoreCommand = async () => {
    await copyTextToClipboard("node server/src/scripts/restoreBackup.js");
    setCopiedCommand(true);
    toast.success("Recovery command copied to clipboard");
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (ms) => {
    if (!ms || isNaN(ms)) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".sql") && !lower.endsWith(".enc")) {
      toast.error(
        "Invalid file type. Please upload a .sql backup or legacy .enc file.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
    toast.success(`Selected backup: ${file.name} (${formatBytes(file.size)})`);
  };

  const handleRestoreUploadedFile = async () => {
    if (!selectedFile) {
      toast.error("Please select a .sql or .enc backup file to restore.");
      return;
    }

    const isLegacyEnc = selectedFile.name.toLowerCase().endsWith(".enc");
    if (isLegacyEnc && !restoreDecryptionKey.trim()) {
      toast.error("Decryption key is required to restore legacy .enc backup files.");
      return;
    }

    const { value: confirmationPhrase } = await Swal.fire({
      title: "🚨 Confirm Database Restore",
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
          <p style="margin-bottom: 8px;">
            You are about to restore the database from uploaded file:
          </p>
          <div style="background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 8px; padding: 10px; margin-bottom: 12px; font-family: monospace; font-size: 12px; color: #38bdf8;">
            📦 ${selectedFile.name} (${formatBytes(selectedFile.size)})
          </div>
          <p style="margin-bottom: 8px; color: #f59e0b; font-weight: 600;">
            ⚠️ Restoring replaces database tables, repair records, and assets with the contents of this archive.
          </p>
          <p style="margin-bottom: 8px; color: #10b981; font-weight: 500;">
            🛡️ A pre-restore safety snapshot will be taken before restoring.
          </p>
          <p style="margin-top: 12px; font-weight: 600; color: var(--spatial-text-title, #f8fafc);">
            To confirm this restore operation, type <code style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px;">RESTORE_CONFIRMED</code> below:
          </p>
        </div>
      `,
      input: "text",
      inputPlaceholder: "Type RESTORE_CONFIRMED to proceed",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Restore Database",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f59e0b",
      customClass: {
        popup: "swal2-popup",
        title: "swal2-title text-amber-500",
        htmlContainer: "swal2-html-container",
        confirmButton:
          "swal2-confirm bg-amber-600 hover:bg-amber-700 text-white",
        cancelButton: "swal2-cancel",
        input: "swal2-input",
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value || value.trim() !== "RESTORE_CONFIRMED") {
          return 'You must type exactly "RESTORE_CONFIRMED" to confirm.';
        }
      },
    });

    if (confirmationPhrase === "RESTORE_CONFIRMED") {
      try {
        setIsRestoring(true);
        toast.loading(
          "Uploading and restoring database... Please keep this page open.",
          { id: "restore-db" },
        );

        const res = await backupService.restoreFromUpload(
          selectedFile,
          "RESTORE_CONFIRMED",
          undefined,
          restoreDecryptionKey.trim(),
        );

        toast.dismiss("restore-db");
        const restoredData = res?.data || res;

        await Swal.fire({
          title: "🎉 Restore Successful!",
          html: `
            <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
              <p style="margin-bottom: 10px; color: #10b981; font-weight: 600;">
                Database has been restored successfully!
              </p>
              <ul style="margin-left: 18px; margin-bottom: 8px; list-style-type: disc;">
                <li><strong>Tables Restored:</strong> ${restoredData?.tablesRestored?.length || "All 25"} tables</li>
                <li><strong>Total Records:</strong> ${restoredData?.recordCount || "—"} records</li>
                <li><strong>Media & Logos:</strong> ${restoredData?.assetsRestored || 0} file(s) restored</li>
                <li><strong>Method Used:</strong> ${restoredData?.method || "Supabase API"}</li>
              </ul>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Done",
          customClass: {
            popup: "swal2-popup",
            title: "swal2-title",
            htmlContainer: "swal2-html-container",
            confirmButton: "swal2-confirm",
          },
          buttonsStyling: false,
        });

        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchStatusAndHistory(true);
      } catch (err) {
        toast.dismiss("restore-db");
        console.error("Restore error:", err);
        const errMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to restore database.";
        Swal.fire({
          title: "❌ Restore Failed",
          text: errMsg,
          icon: "error",
          confirmButtonText: "Close",
          customClass: {
            popup: "swal2-popup",
            title: "swal2-title",
            htmlContainer: "swal2-html-container",
            confirmButton: "swal2-confirm",
          },
          buttonsStyling: false,
        });
      } finally {
        setIsRestoring(false);
      }
    }
  };

  const handleRestoreFromHistory = async (backupItem) => {
    const driveId = backupItem.drive_file_id || backupItem.drive_file_id_2;
    if (!driveId) {
      toast.error("This backup does not have a Google Drive file ID.");
      return;
    }

    const { value: confirmationPhrase } = await Swal.fire({
      title: "🚨 Restore from Google Drive?",
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
          <p style="margin-bottom: 8px;">
            You are about to restore from Google Drive backup:
          </p>
          <div style="background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 8px; padding: 10px; margin-bottom: 12px; font-family: monospace; font-size: 12px; color: #38bdf8;">
            📦 ${backupItem.filename || backupItem.file_name} (${formatBytes(backupItem.file_size_bytes)})
          </div>
          <p style="margin-bottom: 8px; color: #f59e0b; font-weight: 600;">
            ⚠️ Restoring replaces database tables, repair records, and assets with this backup's contents.
          </p>
          <p style="margin-bottom: 8px; color: #10b981; font-weight: 500;">
            🛡️ A safety pre-restore backup will be taken before restoring.
          </p>
          <p style="margin-top: 12px; font-weight: 600; color: var(--spatial-text-title, #f8fafc);">
            To confirm this restore operation, type <code style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px;">RESTORE_CONFIRMED</code> below:
          </p>
        </div>
      `,
      input: "text",
      inputPlaceholder: "Type RESTORE_CONFIRMED to proceed",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Restore Database",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f59e0b",
      customClass: {
        popup: "swal2-popup",
        title: "swal2-title text-amber-500",
        htmlContainer: "swal2-html-container",
        confirmButton:
          "swal2-confirm bg-amber-600 hover:bg-amber-700 text-white",
        cancelButton: "swal2-cancel",
        input: "swal2-input",
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value || value.trim() !== "RESTORE_CONFIRMED") {
          return 'You must type exactly "RESTORE_CONFIRMED" to confirm.';
        }
      },
    });

    if (confirmationPhrase === "RESTORE_CONFIRMED") {
      try {
        setIsRestoring(true);
        toast.loading(
          "Downloading and restoring backup from Google Drive... Please wait.",
          { id: "restore-db" },
        );

        const res = await backupService.restoreBackup({
          drive_file_id: driveId,
          confirmation_phrase: "RESTORE_CONFIRMED",
          decryption_key: restoreDecryptionKey.trim() || undefined,
        });

        toast.dismiss("restore-db");
        const restoredData = res?.data || res;

        await Swal.fire({
          title: "🎉 Restore Successful!",
          html: `
            <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
              <p style="margin-bottom: 10px; color: #10b981; font-weight: 600;">
                Database has been restored successfully!
              </p>
              <ul style="margin-left: 18px; margin-bottom: 8px; list-style-type: disc;">
                <li><strong>Tables Restored:</strong> ${restoredData?.tablesRestored?.length || "All 25"} tables</li>
                <li><strong>Total Records:</strong> ${restoredData?.recordCount || "—"} records</li>
                <li><strong>Media & Logos:</strong> ${restoredData?.assetsRestored || 0} file(s) restored</li>
                <li><strong>Method Used:</strong> ${restoredData?.method || "Supabase API"}</li>
              </ul>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Done",
          customClass: {
            popup: "swal2-popup",
            title: "swal2-title",
            htmlContainer: "swal2-html-container",
            confirmButton: "swal2-confirm",
          },
          buttonsStyling: false,
        });

        await fetchStatusAndHistory(true);
      } catch (err) {
        toast.dismiss("restore-db");
        console.error("Restore error:", err);
        Swal.fire({
          title: "❌ Restore Failed",
          text:
            err.response?.data?.message ||
            err.message ||
            "Failed to restore from Google Drive.",
          icon: "error",
          confirmButtonText: "Close",
          customClass: {
            popup: "swal2-popup",
            title: "swal2-title",
            htmlContainer: "swal2-html-container",
            confirmButton: "swal2-confirm",
          },
          buttonsStyling: false,
        });
      } finally {
        setIsRestoring(false);
      }
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (history.length > 0 && selectedIds.length === history.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map((b) => b.id));
    }
  };

  const handleDeleteSingle = async (backupItem) => {
    const filename =
      backupItem.filename || backupItem.file_name || "this backup";
    const isDriveBackup = Boolean(
      backupItem.drive_file_id || backupItem.drive_file_id_2,
    );

    const result = await Swal.fire({
      title: "Delete Backup?",
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
          <p style="margin-bottom: 8px;">Are you sure you want to permanently delete:</p>
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 10px; margin-bottom: 12px; font-family: monospace; font-size: 12px; color: #f87171;">
            📦 ${filename}
          </div>
          <p style="color: #ef4444; font-size: 12px;">
            ⚠️ This will remove the backup log record and delete the archive file from ${isDriveBackup ? "Google Drive and local storage" : "local storage"}.
          </p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
      customClass: {
        popup: "swal2-popup",
        title: "swal2-title text-rose-500",
        htmlContainer: "swal2-html-container",
        confirmButton: "swal2-confirm bg-rose-600 hover:bg-rose-700 text-white",
        cancelButton: "swal2-cancel",
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      try {
        setIsDeleting(true);
        await backupService.deleteBackup(backupItem.id);
        toast.success(`Deleted backup "${filename}"`);
        setSelectedIds((prev) => prev.filter((id) => id !== backupItem.id));
        await fetchStatusAndHistory(true);
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Failed to delete backup",
        );
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} Backup(s)?`,
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
          <p style="margin-bottom: 8px;">
            You have selected <strong>${selectedIds.length}</strong> backup record(s).
          </p>
          <p style="color: #ef4444; font-size: 12px;">
            ⚠️ This will permanently remove the selected records and their associated archive files from Google Drive and storage.
          </p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, Delete ${selectedIds.length} Backups`,
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
      customClass: {
        popup: "swal2-popup",
        title: "swal2-title text-rose-500",
        htmlContainer: "swal2-html-container",
        confirmButton: "swal2-confirm bg-rose-600 hover:bg-rose-700 text-white",
        cancelButton: "swal2-cancel",
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      try {
        setIsDeleting(true);
        toast.loading(`Deleting ${selectedIds.length} backup(s)...`, {
          id: "bulk-del",
        });
        const res = await backupService.bulkDeleteBackups(selectedIds);
        toast.dismiss("bulk-del");
        toast.success(
          res?.message ||
            `Successfully deleted ${selectedIds.length} backup(s)`,
        );
        setSelectedIds([]);
        await fetchStatusAndHistory(true);
      } catch (err) {
        toast.dismiss("bulk-del");
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Failed to delete selected backups",
        );
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleCancelRunningJob = async () => {
    const result = await Swal.fire({
      title: "Reset / Unstick Backup Job?",
      text: 'If a backup job was interrupted or got stuck in "In Progress" status, this will reset its status to FAILED and immediately allow new backups.',
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset Status",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "swal2-popup",
        title: "swal2-title",
        confirmButton:
          "swal2-confirm bg-amber-600 hover:bg-amber-700 text-white",
        cancelButton: "swal2-cancel",
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      try {
        await backupService.cancelRunningJob();
        toast.success("Running backup status has been reset.");
        await fetchStatusAndHistory(false);
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Failed to reset backup job",
        );
      }
    }
  };

  const handleDownloadBackup = async (filename) => {
    if (!filename) return;
    try {
      toast.loading(`Downloading ${filename}...`, { id: "download-backup" });
      await backupService.downloadBackup(filename);
      toast.success("Download started", { id: "download-backup" });
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to download backup",
        { id: "download-backup" },
      );
    }
  };

  const handleConnectGoogleDrive = async (account = 1) => {
    try {
      const isSecond = Number(account) === 2;
      const accountLabel = isSecond
        ? "Secondary Google Drive (Account 2)"
        : "Primary Google Drive (Account 1)";
      const res = await backupService.getGoogleAuthUrl(account);
      const authUrl =
        res?.authUrl || res?.url || res?.data?.url || res?.data?.authUrl;
      if (!authUrl) {
        toast.error(
          `Failed to generate Google Drive authorization URL for ${accountLabel}`,
        );
        return;
      }

      window.open(authUrl, "_blank", "noopener,noreferrer");

      const { value: authCode } = await Swal.fire({
        title: `Connect ${accountLabel}`,
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
            <p style="margin-bottom: 8px;">A Google authorization window has opened in a new tab.</p>
            <ol style="margin-left: 18px; margin-bottom: 12px; list-style-type: decimal;">
              <li>Sign in with your ${isSecond ? "second Google account" : "Google account"} and grant Drive access.</li>
              <li>Copy the <strong>authorization code</strong> shown on Google's page (or from the URL query <code>code=...</code>).</li>
              <li>Paste the code below to complete authorization:</li>
            </ol>
          </div>
        `,
        input: "text",
        inputPlaceholder: "Paste Google Authorization Code here (4/0A...)",
        showCancelButton: true,
        confirmButtonText: "Connect Drive",
        cancelButtonText: "Cancel",
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return "Please paste the authorization code provided by Google.";
          }
        },
        customClass: {
          popup: "swal2-popup",
          title: "swal2-title",
          htmlContainer: "swal2-html-container",
          confirmButton: "swal2-confirm",
          cancelButton: "swal2-cancel",
          input: "swal2-input",
        },
        buttonsStyling: false,
      });

      if (authCode) {
        toast.loading(`Connecting ${accountLabel}...`, {
          id: "gdrive-connect",
        });
        const exchangeRes = await backupService.exchangeGoogleAuthCode(
          authCode.trim(),
          account,
        );
        const connectedEmail = exchangeRes?.email || exchangeRes?.data?.email;
        toast.success(
          connectedEmail
            ? `${accountLabel} (${connectedEmail}) connected successfully! Future backups will sync automatically.`
            : `${accountLabel} connected successfully! Future backups will sync automatically.`,
          { id: "gdrive-connect" },
        );
        fetchStatusAndHistory(true);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to authorize Google Drive",
        { id: "gdrive-connect" },
      );
    }
  };

  const handleWipeAllData = async () => {
    const { value: formValues } = await Swal.fire({
      title: "🚨 Danger: Wipe All Data?",
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: var(--spatial-text-muted, #94a3b8);">
          <p style="margin-bottom: 8px; color: #ef4444; font-weight: 700;">
            ⚠️ This will permanently delete all:
          </p>
          <ul style="margin-left: 18px; margin-bottom: 12px; list-style-type: disc;">
            <li>All repair jobs & diagnostic test histories</li>
            <li>All invoices, sales, and payment records</li>
            <li>All customer records and registered devices</li>
            <li>Parts stock movements & inventory records</li>
            <li>Vendor transactions & notification logs</li>
          </ul>
          <p style="margin-bottom: 8px; color: #10b981; font-weight: 600;">
            🛡️ Your Admin login account, shop profile, and logos will be safely preserved.
          </p>
          <p style="margin-top: 12px; font-weight: 600; color: var(--spatial-text-title, #f8fafc);">
            To confirm this destructive action, type <code style="background: rgba(239,68,68,0.15); color: #f87171; padding: 2px 6px; border-radius: 4px;">WIPE_ALL_DATA</code> below:
          </p>
        </div>
      `,
      input: "text",
      inputPlaceholder: "Type WIPE_ALL_DATA to confirm",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Wipe All Data",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
      customClass: {
        popup: "swal2-popup",
        title: "swal2-title text-rose-500",
        htmlContainer: "swal2-html-container",
        confirmButton: "swal2-confirm bg-rose-600 hover:bg-rose-700 text-white",
        cancelButton: "swal2-cancel",
        input: "swal2-input",
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value || value.trim() !== "WIPE_ALL_DATA") {
          return 'You must type exactly "WIPE_ALL_DATA" to confirm.';
        }
      },
    });

    if (formValues === "WIPE_ALL_DATA") {
      try {
        setIsWiping(true);
        const res = await backupService.wipeAllData({
          confirmationPhrase: "WIPE_ALL_DATA",
          takeSafetyBackup: true,
        });

        toast.success(
          res.message || "All transactional data wiped successfully!",
        );
        await fetchStatusAndHistory(true);
      } catch (err) {
        console.error("Wipe data error:", err);
        toast.error(
          err.response?.data?.message || err.message || "Failed to wipe data.",
        );
      } finally {
        setIsWiping(false);
      }
    }
  };

  if (loading && !status) {
    return <CardSkeleton rows={4} />;
  }

  const isRunning = status?.isRunning;
  const latest = status?.latestBackup;

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
              ) : latest?.status === "COMPLETED" ? (
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
              Automated unencrypted SQL backups synced securely to your personal
              Google Drive folder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isRunning && (
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={handleCancelRunningJob}
              className="bg-rose-600 hover:bg-rose-700 text-white border-none shadow-sm text-xs"
              title="Reset stuck backup status so you can trigger a backup again"
            >
              Reset Stuck Job
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchStatusAndHistory(false)}
            disabled={loading || isTriggering}
            loading={loading}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Play}
            onClick={handleTriggerBackup}
            disabled={isRunning || isTriggering}
            loading={isRunning || isTriggering}
            loadingText="Running Backup..."
            className="bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-950/20"
          >
            Trigger Backup Now
          </Button>
        </div>
      </div>

      {/* Alert Banner if Google Drive Token Expired (Account 1) */}
      {status?.googleDriveStatus === "EXPIRED" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                Primary Google Drive (Account 1) Token Expired
              </p>
              <p className="text-[var(--spatial-text-muted)] text-[11px] mt-0.5 leading-relaxed">
                Google expired your Account 1 OAuth refresh token. Local backups
                are safely preserved on your server. Click Reconnect to re-link
                Account 1.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => handleConnectGoogleDrive(1)}
            className="shrink-0 bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 text-xs"
          >
            Reconnect Account 1
          </Button>
        </div>
      )}

      {/* Alert Banner if Google Drive Token Expired (Account 2) */}
      {status?.googleDriveStatus2 === "EXPIRED" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                Secondary Google Drive (Account 2) Token Expired
              </p>
              <p className="text-[var(--spatial-text-muted)] text-[11px] mt-0.5 leading-relaxed">
                Google expired your Account 2 OAuth refresh token. Click
                Reconnect to re-link Account 2.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => handleConnectGoogleDrive(2)}
            className="shrink-0 bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 text-xs"
          >
            Reconnect Account 2
          </Button>
        </div>
      )}

      {/* Grid: 4 Summary Cards (Crisp High-Contrast Theme Adaptive) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Storage Format */}
        <div className="p-4 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm space-y-2 hover:border-[var(--spatial-border-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Format
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Plaintext SQL
            </span>
          </div>
          <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
            Standard SQL Dump
          </p>
          <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
            Clean unencrypted .sql file with bundled assets. Directly executable in Supabase SQL Editor.
          </p>
        </div>

        {/* Card 2: Google Drive Primary (Account 1) */}
        <div className="p-4 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm space-y-2 hover:border-[var(--spatial-border-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              Drive Account
            </span>
            {status?.googleDriveStatus === "EXPIRED" ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                Token Expired
              </span>
            ) : status?.googleDriveStatus === "CONNECTED" ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            ) : status?.hasGoogleDrive ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                Configured
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Setup Required
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
            Primary Cloud Backup
          </p>
          {status?.googleDriveEmail && (
            <div
              className={`inline-flex max-w-full items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                status?.googleDriveStatus === "CONNECTED"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
              }`}
              title={status.googleDriveEmail}
            >
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {status?.googleDriveStatus === "EXPIRED"
                  ? `Last linked: ${status.googleDriveEmail}`
                  : status.googleDriveEmail}
              </span>
            </div>
          )}
          <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
            Personal Google Drive folder. Retention prunes archives older than{" "}
            {status?.retentionDays || 30} days.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleConnectGoogleDrive(1)}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-500 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>
                {status?.googleDriveStatus === "EXPIRED"
                  ? "Reconnect Account 1"
                  : "Re-link Account 1"}
              </span>
            </button>
          </div>
        </div>

        {/* Card 3: Google Drive Secondary (Account 2) */}
        {isDeveloper && (
          <div className="p-4 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm space-y-2 hover:border-[var(--spatial-border-hover)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Drive Account 2
              </span>
              {status?.googleDriveStatus2 === "CONNECTED" ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Connected
                </span>
              ) : status?.googleDriveStatus2 === "EXPIRED" ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  Token Expired
                </span>
              ) : status?.hasGoogleDrive2 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  Configured
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-[var(--spatial-text-muted)] border border-[var(--spatial-border)]">
                  Optional
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
              Redundant Cloud Backup
            </p>
            {status?.googleDriveEmail2 && (
              <div
                className={`inline-flex max-w-full items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                  status?.googleDriveStatus2 === "CONNECTED"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                }`}
                title={status.googleDriveEmail2}
              >
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {status?.googleDriveStatus2 === "EXPIRED"
                    ? `Last linked: ${status.googleDriveEmail2}`
                    : status.googleDriveEmail2}
                </span>
              </div>
            )}
            <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
              Secondary account for dual-cloud redundancy. Both drives receive
              identical encrypted archives.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleConnectGoogleDrive(2)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>
                  {status?.hasGoogleDrive2
                    ? "Re-link Account 2"
                    : "+ Connect Account 2"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Card 4: Automation & Built-in Daily Schedule */}
        <div className="p-4 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] shadow-sm space-y-2 hover:border-[var(--spatial-border-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Daily Schedule
            </span>
            {status?.scheduler?.enabled === false ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Disabled
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Active (IST)
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
            {status?.scheduler?.timeLabel || "3:00 PM IST"} Daily
          </p>
          <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
            Runs automatically via built-in server scheduler (free-tier friendly)
            with auto catch-up and duplicate protection.
          </p>
          {status?.scheduler?.completedToday && (
            <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Today&apos;s scheduled backup completed
            </p>
          )}
        </div>
      </div>

      {/* Latest Backup Details */}
      {latest && (
        <Card
          title="Latest Backup Record"
          subtitle={
            latest.completed_at
              ? `Completed ${new Date(latest.completed_at).toLocaleString()}`
              : `Started ${new Date(latest.started_at).toLocaleString()}`
          }
          action={
            latest.status === "COMPLETED" &&
            (latest.filename || latest.file_name) && (
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={() =>
                  handleDownloadBackup(latest.filename || latest.file_name)
                }
                className="text-xs"
              >
                {(latest.filename || latest.file_name)?.endsWith(".sql")
                  ? "Download SQL Archive (.sql)"
                  : "Download Archive (.enc)"}
              </Button>
            )
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="min-w-0">
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">
                Filename
              </span>
              <span
                className="font-mono text-[var(--spatial-text-title)] font-semibold text-xs block truncate"
                title={latest.filename || latest.file_name}
              >
                {latest.filename || latest.file_name || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">
                Archive Size
              </span>
              <span className="text-[var(--spatial-text-title)] font-semibold">
                {formatBytes(latest.file_size_bytes)}
              </span>
            </div>
            <div>
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">
                Duration
              </span>
              <span className="text-[var(--spatial-text-title)] font-semibold">
                {formatDuration(latest.duration_ms)}
              </span>
            </div>
            <div>
              <span className="text-[var(--spatial-text-muted)] block text-[11px] mb-0.5">
                Status
              </span>
              {latest.status === "COMPLETED" ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Success
                </span>
              ) : latest.status === "RUNNING" ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In
                    Progress
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelRunningJob}
                    className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 border border-rose-500/30 font-semibold cursor-pointer"
                    title="Click to reset stuck running status"
                  >
                    Clear Stuck Status
                  </button>
                </div>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold"
                  title={latest.error_message}
                >
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
        title={
          <div className="flex items-center justify-between gap-3 w-full flex-wrap">
            <span>Backup History</span>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--spatial-text-muted)] font-normal">
                  {selectedIds.length} selected
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  loading={isDeleting}
                  loadingText="Deleting..."
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1 shadow-sm"
                >
                  Delete Selected ({selectedIds.length})
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-[var(--spatial-text-muted)] hover:underline ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        }
        subtitle={`${total} backup execution${total === 1 ? "" : "s"} recorded (newest first).`}
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        history.length > 0 &&
                        selectedIds.length === history.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer w-3.5 h-3.5"
                      title="Select / deselect all backups"
                    />
                  </th>
                  <th className="py-3 px-3.5 font-semibold">Date & Time</th>
                  <th className="py-3 px-3.5 font-semibold">Type</th>
                  <th className="py-3 px-3.5 font-semibold">Status</th>
                  <th className="py-3 px-3.5 font-semibold">Filename</th>
                  <th className="py-3 px-3.5 font-semibold">Size</th>
                  <th className="py-3 px-3.5 font-semibold">Duration</th>
                  <th className="py-3 px-3.5 font-semibold">Google Drive</th>
                  <th className="py-3 px-3.5 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {history.map((b) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-[var(--spatial-table-row-hover)] transition-colors ${
                      selectedIds.includes(b.id)
                        ? "bg-sky-500/5 dark:bg-sky-500/10"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(b.id)}
                        onChange={() => toggleSelectRow(b.id)}
                        className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>
                    <td className="py-3 px-3.5 font-medium text-[var(--spatial-text-title)] whitespace-nowrap">
                      {new Date(b.started_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)]">
                        {b.backup_type || b.type}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      {b.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : b.status === "RUNNING" ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                          Running
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]"
                          title={b.error_message}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3 px-3.5 font-mono text-[11px] text-[var(--spatial-text-title)] max-w-[220px]"
                      title={b.filename || b.file_name}
                    >
                      <span className="block truncate">
                        {b.filename || b.file_name || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-[var(--spatial-text-muted)] font-mono whitespace-nowrap">
                      {formatBytes(b.file_size_bytes)}
                    </td>
                    <td className="py-3 px-3.5 text-[var(--spatial-text-muted)] font-mono whitespace-nowrap">
                      {formatDuration(b.duration_ms)}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {b.drive_file_id && (
                          <a
                            href={`https://drive.google.com/file/d/${b.drive_file_id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 font-medium hover:underline transition-colors"
                            title="Open backup in Primary Google Drive (Account 1)"
                          >
                            <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                              Drive 1
                            </span>
                            <span>{b.drive_file_id.slice(0, 8)}...</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        )}
                        {b.drive_file_id_2 && (
                          <a
                            href={`https://drive.google.com/file/d/${b.drive_file_id_2}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium hover:underline transition-colors"
                            title="Open backup in Secondary Google Drive (Account 2)"
                          >
                            <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              Drive 2
                            </span>
                            <span>{b.drive_file_id_2.slice(0, 8)}...</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        )}
                        {!b.drive_file_id && !b.drive_file_id_2 && (
                          <span className="text-[var(--spatial-text-muted)]">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === "COMPLETED" &&
                          (b.filename || b.file_name) && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadBackup(
                                    b.filename || b.file_name,
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-all cursor-pointer"
                                title="Download encrypted .enc backup archive"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                              {(b.drive_file_id || b.drive_file_id_2) && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreFromHistory(b)}
                                  disabled={isRestoring}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                                  title="Restore database directly from this Google Drive backup"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>
                              )}
                            </>
                          )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(b)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 p-1 rounded-md text-[11px] font-medium text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                          title="Delete backup record and archive files"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="pt-3 border-t border-[var(--spatial-border)]">
            <SpatialPagination
              currentPage={historyPage}
              pageSize={historyPageSize}
              totalItems={total}
              onPageChange={setHistoryPage}
              onPageSizeChange={(size) => {
                setHistoryPageSize(size);
                setHistoryPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* Upload & Restore Database Card */}
      <Card
        title="Restore Database from Backup File"
        subtitle="Upload a previously downloaded .enc encrypted backup file to restore all tables, records, logos, and media."
      >
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? "border-sky-500/50 bg-sky-500/5 hover:bg-sky-500/10"
                : "border-[var(--spatial-border)] hover:border-sky-500/40 hover:bg-[var(--spatial-bg-card-hover)]"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".sql,.enc,application/sql,text/plain,application/octet-stream"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400">
                {selectedFile ? (
                  <FileArchive className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--spatial-text-title)] font-mono">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-[var(--spatial-text-muted)]">
                    {formatBytes(selectedFile.size)} • Click to choose a
                    different file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[var(--spatial-text-title)]">
                    Click to select or drag & drop backup file (
                    <span className="font-mono text-emerald-500">.sql</span> or{" "}
                    <span className="font-mono text-sky-500">.enc</span>)
                  </p>
                  <p className="text-[11px] text-[var(--spatial-text-muted)]">
                    Supports unencrypted .sql archives and legacy .enc files up to 150 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {selectedFile?.name?.toLowerCase().endsWith(".enc") ? (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-[var(--spatial-text-title)]">
                Decryption Key (required for legacy .enc file)
              </label>
              <div className="relative">
                <input
                  type={showRestoreKey ? "text" : "password"}
                  value={restoreDecryptionKey}
                  onChange={(e) => setRestoreDecryptionKey(e.target.value)}
                  placeholder="Enter Decryption Key"
                  autoComplete="off"
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] text-sm font-mono text-[var(--spatial-text-title)] focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowRestoreKey((v) => !v)}
                  title={showRestoreKey ? "Hide key" : "Show key"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] cursor-pointer"
                >
                  {showRestoreKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Unencrypted plaintext SQL archive detected. No decryption key required.</span>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-[11px] text-[var(--spatial-text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Automatic safety snapshot taken before restore. Clean & verified execution.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedFile && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={isRestoring}
                  className="text-xs"
                >
                  Clear File
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                icon={RotateCcw}
                onClick={handleRestoreUploadedFile}
                disabled={!selectedFile || isRestoring}
                loading={isRestoring}
                loadingText="Restoring Database..."
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-none shadow-md shadow-amber-950/20 px-4 py-2 text-xs font-semibold"
              >
                Restore Database from File
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Disaster Recovery Guide Note (High Contrast & User Friendly) */}
      {isDeveloper && (
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
              To restore a backup safely without risking unintentional
              production overwrites, run the dedicated CLI restoration workflow
              on your terminal:
            </p>
            <div className="p-2.5 rounded-xl bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] flex items-center justify-between gap-2">
              <code className="font-mono text-xs text-sky-600 dark:text-sky-300 font-semibold select-all break-all">
                node server/src/scripts/restoreBackup.js
              </code>
            </div>
            <p className="text-[11px] text-[var(--spatial-text-muted)] leading-relaxed">
              The CLI workflow verifies archive integrity, inspects SQL
              contents, takes a pre-restore safety snapshot of the target
              database, and requires typing{" "}
              <span className="font-mono font-semibold text-sky-500">
                RESTORE_CONFIRMED
              </span>{" "}
              before executing.
            </p>
          </div>
        </div>
      )}

      {/* Danger Zone: Wipe All Data */}
      <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/5 border border-rose-500/25 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Danger Zone: Wipe All Data
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                Permanent Action
              </span>
            </div>
            <p className="text-xs text-[var(--spatial-text-muted)] max-w-2xl leading-relaxed">
              Permanently erases all transactional records (repair jobs,
              customer devices, invoices, sales, inventory stock, and logs).
              Your Admin account, shop branding, and logos are strictly
              preserved.
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          icon={Trash2}
          onClick={handleWipeAllData}
          loading={isWiping}
          loadingText="Wiping All Data..."
          className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white border-none shadow-md shadow-rose-600/25 px-4 py-2 font-medium"
        >
          Wipe All Data
        </Button>
      </div>
    </div>
  );
};
