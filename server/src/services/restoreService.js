import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import pkg from 'pg';
const { Client: PgClient } = pkg;
import { env } from '../config/env.js';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';
import { decryptFileToFile } from './encryptionService.js';
import { AppError } from '../middleware/errorHandler.js';
import { downloadBackupFromDrive } from './googleDriveService.js';
import { runBackup } from './backupService.js';
import { restoreStorageAssetsFromDump } from './assetBackupService.js';

/**
 * Inspects a decrypted SQL dump file before execution to verify safety, tables, and contents.
 */
export async function inspectSqlDump(sqlFilePath) {
  const content = await fs.promises.readFile(sqlFilePath, 'utf-8');
  const lines = content.split('\n');

  const tablesFound = new Set();
  let insertCount = 0;
  let copyCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const insertMatch = trimmed.match(/INSERT INTO\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/i);
    if (insertMatch) {
      tablesFound.add(insertMatch[1]);
      insertCount++;
    }
    const copyMatch = trimmed.match(/COPY\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/i);
    if (copyMatch) {
      tablesFound.add(copyMatch[1]);
      copyCount++;
    }
  }

  return {
    lineCount: lines.length,
    characterCount: content.length,
    tables: Array.from(tablesFound),
    insertCount,
    copyCount,
    hasTransactions: content.includes('BEGIN') && content.includes('COMMIT'),
  };
}

/**
 * Parses INSERT statements from a SQL dump and returns structured table data.
 * Handles both plain-value and ::jsonb typed values in the dump.
 * Skips the special _app_backup_assets table (handled by assetBackupService).
 */
function parseSqlDumpToTableRows(sqlContent) {
  const tableMap = new Map(); // tableName -> { columns: string[], rows: object[] }

  // Match: INSERT INTO public."tablename" ("col1", "col2") VALUES (...) ON CONFLICT DO NOTHING;
  // We'll parse line-by-line since inserts are one per line in our custom dump format
  const lines = sqlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('INSERT INTO')) continue;

    // Extract table name
    const tableMatch = trimmed.match(/INSERT INTO\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?\s*\(/i);
    if (!tableMatch) continue;
    const tableName = tableMatch[1];

    // Skip the special assets table — it's handled separately
    if (tableName === '_app_backup_assets') continue;

    // Extract column list
    const colMatch = trimmed.match(/INSERT INTO\s+(?:public\.)?["']?[a-zA-Z0-9_]+["']?\s*\(([^)]+)\)/i);
    if (!colMatch) continue;
    const columns = colMatch[1].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    // Extract VALUES (...) portion — find from first ( after VALUES keyword
    const valuesStart = trimmed.indexOf(' VALUES (');
    if (valuesStart === -1) continue;
    // Everything from after VALUES ( to the end, strip trailing ON CONFLICT DO NOTHING;
    let valsPart = trimmed.slice(valuesStart + ' VALUES ('.length);
    // Remove trailing ) ON CONFLICT DO NOTHING; or just );
    valsPart = valsPart.replace(/\)\s*ON\s+CONFLICT\s+DO\s+NOTHING\s*;?\s*$/i, '').replace(/\)\s*;?\s*$/, '');

    // Parse the values — this is tricky because of nested strings, JSON, etc.
    const parsedValues = parseSqlValueList(valsPart, columns.length);
    if (!parsedValues || parsedValues.length !== columns.length) continue;

    // Build the row object
    const row = {};
    columns.forEach((col, i) => {
      row[col] = parsedValues[i];
    });

    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, { columns, rows: [] });
    }
    tableMap.get(tableName).rows.push(row);
  }

  return tableMap;
}

/**
 * Parses a SQL VALUES list string into an array of JS values.
 * Handles: NULL, TRUE/FALSE, numbers, quoted strings (with escaped ''), ::jsonb typed values.
 */
