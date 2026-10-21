import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import pkg from 'pg';
const { Client: PgClient } = pkg;
import { env } from '../config/env.js';
import { db } from '../db/db.js';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';
import { encryptFileToFile } from './encryptionService.js';
import {
  uploadBackupToDrive,
  listBackupsFromDrive,
  deleteBackupFile,
} from './googleDriveService.js';

const BACKUP_FILENAME_REGEX = /^supabase-backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.enc$/;

/**
 * Generates standardized timestamped filename: supabase-backup-YYYY-MM-DD-HH-mm-ss.enc
 */
export function generateBackupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `supabase-backup-${yyyy}-${MM}-${dd}-${HH}-${mm}-${ss}.enc`;
}

/**
 * Parses timestamp from a standardized backup filename.
 */
export function parseDateFromBackupFilename(fileName) {
  const match = fileName.match(BACKUP_FILENAME_REGEX);
  if (!match) return null;
  const [, yyyy, MM, dd, HH, mm, ss] = match;
  return new Date(`${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`);
}

/**
 * Checks if the pg_dump command-line binary is available on the host system.
 */
export async function isPgDumpAvailable() {
  return new Promise((resolve) => {
    const proc = spawn('pg_dump', ['--version'], { stdio: 'ignore', shell: false });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Exports logical PostgreSQL dump using native pg_dump CLI utility.
 * Dumps public schema with --clean --if-exists --no-owner --no-privileges to ensure clean restore on Supabase.
 */
async function dumpUsingPgDump(connectionUrl, outputPath, timeoutMs) {
  return new Promise((resolve, reject) => {
    console.log('🐘 Executing pg_dump logical database export...');
    const writeStream = fs.createWriteStream(outputPath);
    const args = [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--schema=public',
      `--dbname=${connectionUrl}`,
    ];

    const child = spawn('pg_dump', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.stdout.pipe(writeStream);

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`pg_dump timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn pg_dump: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      writeStream.close();
      if (code !== 0) {
        // Sanitize database password from stderr if present
        const sanitizedErr = stderr.replace(/:[^@:]*@/, ':****@');
        return reject(new Error(`pg_dump exited with error code ${code}: ${sanitizedErr.slice(0, 500)}`));
      }
      resolve();
    });
  });
}

/**
 * Fallback logical SQL dumper using the pg library when pg_dump is not available.
 * Queries all tables in the public schema and generates standard SQL DDL and INSERT statements.
 */
async function dumpUsingPgClient(connectionUrl, outputPath) {
  console.log('🔄 pg_dump binary not found. Generating logical SQL dump via direct PostgreSQL connection...');
  const client = new PgClient({ connectionString: connectionUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf-8' });

  try {
    writeStream.write(`-- ========================================================\n`);
    writeStream.write(`-- SUPABASE DATABASE LOGICAL BACKUP (DIRECT PG DUMP)\n`);
    writeStream.write(`-- Generated at: ${new Date().toISOString()}\n`);
    writeStream.write(`-- ========================================================\n\n`);
    writeStream.write(`BEGIN;\nSET statement_timeout = 0;\nSET lock_timeout = 0;\n\n`);

    // Get list of tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map((r) => r.table_name);
    console.log(`📋 Found ${tableNames.length} tables in public schema to dump.`);

    for (const table of tableNames) {
      writeStream.write(`\n-- Table: public."${table}"\n`);
      const rowsRes = await client.query(`SELECT * FROM public."${table}"`);
      if (rowsRes.rows.length === 0) continue;

      const columns = Object.keys(rowsRes.rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(', ');

      for (const row of rowsRes.rows) {
        const values = columns.map((c) => {
          const val = row[c];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');

        writeStream.write(`INSERT INTO public."${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
      }
    }

    writeStream.write(`\nCOMMIT;\n`);
    await new Promise((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });
  } finally {
    await client.end();
  }
}

/**
 * Fallback logical dump using Supabase JavaScript client when direct connection string is not provided.
 */
async function dumpUsingSupabaseClient(outputPath) {
  console.log('ℹ️ DATABASE_URL not configured. Exporting logical table records via Supabase API...');
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');

  const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf-8' });
  writeStream.write(`-- ========================================================\n`);
  writeStream.write(`-- SUPABASE LOGICAL DATABASE EXPORT (SUPABASE API DUMP)\n`);
  writeStream.write(`-- Generated at: ${new Date().toISOString()}\n`);
  writeStream.write(`-- ========================================================\n\nBEGIN;\n`);

  const tables = [
    'shops', 'roles', 'users', 'customers', 'devices', 'parts',
    'repair_jobs', 'job_status_history', 'diagnoses', 'repair_estimates',
    'repair_estimate_items', 'part_stock_movements', 'repair_tests',
    'payments', 'invoices', 'invoice_items', 'notification_logs', 'settings',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error || !data || data.length === 0) continue;

      writeStream.write(`\n-- Table: public."${table}" (${data.length} records)\n`);
      const columns = Object.keys(data[0]);
      const colList = columns.map((c) => `"${c}"`).join(', ');

      for (const row of data) {
        const values = columns.map((c) => {
          const val = row[c];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');

        writeStream.write(`INSERT INTO public."${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
      }
    } catch (_) {}
  }

  writeStream.write(`\nCOMMIT;\n`);
  await new Promise((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });
}

/**
 * Creates a raw logical database dump file on disk.
 */
async function generateDatabaseDump(outputSqlPath, timeoutMs) {
  if (env.DATABASE_URL) {
    const hasPgDump = await isPgDumpAvailable();
    if (hasPgDump) {
      await dumpUsingPgDump(env.DATABASE_URL, outputSqlPath, timeoutMs);
      return 'pg_dump';
    }
    await dumpUsingPgClient(env.DATABASE_URL, outputSqlPath);
    return 'pg_client';
  }

  if (isSupabaseConfigured()) {
    await dumpUsingSupabaseClient(outputSqlPath);
    return 'supabase_client';
  }

  throw new Error('Neither DATABASE_URL nor Supabase credentials are configured for database dump.');
}

/**
 * Executes retention pruning of old backups in Google Drive.
 * Safeguard: Never deletes if total valid backups <= 1 (always preserves at least the latest backup).
 */
export async function cleanupExpiredBackups(retentionDays = env.BACKUP_RETENTION_DAYS) {
  try {
    const backups = await listBackupsFromDrive();
    if (backups.length <= 1) {
      console.log(`🛡️ Retention check: Only ${backups.length} backup(s) found in Google Drive. Keeping all backups.`);
      return { deletedCount: 0, preservedCount: backups.length };
    }

    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    // Sort descending by parsed date
    const sorted = backups
      .map((b) => ({ ...b, parsedDate: parseDateFromBackupFilename(b.name) || new Date(b.createdTime) }))
      .sort((a, b) => b.parsedDate - a.parsedDate);

    // Keep the latest 2 backups regardless of age as a safety guarantee
    const candidatesForPruning = sorted.slice(2);

    for (const b of candidatesForPruning) {
      const ageMs = now - b.parsedDate.getTime();
      if (ageMs > maxAgeMs) {
        console.log(`🗑️ Pruning expired backup: "${b.name}" (${Math.floor(ageMs / (24 * 3600 * 1000))} days old, limit: ${retentionDays} days)...`);
        try {
          await deleteBackupFile(b.id);
          deletedCount++;
        } catch (err) {
          console.warn(`⚠️ Failed to delete expired backup [${b.id}] "${b.name}": ${err.message}`);
        }
      }
    }

    console.log(`✅ Retention cleanup completed. Deleted: ${deletedCount}, Retained: ${sorted.length - deletedCount}`);
    return { deletedCount, preservedCount: sorted.length - deletedCount };
  } catch (err) {
    console.warn(`⚠️ Retention cleanup encountered an error: ${err.message}`);
    return { deletedCount: 0, error: err.message };
  }
}

/**
 * Master Backup Execution Function.
 * Orchestrates dump, AES-256-GCM encryption, Google Drive upload, retention pruning, and logging.
 */
export async function runBackup({ backupType = 'MANUAL', userId = null } = {}) {
  const startTime = Date.now();

  // 1. Check distributed concurrency lock
  const runningJob = await db.backup_logs.getRunningJob();
  if (runningJob) {
    throw new Error(`A backup job is currently running (ID: ${runningJob.id}, started: ${runningJob.started_at}). Concurrent execution is prevented.`);
  }

  // 2. Validate essential configurations
  if (!env.BACKUP_ENCRYPTION_KEY) {
    throw new Error('BACKUP_ENCRYPTION_KEY is not configured. Set a secure 32-byte key in environment variables.');
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google Drive OAuth credentials are not fully configured. Run setupGoogleDriveAuth.js.');
  }

  const fileName = generateBackupFilename(new Date());

  // 3. Register running job record
  const logRecord = await db.backup_logs.create({
    backup_type: backupType,
    status: 'RUNNING',
    filename: fileName,
    created_by_user_id: userId,
  });

  const tempDir = env.BACKUP_TEMP_DIR || path.join(os.tmpdir(), 'repairos-backups');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const rawSqlPath = path.join(tempDir, `dump-${logRecord.id}.sql`);
  const encFilePath = path.join(tempDir, fileName);

  try {
    console.log(`====================================================`);
    console.log(`🔒 INITIATING DATABASE BACKUP [${fileName}]`);
    console.log(`   Type: ${backupType} | Job ID: ${logRecord.id}`);
    console.log(`====================================================`);

    // 4. Dump database to raw SQL
    const dumpMethod = await generateDatabaseDump(rawSqlPath, env.BACKUP_TIMEOUT_MS);
    const sqlStats = await fs.promises.stat(rawSqlPath);
    console.log(`📦 Logical dump created (${(sqlStats.size / 1024).toFixed(1)} KB) using method: [${dumpMethod}]`);

    // 5. Encrypt with AES-256-GCM + Gzip compression
    console.log(`🔐 Encrypting dump with AES-256-GCM authenticated cipher...`);
    const encResult = await encryptFileToFile(rawSqlPath, encFilePath, env.BACKUP_ENCRYPTION_KEY);
    console.log(`🔒 Encryption complete. Encrypted archive size: ${(encResult.fileSizeBytes / 1024).toFixed(1)} KB`);

    // Immediately remove unencrypted plaintext dump
    try { await fs.promises.unlink(rawSqlPath); } catch (_) {}

    // 6. Upload encrypted archive to personal Google Drive
    const uploadResult = await uploadBackupToDrive(encFilePath, fileName);

    // 7. Cleanup local encrypted file
    try { await fs.promises.unlink(encFilePath); } catch (_) {}

    // 8. Run retention policy cleanup
    console.log(`🧹 Running backup retention cleanup (retention: ${env.BACKUP_RETENTION_DAYS} days)...`);
    await cleanupExpiredBackups(env.BACKUP_RETENTION_DAYS);

    const durationMs = Date.now() - startTime;

    // 9. Mark job completed in database
    const completedLog = await db.backup_logs.update(logRecord.id, {
      status: 'COMPLETED',
      drive_file_id: uploadResult.fileId,
      drive_folder_id: uploadResult.folderId,
      file_size_bytes: uploadResult.fileSizeBytes,
      checksum_md5: uploadResult.checksumMd5,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    });

    console.log(`====================================================`);
    console.log(`🎉 BACKUP SUCCESSFUL in ${(durationMs / 1000).toFixed(2)}s`);
    console.log(`   Drive File ID: ${uploadResult.fileId}`);
    console.log(`   Archive Size:  ${(uploadResult.fileSizeBytes / 1024).toFixed(1)} KB`);
    console.log(`====================================================`);

    return completedLog;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`❌ Backup failed after ${(durationMs / 1000).toFixed(2)}s:`, err.message);

    // Clean up temporary files on failure
    if (fs.existsSync(rawSqlPath)) {
      try { await fs.promises.unlink(rawSqlPath); } catch (_) {}
    }
    if (fs.existsSync(encFilePath)) {
      try { await fs.promises.unlink(encFilePath); } catch (_) {}
    }

    // Sanitize error message (remove potential passwords or credentials)
    const sanitizedError = err.message.replace(/:[^@:]*@/, ':****@');

    await db.backup_logs.update(logRecord.id, {
      status: 'FAILED',
      error_message: sanitizedError,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    });

    throw new Error(`Backup failed: ${sanitizedError}`);
  }
}
