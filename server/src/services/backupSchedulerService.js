/**
 * Automated Daily Database Backup Scheduler (In-App — Render Free-Tier Friendly)
 * ------------------------------------------------------------------
 * Runs a daily database backup at 3:00 PM IST (configurable via BACKUP_HOUR_IST
 * and BACKUP_MINUTE_IST) and uploads to all connected Google Drive accounts
 * (Account 1 + Account 2), then prunes backups older than BACKUP_RETENTION_DAYS.
 *
 * Follows the same pattern as `birthdayService.js`:
 * - Started from `server/src/index.js` after DB init & Drive token hydration.
 * - Ticks every 5 minutes (first tick 60s after boot, staggered from birthday's 45s).
 * - Before 3:00 PM IST or after today's completion, exits in memory (zero DB calls).
 * - Auto catch-up if server wakes after 3:00 PM IST.
 * - Cross-instance duplicate protection via Supabase `settings` (`daily_backup_tracker`)
 *   and `backup_logs`.
 * - Up to 3 retries on the same day if a transient error occurs.
 * - Disable with env AUTO_BACKUP_ENABLED=false.
 */
import os from 'os';
import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';
import { runBackup } from './backupService.js';
import { hydrateDriveTokensFromDb } from './driveTokenStore.js';

export const BACKUP_TIME_ZONE = 'Asia/Kolkata';
const TRACKER_KEY = 'daily_backup_tracker';
const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (fires within 3:00–3:05 PM IST)
const FIRST_TICK_DELAY_MS = 60 * 1000; // 60s after boot (after birthday scheduler's 45s)
const RUNNING_LOCK_STALE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS_PER_DAY = 3;

const INSTANCE_ID = `${os.hostname()}-${process.pid}`;

const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

export const getBackupScheduleConfig = () => {
  const hourIst = clampInt(process.env.BACKUP_HOUR_IST ?? env.BACKUP_HOUR_IST, 0, 23, 15);
  const minuteIst = clampInt(process.env.BACKUP_MINUTE_IST ?? env.BACKUP_MINUTE_IST, 0, 59, 0);
  const enabled =
    String(process.env.AUTO_BACKUP_ENABLED ?? env.AUTO_BACKUP_ENABLED ?? 'true').toLowerCase() !== 'false';

  const hour12 = hourIst % 12 === 0 ? 12 : hourIst % 12;
  const ampm = hourIst >= 12 ? 'PM' : 'AM';
  const timeLabel = `${hour12}:${String(minuteIst).padStart(2, '0')} ${ampm} IST`;

  // Equivalent UTC cron expression (IST = UTC + 5:30)
  const totalIstMinutes = hourIst * 60 + minuteIst;
  const totalUtcMinutes = (totalIstMinutes - 330 + 1440) % 1440;
  const utcHour = Math.floor(totalUtcMinutes / 60);
  const utcMinute = totalUtcMinutes % 60;
  const cronUtc = `${utcMinute} ${utcHour} * * *`;

  return {
    enabled,
    hourIst,
    minuteIst,
    timeLabel,
    timezone: BACKUP_TIME_ZONE,
    cronUtc,
  };
};

let schedulerStarted = false;
let runInProgress = false;
let lastCompletedDateKey = null;

/* ------------------------------------------------------------------ */
/* IST Date Helpers                                                    */
/* ------------------------------------------------------------------ */

export const getIstDateTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BACKUP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value, 10);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');

  return {
    year,
    month,
    day,
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
};

export const isScheduledTimeReached = (nowIst, { hourIst, minuteIst }) => {
  const targetMinutes = hourIst * 60 + minuteIst;
  return nowIst.totalMinutes >= targetMinutes;
};

/* ------------------------------------------------------------------ */
/* Tracker (Supabase-backed cross-instance duplicate protection)       */
/* ------------------------------------------------------------------ */

const readTracker = async () => {
  let value = null;
  if (isSupabaseConfigured()) {
    try {
      const { data } = await getSupabase()
        .from('settings')
        .select('value')
        .eq('key', TRACKER_KEY)
        .maybeSingle();
      value = data?.value ?? null;
    } catch (_) {
      value = null;
    }
  }
  if (!value) {
    try {
      value = await db.settings.get(TRACKER_KEY);
    } catch (_) {
      value = null;
    }
  }
  return value && typeof value === 'object' ? value : null;
};

