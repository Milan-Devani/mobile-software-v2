import { runBackup } from '../services/backupService.js';
import { restoreDatabase } from '../services/restoreService.js';
import { db } from '../db/db.js';
import { env } from '../config/env.js';

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

    // 2. Validate configuration
    if (!env.BACKUP_ENCRYPTION_KEY) {
      return res.status(400).json({
        success: false,
        message: 'BACKUP_ENCRYPTION_KEY is not configured on the server. Please set it in server environment variables.',
        code: 'ENCRYPTION_KEY_MISSING',
      });
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive credentials are not configured. Run setupGoogleDriveAuth.js or configure environment variables.',
        code: 'GOOGLE_CREDENTIALS_MISSING',
      });
    }

    // 3. Initiate backup asynchronously in the background
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
      message: 'Database backup initiated successfully. The backup is running in the background and will be uploaded to Google Drive.',
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
    const [runningJob, latestBackup] = await Promise.all([
      db.backup_logs.getRunningJob(),
      db.backup_logs.getLatest(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        isRunning: Boolean(runningJob),
        currentJob: runningJob || null,
        latestBackup: latestBackup || null,
        schedule: env.BACKUP_SCHEDULE || '0 2 * * *',
        retentionDays: env.BACKUP_RETENTION_DAYS || 30,
        hasEncryptionKey: Boolean(env.BACKUP_ENCRYPTION_KEY),
        hasGoogleDrive: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN),
        hasDatabaseUrl: Boolean(env.DATABASE_URL),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-authorized database restore endpoint.
 * Requires explicit confirmation phrase "RESTORE_CONFIRMED" and takes a pre-restore backup first.
 */
export async function restoreBackupEndpoint(req, res, next) {
  try {
    const { confirmation_phrase, drive_file_id, target_database_url } = req.body;

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

    const targetUrl = target_database_url || env.DATABASE_URL;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Target database URL is required for restore.',
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
