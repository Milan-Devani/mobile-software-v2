import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import pkg from 'pg';
const { Client: PgClient } = pkg;
import { env } from '../config/env.js';
import { decryptFileToFile } from './encryptionService.js';
import { downloadBackupFromDrive } from './googleDriveService.js';
import { runBackup } from './backupService.js';

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
 * Restores SQL script into target PostgreSQL database using psql CLI if available, or direct pg Client.
 */
async function executeSqlRestore(targetConnectionUrl, sqlFilePath) {
  return new Promise(async (resolve, reject) => {
    // Check if psql CLI is available
    const hasPsql = await new Promise((res) => {
      const p = spawn('psql', ['--version'], { stdio: 'ignore', shell: false });
      p.on('error', () => res(false));
      p.on('close', (code) => res(code === 0));
    });

    if (hasPsql) {
      console.log('🐘 Executing database restore via psql CLI...');
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
      return;
    }

    // Direct pg Client restore execution
    console.log('🔄 psql CLI not available. Executing restore via direct PostgreSQL connection...');
    const client = new PgClient({ connectionString: targetConnectionUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
      const sqlContent = await fs.promises.readFile(sqlFilePath, 'utf-8');
      await client.query(sqlContent);
      resolve({ method: 'pg_client' });
    } catch (err) {
      const sanitizedErr = err.message.replace(/:[^@:]*@/, ':****@');
      reject(new Error(`Database restore SQL execution failed: ${sanitizedErr}`));
    } finally {
      await client.end();
    }
  });
}

/**
 * Comprehensive Safe Database Restore Workflow.
 * Enforces pre-restore backup, integrity verification, inspection, and explicit confirmation.
 */
export async function restoreDatabase({
  driveFileId = null,
  localEncryptedFilePath = null,
  targetConnectionUrl = env.DATABASE_URL,
  confirmationPhrase = '',
  takePreRestoreBackup = true,
  userId = null,
} = {}) {
  // 1. Critical Safeguard: Confirmation phrase requirement
  if (confirmationPhrase !== 'RESTORE_CONFIRMED') {
    throw new Error('Safety protection: Explicit confirmation phrase "RESTORE_CONFIRMED" is required to perform a restore.');
  }

  if (!targetConnectionUrl) {
    throw new Error('Target database URL is required for restore.');
  }

  if (!env.BACKUP_ENCRYPTION_KEY) {
    throw new Error('BACKUP_ENCRYPTION_KEY is required to decrypt the backup archive.');
  }

  // 2. Critical Safeguard: Pre-restore backup of the target database before any destructive restore
  if (takePreRestoreBackup) {
    console.log('🛡️ Safeguard: Creating pre-restore snapshot of target database before restore begins...');
    try {
      await runBackup({ backupType: 'MANUAL', userId });
      console.log('✅ Pre-restore snapshot verified successfully.');
    } catch (err) {
      throw new Error(`Pre-restore safety backup failed: ${err.message}. Aborting restore to protect existing data.`);
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
    await decryptFileToFile(sourceEncPath, decryptedSqlPath, env.BACKUP_ENCRYPTION_KEY);
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

    console.log(`🎉 Database restoration successfully completed via ${result.method}!`);

    return {
      success: true,
      tablesRestored: inspection.tables,
      recordCount: inspection.insertCount + inspection.copyCount,
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