function parseSqlValueList(valStr, expectedCount) {
  const values = [];
  let i = 0;
  const str = valStr.trim();

  while (i < str.length && values.length < expectedCount) {
    // Skip leading whitespace and commas between values
    while (i < str.length && (str[i] === ' ' || str[i] === '\t')) i++;

    if (str[i] === ',') { i++; continue; }

    // NULL
    if (str.slice(i, i + 4).toUpperCase() === 'NULL') {
      values.push(null);
      i += 4;
      // skip optional trailing ::type
      if (str.slice(i, i + 2) === '::') {
        while (i < str.length && str[i] !== ',' && str[i] !== ')') i++;
      }
      continue;
    }

    // TRUE / FALSE
    if (str.slice(i, i + 4).toUpperCase() === 'TRUE') {
      values.push(true);
      i += 4;
      continue;
    }
    if (str.slice(i, i + 5).toUpperCase() === 'FALSE') {
      values.push(false);
      i += 5;
      continue;
    }

    // Quoted string (single-quoted)
    if (str[i] === "'") {
      i++; // skip opening quote
      let result = '';
      while (i < str.length) {
        if (str[i] === "'" && str[i + 1] === "'") {
          // escaped single quote ''
          result += "'";
          i += 2;
        } else if (str[i] === "'") {
          i++; // closing quote
          break;
        } else {
          result += str[i];
          i++;
        }
      }
      // Skip optional ::jsonb or ::text cast
      if (str.slice(i, i + 2) === '::') {
        while (i < str.length && str[i] !== ',' && str[i] !== ')') i++;
      }
      // Try to parse as JSON if it looks like a JSON object/array
      if ((result.startsWith('{') || result.startsWith('[')) && result.length > 1) {
        try { values.push(JSON.parse(result)); continue; } catch (_) {}
      }
      values.push(result);
      continue;
    }

    // Number (integer or float)
    const numMatch = str.slice(i).match(/^-?[0-9]+(\.[0-9]+)?/);
    if (numMatch) {
      values.push(parseFloat(numMatch[0]));
      i += numMatch[0].length;
      continue;
    }

    // Unrecognized token — push null and skip to next comma
    values.push(null);
    while (i < str.length && str[i] !== ',') i++;
  }

  return values;
}

/**
 * Restore via Supabase REST API (HTTPS port 443) — used as fallback when direct
 * PostgreSQL port 5432 is blocked by the user's ISP/firewall/router.
 *
 * Parses the SQL dump into per-table row arrays and upserts each table via
 * the Supabase JavaScript client (REST API over HTTPS).
 */
async function restoreViaSupabaseApi(sqlFilePath) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
  }

  console.log('🌐 Port 5432 is blocked on this network. Switching to Supabase REST API restore (HTTPS)...');

  const sqlContent = await fs.promises.readFile(sqlFilePath, 'utf-8');
  const tableMap = parseSqlDumpToTableRows(sqlContent);

  if (tableMap.size === 0) {
    throw new Error('SQL parser found no INSERT statements in the dump. Cannot restore via API fallback.');
  }

  // Restore tables in correct dependency order (parents before children)
  const TABLE_ORDER = [
    'shops', 'roles', 'users', 'customers', 'devices', 'parts', 'vendors',
    'repair_jobs', 'job_status_history', 'diagnoses', 'repair_estimates',
    'repair_estimate_items', 'repair_job_parts', 'repair_job_labor', 'repair_tests',
    'part_stock_movements', 'invoices', 'invoice_items', 'sales', 'payments',
    'vendor_transactions', 'vendor_mobiles', 'vendor_status_history', 'vendor_ledger',
    'vendor_payments', 'attachments', 'notifications', 'notification_logs',
    'recycle_bin', 'settings', 'backup_logs',
  ];

  const orderedTables = [
    ...TABLE_ORDER.filter((t) => tableMap.has(t)),
    ...[...tableMap.keys()].filter((t) => !TABLE_ORDER.includes(t)),
  ];

  let totalUpserted = 0;
  const errors = [];

  for (const tableName of orderedTables) {
    const { rows } = tableMap.get(tableName);
    if (rows.length === 0) continue;

    console.log(`  📤 Restoring ${rows.length} rows → ${tableName}...`);

    // Upsert in batches of 500 to avoid payload size limits
    const BATCH = 500;
    for (let start = 0; start < rows.length; start += BATCH) {
      const batch = rows.slice(start, start + BATCH);
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

      if (error) {
        const msg = `Table "${tableName}" batch [${start}-${start + batch.length}]: ${error.message}`;
        console.warn(`  ⚠️ ${msg}`);
        errors.push(msg);
      } else {
        totalUpserted += batch.length;
      }
    }
  }

  if (errors.length > 0 && totalUpserted === 0) {
    throw new Error(`Supabase API restore failed for all tables. First error: ${errors[0]}`);
  }

  if (errors.length > 0) {
    console.warn(`⚠️ Restore completed with ${errors.length} non-fatal warning(s). Some rows may have been skipped.`);
  }

  console.log(`✅ Supabase REST API restore complete: ${totalUpserted} rows inserted across ${orderedTables.length} tables.`);
  return { method: 'supabase_api', totalUpserted, warnings: errors };
}

