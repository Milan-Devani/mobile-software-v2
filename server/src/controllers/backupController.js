import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBackup } from '../services/backupService.js';
import { getBackupSchedulerStatus } from '../services/backupSchedulerService.js';
import { restoreDatabase } from '../services/restoreService.js';
import {
  testDriveAuth,
  getDriveAccountInfo,
  invalidateDriveProfileCache,
  getGoogleDriveAuthUrl,
  exchangeAuthCodeForTokens,
  downloadBackupFromDrive,
  deleteBackupFile,
} from '../services/googleDriveService.js';
import {
  saveDriveRefreshToken,
  saveDriveAccountEmail,
  getSavedDriveAccountEmail,
  hydrateDriveTokensFromDb,
} from '../services/driveTokenStore.js';
import { db } from '../db/db.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enqueue or trigger a manual backup.
 * Returns 202 Accepted immediately while backup executes in the background.
 */
export async function triggerManualBackup(req, res, next) {
  try {
    // 1. Concurrency Check
    const runningJob = await db.backup_logs.getRunningJob();
    if (runningJob) {
      return res.status(409).json({
        success: false,
        message: 'A backup job is currently running. Please wait for it to finish before starting a new one.',
        code: 'BACKUP_ALREADY_RUNNING',
        data: {
          runningJobId: runningJob.id,
          startedAt: runningJob.started_at,
        },
      });
    }

    // 2. Initiate backup asynchronously in the background (no encryption key required)
    const backupPromise = runBackup({
      backupType: 'MANUAL',
      userId: req.user?.id || null,
    });

    // Handle any background unhandled rejection safely
    backupPromise.catch((err) => {
      console.error('⚠️ Background manual backup execution failed:', err.message);
    });

    // 4. Return immediate 202 Accepted response
    return res.status(202).json({
      success: true,
      message: 'Database backup initiated successfully. The encrypted backup will be saved locally and synced to Google Drive.',
      data: {
        status: 'RUNNING',
        initiatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve authorized backup history logs.
 */
export async function getBackupHistory(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const history = await db.backup_logs.list({ limit, offset });

    return res.status(200).json({
      success: true,
      data: {
        backups: history.backups || [],
        total: history.total || 0,
        limit,
        offset,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve current backup status (whether a backup is currently running and details of latest backup).
 */
export async function getBackupStatus(req, res, next) {
  try {
    // 0. Auto-clear stale running jobs older than 10 minutes so UI never gets permanently stuck
    try {
      await db.backup_logs.clearStaleJobs(10);
    } catch (_) {}

    const [runningJob, latestBackup, scheduler] = await Promise.all([
      db.backup_logs.getRunningJob(),
      db.backup_logs.getLatest(),
      getBackupSchedulerStatus(),
    ]);

    // Ensure DB-persisted refresh tokens are loaded into runtime env (survives restarts)
    await hydrateDriveTokensFromDb();

    // Test Google Drive token health for Account 1 and Account 2
    const [driveAuthTest1, driveAuthTest2, savedEmail1, savedEmail2] = await Promise.all([
      testDriveAuth(1),
      testDriveAuth(2),
      getSavedDriveAccountEmail(1),
      getSavedDriveAccountEmail(2),
    ]);

    const hasGoogleDrive = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
    const hasGoogleDrive2 = Boolean(env.GOOGLE_REFRESH_TOKEN_2);

    const googleDriveEmail = driveAuthTest1.valid
      ? (driveAuthTest1.email || savedEmail1 || null)
      : (hasGoogleDrive ? savedEmail1 : null);
    const googleDriveEmail2 = driveAuthTest2.valid
      ? (driveAuthTest2.email || savedEmail2 || null)
      : (hasGoogleDrive2 ? savedEmail2 : null);

    // Persist newly discovered live email(s) to DB settings in the background (non-blocking)
    if (driveAuthTest1.valid && driveAuthTest1.email && driveAuthTest1.email !== savedEmail1) {
      saveDriveAccountEmail(1, driveAuthTest1.email).catch(() => {});
    }
    if (driveAuthTest2.valid && driveAuthTest2.email && driveAuthTest2.email !== savedEmail2) {
      saveDriveAccountEmail(2, driveAuthTest2.email).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      data: {
        isRunning: Boolean(runningJob),
        currentJob: runningJob || null,
        latestBackup: latestBackup || null,
        schedule: scheduler?.cronUtc || env.BACKUP_SCHEDULE || '30 9 * * *',
        scheduler,
        retentionDays: env.BACKUP_RETENTION_DAYS || 30,
        hasEncryptionKey: Boolean(env.BACKUP_ENCRYPTION_KEY),
        hasShopkeeperKey: Boolean(env.SHOPKEEPER_KEY),
        hasDeveloperKey: Boolean(env.DEVELOPER_KEY),
        // Primary Account 1
        hasGoogleDrive,
        googleDriveStatus: driveAuthTest1.valid
          ? 'CONNECTED'
          : driveAuthTest1.error === 'invalid_grant'
            ? 'EXPIRED'
            : env.GOOGLE_REFRESH_TOKEN
              ? 'ERROR'
              : 'NOT_CONFIGURED',
        googleDriveError: driveAuthTest1.valid ? null : driveAuthTest1.message,
        googleDriveEmail,
        // Secondary Account 2
        hasGoogleDrive2,
        googleDriveStatus2: driveAuthTest2.valid
          ? 'CONNECTED'
          : driveAuthTest2.error === 'invalid_grant'
            ? 'EXPIRED'
            : env.GOOGLE_REFRESH_TOKEN_2
              ? 'ERROR'
              : 'NOT_CONFIGURED',
        googleDriveError2: driveAuthTest2.valid ? null : driveAuthTest2.message,
        googleDriveEmail2,
        hasDatabaseUrl: Boolean(env.DATABASE_URL),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Downloads a backup archive (.enc) directly from local server storage (or pulls from Drive if not present locally).
 */
export async function downloadBackupArchive(req, res, next) {
  try {
    const { filename } = req.params;

    if (!filename || !/^(supabase-)?backup-[\d-]+\.(sql|enc)$/.test(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid backup filename format. Expected .sql or .enc' });
    }

    const localBackupsDir = path.resolve(__dirname, '../../backups');
    const localFilePath = path.join(localBackupsDir, filename);

    if (fs.existsSync(localFilePath)) {
      return res.download(localFilePath, filename);
    }

    // If not found locally, check if it exists in Google Drive (Account 1 or Account 2)
    const history = await db.backup_logs.list({ limit: 100 });
    const match = (history.backups || []).find((b) => b.filename === filename && (b.drive_file_id || b.drive_file_id_2));

    if (match) {
      if (!fs.existsSync(localBackupsDir)) {
        fs.mkdirSync(localBackupsDir, { recursive: true });
      }
      if (match.drive_file_id) {
        try {
          await downloadBackupFromDrive(match.drive_file_id, localFilePath, 1);
          return res.download(localFilePath, filename);
        } catch (_) {}
      }
      if (match.drive_file_id_2) {
        try {
          await downloadBackupFromDrive(match.drive_file_id_2, localFilePath, 2);
          return res.download(localFilePath, filename);
        } catch (_) {}
      }
    }

    return res.status(404).json({
      success: false,
      message: 'Backup archive was not found on local disk or Google Drive.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generates and returns Google Drive OAuth 2.0 authorization URL for Account 1 or 2.
 */
export async function getGoogleAuthUrlEndpoint(req, res, next) {
  try {
    const account = Number(req.query.account || 1) === 2 ? 2 : 1;
    const url = getGoogleDriveAuthUrl(account);
    return res.status(200).json({
      success: true,
      url,
      authUrl: url,
      account,
      data: { url, authUrl: url, account },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Exchanges Google OAuth authorization code for fresh refresh token (Account 1 or 2) and updates server/.env.
 */
export async function exchangeGoogleAuthCodeEndpoint(req, res, next) {
  try {
    const { code, account } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Google authorization code is required.',
      });
    }

    const accountIndex = Number(account || 1) === 2 ? 2 : 1;
    const tokens = await exchangeAuthCodeForTokens(code.trim(), accountIndex);
    if (!tokens.refresh_token) {
      return res.status(400).json({
        success: false,
        message:
          `Google did not return a refresh token for Account ${accountIndex}. Please go to your Google Account (myaccount.google.com/permissions), revoke access for this app, and click Reconnect Google Drive again with prompt=consent.`,
      });
    }

    // Update server/.env file
    const envPath = path.resolve(__dirname, '../../.env');
    const envKey = accountIndex === 2 ? 'GOOGLE_REFRESH_TOKEN_2' : 'GOOGLE_REFRESH_TOKEN';
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf-8');
      const regex = new RegExp(`^${envKey}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${envKey}=${tokens.refresh_token}`);
      } else {
        content += `\n${envKey}=${tokens.refresh_token}`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
    }

    // Update runtime configuration
    if (accountIndex === 2) {
      env.GOOGLE_REFRESH_TOKEN_2 = tokens.refresh_token;
    } else {
      env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
    }

    // Persist the refresh token into the database (settings table) so it
    // survives server restarts and redeploys, even when reconnecting from
    // a different machine (where server/.env is not reachable).
    await saveDriveRefreshToken(accountIndex, tokens.refresh_token);

    // Refresh cached profile and persist connected Google Drive email (best-effort)
    invalidateDriveProfileCache(accountIndex);
    const { email } = await getDriveAccountInfo(accountIndex);
    if (email) {
      await saveDriveAccountEmail(accountIndex, email);
    }

    return res.status(200).json({
      success: true,
      message: email
        ? `Google Drive Account ${accountIndex} (${email}) connected successfully! Refresh token updated.`
        : `Google Drive Account ${accountIndex} connected successfully! Refresh token updated.`,
      account: accountIndex,
      email: email || null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-authorized database restore endpoint (from Google Drive).
 * Requires explicit confirmation phrase "RESTORE_CONFIRMED" and takes a pre-restore backup first.
 */
export async function restoreBackupEndpoint(req, res, next) {
  try {
    const { confirmation_phrase, drive_file_id, target_database_url, decryption_key } = req.body;

    if (confirmation_phrase !== 'RESTORE_CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: 'Restore requires explicit confirmation phrase "RESTORE_CONFIRMED".',
        code: 'CONFIRMATION_REQUIRED',
      });
    }

    if (!drive_file_id) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive file ID of the backup archive is required.',
        code: 'DRIVE_FILE_ID_REQUIRED',
      });
    }

    const targetUrl = target_database_url || env.DATABASE_URL || env.SUPABASE_URL;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Target database URL or Supabase configuration is required for restore.',
        code: 'TARGET_URL_REQUIRED',
      });
    }

    // Execute safe restore workflow
    const result = await restoreDatabase({
      driveFileId: drive_file_id,
      targetConnectionUrl: targetUrl,
      confirmationPhrase: confirmation_phrase,
      takePreRestoreBackup: true,
      userId: req.user?.id || null,
      decryptionKey: decryption_key || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Database restored successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-authorized database restore endpoint from an uploaded .enc backup file.
 * Requires explicit confirmation phrase "RESTORE_CONFIRMED" and takes a pre-restore safety snapshot.
 */
export async function restoreUploadedBackupEndpoint(req, res, next) {
  let uploadedFilePath = null;
  try {
    const confirmationPhrase = req.body?.confirmation_phrase || req.body?.confirmationPhrase;
    const decryptionKey = req.body?.decryption_key || req.body?.decryptionKey || null;

    if (confirmationPhrase !== 'RESTORE_CONFIRMED') {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(400).json({
        success: false,
        message: 'Restore requires explicit confirmation phrase "RESTORE_CONFIRMED".',
        code: 'CONFIRMATION_REQUIRED',
      });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: 'Backup archive file (.enc) is required.',
        code: 'FILE_REQUIRED',
      });
    }

    uploadedFilePath = req.file.path;
    const targetUrl = req.body?.target_database_url || env.DATABASE_URL || env.SUPABASE_URL;

    console.log(`📥 Initiating restore from uploaded backup file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Execute safe restore workflow
    const result = await restoreDatabase({
      localEncryptedFilePath: uploadedFilePath,
      targetConnectionUrl: targetUrl,
      confirmationPhrase: confirmationPhrase,
      takePreRestoreBackup: true,
      userId: req.user?.id || null,
      decryptionKey: decryptionKey || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Database restored successfully from uploaded backup archive.',
      data: result,
    });
  } catch (err) {
    next(err);
  } finally {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try { await fs.promises.unlink(uploadedFilePath); } catch (_) {}
    }
  }
}

/**
 * Admin-authorized transactional data wipe endpoint.
 * Requires explicit confirmation phrase "WIPE_ALL_DATA".
 * Automatically takes a safety pre-wipe backup and preserves admin users & shop profile.
 */
export async function wipeAllDataEndpoint(req, res, next) {
  try {
    const { confirmation_phrase, confirmationPhrase, take_safety_backup = true, takeSafetyBackup = true } = req.body;
    const phrase = confirmation_phrase || confirmationPhrase;
    const shouldBackup = take_safety_backup !== false && takeSafetyBackup !== false;

    if (phrase !== 'WIPE_ALL_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Data wipe requires explicit confirmation phrase "WIPE_ALL_DATA".',
        code: 'CONFIRMATION_REQUIRED',
      });
    }

    // 1. Optional but recommended: Safety pre-wipe backup
    if (shouldBackup) {
      try {
        console.log('🛡️ Creating safety pre-wipe backup before data wipe...');
        await runBackup({ backupType: 'MANUAL', userId: req.user?.id || null });
        console.log('✅ Safety pre-wipe backup completed successfully.');
      } catch (backupErr) {
        console.warn('⚠️ Safety pre-wipe backup warning (proceeding with wipe):', backupErr.message);
      }
    }

    // 2. Wipe transactional data
    const result = await db.wipeTransactionalData();

    return res.status(200).json({
      success: true,
      message: 'All transactional data wiped successfully. Admin account and shop profile are preserved.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to delete a backup archive from Drive (Account 1 & 2), local disk, and database.
 */
async function deleteBackupArchiveAndRecord(backupLog) {
  if (!backupLog) return;
  const { id, filename, drive_file_id, drive_file_id_2 } = backupLog;

  // 1. Delete from Primary Google Drive (Account 1)
  if (drive_file_id) {
    try {
      await deleteBackupFile(drive_file_id, 1);
    } catch (err) {
      console.warn(`⚠️ Could not delete Google Drive 1 file ${drive_file_id}:`, err.message);
    }
  }

  // 2. Delete from Secondary Google Drive (Account 2)
  if (drive_file_id_2) {
    try {
      await deleteBackupFile(drive_file_id_2, 2);
    } catch (err) {
      console.warn(`⚠️ Could not delete Google Drive 2 file ${drive_file_id_2}:`, err.message);
    }
  }

  // 3. Delete local copy on disk if present
  if (filename) {
    const localBackupsDir = path.resolve(__dirname, '../../backups');
    const localFilePath = path.join(localBackupsDir, filename);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        console.warn(`⚠️ Could not delete local backup file ${filename}:`, err.message);
      }
    }
  }

  // 4. Delete from database
  await db.backup_logs.delete(id);
}

/**
 * Admin-authorized endpoint to delete a single backup log and its cloud/local archives.
 */
export async function deleteBackupEndpoint(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Backup ID is required.' });
    }

    const log = await db.backup_logs.findById(id);
    if (!log) {
      await db.backup_logs.delete(id);
      return res.status(200).json({ success: true, message: 'Backup record deleted.' });
    }

    await deleteBackupArchiveAndRecord(log);
    return res.status(200).json({
      success: true,
      message: 'Backup archive and history record deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-authorized endpoint for bulk deleting backup logs and their cloud/local archives.
 */
export async function bulkDeleteBackupsEndpoint(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of backup IDs is required for bulk delete.',
      });
    }

    let deletedCount = 0;
    for (const id of ids) {
      try {
        const log = await db.backup_logs.findById(id);
        if (log) {
          await deleteBackupArchiveAndRecord(log);
          deletedCount++;
        } else {
          await db.backup_logs.delete(id);
          deletedCount++;
        }
      } catch (err) {
        console.warn(`⚠️ Error deleting backup ${id}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} backup record(s) and associated files.`,
      deletedCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-authorized endpoint to cancel or reset any stuck RUNNING backup job.
 */
export async function cancelRunningBackupJob(req, res, next) {
  try {
    // Clear all currently stuck running/queued jobs immediately
    await db.backup_logs.clearStaleJobs(0);

    return res.status(200).json({
      success: true,
      message: 'Active/stuck backup jobs have been reset successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Persists key/value updates into the server .env file (same pattern as the Google Drive setup script).
 */
const BACKUP_ENV_FILE = path.resolve(__dirname, '../../.env');

function updateBackupEnvFile(updates) {
  if (!fs.existsSync(BACKUP_ENV_FILE)) {
    fs.writeFileSync(BACKUP_ENV_FILE, '', 'utf-8');
  }
  let content = fs.readFileSync(BACKUP_ENV_FILE, 'utf-8');
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(BACKUP_ENV_FILE, content, 'utf-8');
}

/**
 * Validates a backup key input. Returns:
 *  - '' when empty (allowed, meaning "not set")
 *  - the trimmed key when it is a valid 64-char hex (256-bit) or a passphrase >= 8 chars
 *  - null when invalid
 */
function validateBackupKeyInput(value) {
  if (value === undefined || value === null) return '';
  const clean = String(value).trim();
  if (clean === '') return '';
  if (/^[0-9a-fA-F]{64}$/.test(clean)) return clean;
  if (clean.length >= 8) return clean;
  return null;
}

/**
 * Admin-authorized endpoint to save Owner / Shopkeeper / Developer backup keys.
 * Each key is validated independently (64-hex or >= 8 char passphrase) before persisting.
 */
export async function saveBackupKeysEndpoint(req, res, next) {
  try {
    const { owner_key, shopkeeper_key, developer_key } = req.body || {};

    const updates = {};
    for (const [field, envKey] of [
      ['owner_key', 'BACKUP_ENCRYPTION_KEY'],
      ['shopkeeper_key', 'SHOPKEEPER_KEY'],
      ['developer_key', 'DEVELOPER_KEY'],
    ]) {
      const value = req.body?.[field];
      if (value === undefined) continue; // only update fields that were provided
      const cleaned = validateBackupKeyInput(value);
      if (cleaned === null) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field}. Must be a 64-character hex key (256-bit) or a passphrase of at least 8 characters.`,
          code: 'INVALID_BACKUP_KEY',
        });
      }
      updates[envKey] = cleaned;
    }

    // Persist to .env and refresh the in-memory env for the running process
    updateBackupEnvFile(updates);
    for (const [envKey, value] of Object.entries(updates)) {
      env[envKey] = value;
    }

    return res.status(200).json({
      success: true,
      message: 'Backup keys saved successfully.',
      data: {
        hasEncryptionKey: Boolean(env.BACKUP_ENCRYPTION_KEY),
        hasShopkeeperKey: Boolean(env.SHOPKEEPER_KEY),
        hasDeveloperKey: Boolean(env.DEVELOPER_KEY),
      },
    });
  } catch (err) {
    next(err);
  }
}