const writeTracker = async (tracker) => {
  try {
    await db.settings.set(
      TRACKER_KEY,
      tracker,
      'Daily automatic database backup tracker (auto-managed, resets daily in IST)',
    );
  } catch (err) {
    console.warn('[AutoBackup] ⚠️ Could not persist backup tracker:', err.message);
  }
};

const findCompletedScheduledBackupToday = async (dateKey) => {
  try {
    const history = await db.backup_logs.list({ limit: 15, offset: 0 });
    const rows = history?.backups || [];
    for (const row of rows) {
      if (row.backup_type !== 'SCHEDULED' || row.status !== 'COMPLETED') continue;
      const refTime = row.completed_at || row.started_at;
      if (!refTime) continue;
      const rowDate = new Date(refTime);
      if (Number.isNaN(rowDate.getTime())) continue;
      if (getIstDateTime(rowDate).dateKey === dateKey) {
        return row;
      }
    }
  } catch (_) {}
  return null;
};

/* ------------------------------------------------------------------ */
/* Core Scheduled Check & Execution                                    */
/* ------------------------------------------------------------------ */

export const runScheduledBackupTick = async ({ now = new Date(), ignoreWindow = false, dryRun = false } = {}) => {
  const cfg = getBackupScheduleConfig();
  const today = getIstDateTime(now);

  if (!cfg.enabled && !ignoreWindow) {
    return { skipped: true, reason: 'Automatic backup scheduler is disabled', date: today.dateKey };
  }

  if (!ignoreWindow && !isScheduledTimeReached(today, cfg)) {
    return {
      skipped: true,
      reason: `Before scheduled window (${cfg.timeLabel})`,
      date: today.dateKey,
    };
  }

  if (!ignoreWindow && lastCompletedDateKey === today.dateKey) {
    return { skipped: true, reason: 'Already completed today (cached)', date: today.dateKey };
  }

  if (runInProgress) {
    return { skipped: true, reason: 'Scheduled backup tick already in progress', date: today.dateKey };
  }

  runInProgress = true;
  try {
    // 1. Fresh read from Supabase tracker (cross-instance duplicate protection)
    const tracker = await readTracker();
    const isSameDay = tracker && tracker.date === today.dateKey;

    if (isSameDay && tracker.status === 'COMPLETED') {
      lastCompletedDateKey = today.dateKey;
      return { skipped: true, reason: 'Already completed today', date: today.dateKey, tracker };
    }

    if (isSameDay && tracker.status === 'RUNNING' && tracker.startedAt) {
      const elapsedMs = Date.now() - new Date(tracker.startedAt).getTime();
      if (!Number.isNaN(elapsedMs) && elapsedMs < RUNNING_LOCK_STALE_MS) {
        return {
          skipped: true,
          reason: `Another instance (${tracker.instanceId || 'unknown'}) is already running today's backup`,
          date: today.dateKey,
        };
      }
    }

    const prevAttempts = isSameDay ? Number(tracker.attempts || 0) : 0;
    if (isSameDay && prevAttempts >= MAX_ATTEMPTS_PER_DAY) {
      return {
        skipped: true,
        reason: `Max daily retry attempts (${MAX_ATTEMPTS_PER_DAY}) reached for ${today.dateKey}`,
        date: today.dateKey,
      };
    }

    // 2. Cross-check live backup_logs in case another process/CLI already ran today's backup
    const existingToday = await findCompletedScheduledBackupToday(today.dateKey);
    if (existingToday) {
      lastCompletedDateKey = today.dateKey;
      await writeTracker({
        date: today.dateKey,
        status: 'COMPLETED',
        attempts: Math.max(1, prevAttempts),
        backupId: existingToday.id,
        filename: existingToday.filename,
        completedAt: existingToday.completed_at || new Date().toISOString(),
        instanceId: INSTANCE_ID,
      });
      return {
        skipped: true,
        reason: 'Scheduled backup already recorded in backup_logs today',
        date: today.dateKey,
        backupId: existingToday.id,
      };
    }

    // 3. Clear stale jobs (>10 min) and defer cleanly if a manual backup is actively running
    try {
      await db.backup_logs.clearStaleJobs(10);
    } catch (_) {}

    const activeJob = await db.backup_logs.getRunningJob();
    if (activeJob) {
      return {
        skipped: true,
        reason: `Another backup job (${activeJob.id}) is currently running; will retry next tick`,
        date: today.dateKey,
      };
    }

    if (dryRun) {
      return {
        dryRun: true,
        wouldRun: true,
        date: today.dateKey,
        schedule: cfg.timeLabel,
      };
    }

    // 4. Refresh DB-persisted Google Drive tokens for Account 1 & Account 2 before uploading
    await hydrateDriveTokensFromDb();

    // 5. Claim today's run in Supabase before starting
    await writeTracker({
      date: today.dateKey,
      status: 'RUNNING',
      attempts: prevAttempts,
      startedAt: new Date().toISOString(),
      instanceId: INSTANCE_ID,
    });

    console.log(
      `[AutoBackup] ⏰ Starting daily scheduled database backup for ${today.dateKey} (${cfg.timeLabel}, attempt ${prevAttempts + 1}/${MAX_ATTEMPTS_PER_DAY})...`,
    );

    const result = await runBackup({
      backupType: 'SCHEDULED',
      userId: null,
    });

    lastCompletedDateKey = today.dateKey;
    await writeTracker({
      date: today.dateKey,
      status: 'COMPLETED',
      attempts: prevAttempts + 1,
      backupId: result?.id || null,
      filename: result?.filename || null,
      driveFileId: result?.drive_file_id || null,
      driveFileId2: result?.drive_file_id_2 || null,
      completedAt: new Date().toISOString(),
      instanceId: INSTANCE_ID,
    });

    console.log(
      `[AutoBackup] ✅ Daily scheduled backup completed for ${today.dateKey}: ${result?.filename || 'done'}`,
    );

    return {
      skipped: false,
      status: 'COMPLETED',
      date: today.dateKey,
      backup: result,
    };
  } catch (err) {
    const isConcurrencyLock = /currently running/i.test(err?.message || '');
    console.warn(`[AutoBackup] ⚠️ Scheduled backup attempt failed (${today.dateKey}):`, err.message);

    if (!isConcurrencyLock) {
      const current = await readTracker();
      const prevAttempts = current && current.date === today.dateKey ? Number(current.attempts || 0) : 0;
      await writeTracker({
        date: today.dateKey,
        status: 'FAILED',
        attempts: prevAttempts + 1,
        lastError: err.message,
        failedAt: new Date().toISOString(),
        instanceId: INSTANCE_ID,
      });
    }

    return {
      skipped: false,
      status: 'FAILED',
      date: today.dateKey,
      error: err.message,
    };
  } finally {
    runInProgress = false;
  }
};