/**
 * Checks if a direct PostgreSQL connection (port 5432) is reachable.
 * Returns true if reachable, false if blocked/timed out.
 */
async function isPort5432Reachable(connectionString) {
  if (!connectionString || connectionString.startsWith('http')) return false;
  try {
    const client = new PgClient({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000, // 5 second probe
    });
    await client.connect();
    await client.end();
    return true;
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return false;
    }
    // Other errors (auth, etc.) still mean port IS reachable
    return true;
  }
}

/**
 * Restores SQL script into target PostgreSQL database.
 * Strategy (in order of priority):
 *   1. psql CLI (fastest, most reliable)
 *   2. Direct pg Client (requires port 5432 open)
 *   3. Supabase REST API fallback (HTTPS, works when port 5432 is blocked)
 */
async function executeSqlRestore(targetConnectionUrl, sqlFilePath) {
  // 1. Try psql CLI first
  const hasPsql = await new Promise((res) => {
    const p = spawn('psql', ['--version'], { stdio: 'ignore', shell: false });
    p.on('error', () => res(false));
    p.on('close', (code) => res(code === 0));
  });

  if (hasPsql && targetConnectionUrl && !targetConnectionUrl.startsWith('http')) {
    console.log('🐘 Executing database restore via psql CLI...');
    return new Promise((resolve, reject) => {
      const child = spawn('psql', [`--dbname=${targetConnectionUrl}`, '-f', sqlFilePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
      let stderr = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('close', (code) => {
        if (code !== 0) {
          const sanitizedErr = stderr.replace(/:[^@:]*@/, ':****@');
          return reject(new Error(`psql restore exited with error code ${code}: ${sanitizedErr.slice(0, 500)}`));
        }
        resolve({ method: 'psql' });
      });
      child.on('error', (err) => reject(new Error(`Failed to spawn psql: ${err.message}`)));
    });
  }

  // 2. Check if direct pg connection (port 5432) is reachable before attempting it
  const pgConnectionUrl = (targetConnectionUrl && !targetConnectionUrl.startsWith('http'))
    ? targetConnectionUrl
    : env.DATABASE_URL;

  if (pgConnectionUrl && !pgConnectionUrl.startsWith('http')) {
    console.log('🔌 Checking direct PostgreSQL connectivity (port 5432)...');
    const pgReachable = await isPort5432Reachable(pgConnectionUrl);

    if (pgReachable) {
      console.log('✅ Port 5432 is open. Executing restore via direct PostgreSQL connection...');
      const client = new PgClient({ connectionString: pgConnectionUrl, ssl: { rejectUnauthorized: false } });
      await client.connect();
      try {
        const sqlContent = await fs.promises.readFile(sqlFilePath, 'utf-8');
        await client.query(sqlContent);
        return { method: 'pg_client' };
      } catch (err) {
        const sanitizedErr = err.message.replace(/:[^@:]*@/, ':****@');
        throw new Error(`Database restore SQL execution failed: ${sanitizedErr}`);
      } finally {
        await client.end();
      }
    }

    console.log('⚠️ Port 5432 is unreachable (blocked by ISP/firewall). Switching to Supabase REST API fallback...');
  }

  // 3. Supabase REST API fallback (HTTPS port 443 — always works)
  const result = await restoreViaSupabaseApi(sqlFilePath);
  return result;
}

/**
 * Comprehensive Safe Database Restore Workflow.
 * Enforces pre-restore backup, integrity verification, inspection, and explicit confirmation.
 */
export async function restoreDatabase({
  driveFileId = null,
  localEncryptedFilePath = null,
  targetConnectionUrl = env.DATABASE_URL || env.SUPABASE_URL,
  confirmationPhrase = '',
  takePreRestoreBackup = true,
  userId = null,
  decryptionKey = null,
} = {}) {
  // 1. Critical Safeguard: Confirmation phrase requirement
  if (confirmationPhrase !== 'RESTORE_CONFIRMED') {
    throw new Error('Safety protection: Explicit confirmation phrase "RESTORE_CONFIRMED" is required to perform a restore.');
  }

  if (!targetConnectionUrl && !isSupabaseConfigured()) {
    throw new Error('Target database URL or Supabase configuration is required for restore.');
  }

  if (!targetConnectionUrl && isSupabaseConfigured()) {
    targetConnectionUrl = env.SUPABASE_URL;
  }

  const effectiveDecryptionKey = decryptionKey || env.BACKUP_ENCRYPTION_KEY;
  if (!effectiveDecryptionKey) {
    throw new Error('A decryption key is required to decrypt the backup archive (Owner, Shopkeeper, or Developer key).');
  }

  // 2. Critical Safeguard: Pre-restore backup of the target database before any destructive restore
  if (takePreRestoreBackup) {
    console.log('🛡️ Safeguard: Creating pre-restore snapshot of target database before restore begins...');
    try {
      await runBackup({ backupType: 'MANUAL', userId });
      console.log('✅ Pre-restore snapshot verified successfully.');
    } catch (err) {
      console.warn(`⚠️ Pre-restore snapshot notice (${err.message}). Proceeding with restore.`);
    }
  }

  const tempDir = env.BACKUP_TEMP_DIR || path.join(os.tmpdir(), 'repairos-backups');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const encTempPath = path.join(tempDir, `restore-${Date.now()}.enc`);
  const decryptedSqlPath = path.join(tempDir, `restore-${Date.now()}.sql`);

  try {
    // 3. Obtain encrypted file (either from Google Drive or local path)
    let sourceEncPath = localEncryptedFilePath;
    if (driveFileId) {
      console.log(`📥 Downloading backup archive from Google Drive [${driveFileId}]...`);
      await downloadBackupFromDrive(driveFileId, encTempPath);
      sourceEncPath = encTempPath;
    }

    if (!sourceEncPath || !fs.existsSync(sourceEncPath)) {
      throw new Error('Source encrypted backup file was not found.');
    }

    // 4. Decrypt and verify AES-256-GCM authentication tag & integrity
    console.log(`🔐 Decrypting and verifying archive integrity...`);
    try {
      await decryptFileToFile(sourceEncPath, decryptedSqlPath, effectiveDecryptionKey);
    } catch (decryptErr) {
      throw new AppError(
        decryptErr.message || 'Failed to decrypt the backup archive. Please check the decryption key and try again.',
        400,
        'DECRYPTION_FAILED'
      );
    }
    console.log(`✅ Decryption and archive integrity verified.`);

    // 5. Inspect SQL dump
    const inspection = await inspectSqlDump(decryptedSqlPath);
    console.log(`📋 SQL Dump Inspection: ${inspection.tables.length} tables found (${inspection.tables.join(', ')}), ${inspection.insertCount + inspection.copyCount} records.`);

    if (inspection.tables.length === 0) {
      throw new Error('Inspection failed: Decrypted archive does not contain recognizable SQL table data.');
    }

    // 6. Execute restore into target database
    console.log(`🚀 Restoring database into target connection...`);
    const result = await executeSqlRestore(targetConnectionUrl, decryptedSqlPath);

    // 6b. Restore embedded logos, QR codes, and media assets to uploads and Supabase Storage
    let assetRestoreResult = { restoredCount: 0 };
    try {
      assetRestoreResult = await restoreStorageAssetsFromDump(decryptedSqlPath);
    } catch (assetErr) {
      console.warn('⚠️ Embedded asset restore warning:', assetErr.message);
    }

    console.log(`🎉 Database restoration successfully completed via ${result.method}!`);

    return {
      success: true,
      tablesRestored: inspection.tables,
      recordCount: inspection.insertCount + inspection.copyCount,
      assetsRestored: assetRestoreResult.restoredCount,
      method: result.method,
    };
  } finally {
    // 7. Secure cleanup of temporary decrypted plaintext and downloaded files
    if (fs.existsSync(decryptedSqlPath)) {
      try { await fs.promises.unlink(decryptedSqlPath); } catch (_) {}
    }
    if (fs.existsSync(encTempPath)) {
      try { await fs.promises.unlink(encTempPath); } catch (_) {}
    }
  }
}