/**
 * Returns live scheduler metadata for the Settings > Backup UI.
 */
export const getBackupSchedulerStatus = async () => {
  const cfg = getBackupScheduleConfig();
  const today = getIstDateTime();
  const tracker = await readTracker();
  const completedToday = Boolean(tracker && tracker.date === today.dateKey && tracker.status === 'COMPLETED');

  return {
    mode: 'IN_APP',
    enabled: cfg.enabled,
    active: schedulerStarted && cfg.enabled,
    hourIst: cfg.hourIst,
    minuteIst: cfg.minuteIst,
    timeLabel: cfg.timeLabel,
    timezone: cfg.timezone,
    cronUtc: cfg.cronUtc,
    todayIst: today.dateKey,
    completedToday,
    lastScheduledDate: tracker?.date || null,
    lastScheduledStatus: tracker?.status || null,
    lastScheduledAt: tracker?.completedAt || tracker?.startedAt || null,
  };
};

/**
 * Starts the daily in-app database backup scheduler (checks every 5 min, runs at 3:00 PM IST).
 */
export const startBackupScheduler = () => {
  if (schedulerStarted) return;
  const cfg = getBackupScheduleConfig();
  if (!cfg.enabled) {
    console.log('💾 Automatic daily backup scheduler disabled (AUTO_BACKUP_ENABLED=false)');
    return;
  }
  if (env.NODE_ENV === 'test') return;

  schedulerStarted = true;

  const tick = () =>
    runScheduledBackupTick().catch((err) =>
      console.warn('[AutoBackup] ⚠️ Scheduled backup tick error:', err.message),
    );

  setTimeout(tick, FIRST_TICK_DELAY_MS);
  setInterval(tick, TICK_INTERVAL_MS);
  console.log(
    `💾 Automatic daily backup scheduler started (daily at ${cfg.timeLabel}, checks every 5 min, auto catch-up enabled)`,
  );
};

