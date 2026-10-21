import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert';
import {
  deriveKey,
  generateRandomEncryptionKey,
  encryptFileToFile,
  decryptFileToFile,
} from '../services/encryptionService.js';
import {
  generateBackupFilename,
  parseDateFromBackupFilename,
} from '../services/backupService.js';
import { db, initDb } from '../db/db.js';

let passed = 0;
let failed = 0;

function logTest(name, isPass, detail = '') {
  if (isPass) {
    passed++;
    console.log(`✅ [PASS] ${name}`);
  } else {
    failed++;
    console.error(`❌ [FAIL] ${name} ${detail ? '- ' + detail : ''}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 DATABASE BACKUP & RESTORE INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  await initDb();
  const tempDir = path.join(os.tmpdir(), `backup-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const testKeyHex = generateRandomEncryptionKey();
  const testKeyPassphrase = 'my-super-secret-backup-passphrase-2026';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Key Derivation
    // -------------------------------------------------------------------------
    console.log('--- 1. Encryption Key Derivation ---');
    const keyFromHex = deriveKey(testKeyHex);
    logTest('Key derived from 64-hex string is 32 bytes', keyFromHex.length === 32);

    const keyFromPassphrase = deriveKey(testKeyPassphrase);
    logTest('Key derived from passphrase via scrypt is 32 bytes', keyFromPassphrase.length === 32);

    let keyEmptyThrows = false;
    try {
      deriveKey('');
    } catch (_) {
      keyEmptyThrows = true;
    }
    logTest('Empty key throws configuration error', keyEmptyThrows);

    // -------------------------------------------------------------------------
    // TEST 2: Encryption & Decryption Round-Trip with AES-256-GCM
    // -------------------------------------------------------------------------
    console.log('\n--- 2. AES-256-GCM Authenticated Encryption & Decryption ---');
    const originalText = 'CREATE TABLE test_data (id SERIAL PRIMARY KEY, note TEXT);\nINSERT INTO test_data (note) VALUES (\'Hello Backup World 2026!\');\n';
    const originalFilePath = path.join(tempDir, 'sample_dump.sql');
    const encryptedFilePath = path.join(tempDir, 'sample_dump.enc');
    const decryptedFilePath = path.join(tempDir, 'decrypted_dump.sql');

    fs.writeFileSync(originalFilePath, originalText, 'utf-8');

    const encResult = await encryptFileToFile(originalFilePath, encryptedFilePath, testKeyHex);
    logTest('Encrypted archive created on disk', fs.existsSync(encryptedFilePath) && encResult.fileSizeBytes > 0);

    const decResult = await decryptFileToFile(encryptedFilePath, decryptedFilePath, testKeyHex);
    logTest('Decryption completed and verified integrity tag', decResult.verified === true);

    const decryptedText = fs.readFileSync(decryptedFilePath, 'utf-8');
    logTest('Decrypted SQL content matches original byte-for-byte', decryptedText === originalText);

    // -------------------------------------------------------------------------
    // TEST 3: Integrity Tamper Detection
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Tamper Detection & Integrity Failure Handling ---');
    const tamperedFilePath = path.join(tempDir, 'tampered_dump.enc');
    const tamperedDecryptedPath = path.join(tempDir, 'tampered_out.sql');

    const encBytes = fs.readFileSync(encryptedFilePath);
    // Flip one byte in ciphertext
    encBytes[35] = encBytes[35] ^ 0xff;
    fs.writeFileSync(tamperedFilePath, encBytes);

    let tamperCaught = false;
    try {
      await decryptFileToFile(tamperedFilePath, tamperedDecryptedPath, testKeyHex);
    } catch (err) {
      tamperCaught = true;
    }
    logTest('Tampered archive fails AES-GCM authentication and is safely rejected', tamperCaught);
    logTest('Tampered output file cleaned up on failure', !fs.existsSync(tamperedDecryptedPath));

    // Wrong Key Test
    let wrongKeyCaught = false;
    try {
      const wrongKey = generateRandomEncryptionKey();
      await decryptFileToFile(encryptedFilePath, tamperedDecryptedPath, wrongKey);
    } catch (err) {
      wrongKeyCaught = true;
    }
    logTest('Decryption with incorrect key fails authentication safely', wrongKeyCaught);

    // -------------------------------------------------------------------------
    // TEST 4: Backup Naming and Date Parsing
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Backup Naming & Date Parsing ---');
    const testDate = new Date('2026-10-21T02:00:00Z');
    const generatedFilename = generateBackupFilename(testDate);
    logTest(
      'Filename matches standardized pattern supabase-backup-YYYY-MM-DD-HH-mm-ss.enc',
      /^supabase-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.enc$/.test(generatedFilename)
    );

    const parsedDate = parseDateFromBackupFilename(generatedFilename);
    logTest(
      'Parsed date from filename extracts valid year/month/day/hour',
      parsedDate instanceof Date && !isNaN(parsedDate.getTime())
    );

    // -------------------------------------------------------------------------
    // TEST 5: Distributed Lock and Concurrency Guard
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Concurrency Guard & Lock Management ---');
    const testLockJob = await db.backup_logs.create({
      backup_type: 'MANUAL',
      status: 'RUNNING',
      filename: 'lock-test.enc',
    });

    const activeRunningJob = await db.backup_logs.getRunningJob();
    logTest('getRunningJob detects in-progress active job', activeRunningJob !== null && activeRunningJob.id === testLockJob.id);

    // Release lock
    await db.backup_logs.update(testLockJob.id, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      file_size_bytes: 1024,
      duration_ms: 500,
    });

    const releasedJob = await db.backup_logs.getRunningJob();
    logTest('Released job no longer blocks subsequent backup runs', releasedJob === null);

    // -------------------------------------------------------------------------
    // TEST 6: Backup Log History & Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Backup Logs Repository ---');
    const historyRes = await db.backup_logs.list({ limit: 10, offset: 0 });
    logTest('Backup history list returns array', Array.isArray(historyRes.backups));
    logTest('Latest backup is retrievable', (await db.backup_logs.getLatest()) !== null);

    // -------------------------------------------------------------------------
    // TEST 7: API Authorization & Endpoints (HTTP Simulation)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Express API Route Security Verification ---');
    const baseUrl = 'http://127.0.0.1:5000/api';

    // 7.1 Unauthenticated requests must receive 401
    const unauthStatusRes = await fetch(`${baseUrl}/backups/status`);
    logTest('GET /api/backups/status unauthenticated returns 401', unauthStatusRes.status === 401);

    const unauthListRes = await fetch(`${baseUrl}/backups`);
    logTest('GET /api/backups unauthenticated returns 401', unauthListRes.status === 401);

    const unauthPostRes = await fetch(`${baseUrl}/backups`, { method: 'POST' });
    logTest('POST /api/backups unauthenticated returns 401', unauthPostRes.status === 401);

    // 7.2 Technician role (non-admin) must receive 403 Forbidden
    const techLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tech@mobotech.com', password: 'Tech@123456' }),
    }).then((r) => r.json());

    if (techLoginRes.data?.token) {
      const techRes = await fetch(`${baseUrl}/backups`, {
        headers: { Authorization: `Bearer ${techLoginRes.data.token}` },
      });
      logTest('GET /api/backups as Technician returns 403 Forbidden', techRes.status === 403);
    } else {
      logTest('Technician authentication check', false, 'Could not authenticate technician');
    }

    // 7.3 Admin role must receive 200 OK
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mobotech.com', password: 'Admin@123456' }),
    }).then((r) => r.json());

    if (adminLoginRes.data?.token) {
      const adminToken = adminLoginRes.data.token;

      const adminStatusRes = await fetch(`${baseUrl}/backups/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const statusBody = await adminStatusRes.json();
      logTest('GET /api/backups/status as Admin returns 200 OK with status data', adminStatusRes.status === 200 && statusBody.success === true);

      const adminHistoryRes = await fetch(`${baseUrl}/backups`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const historyBody = await adminHistoryRes.json();
      logTest('GET /api/backups as Admin returns 200 OK with history list', adminHistoryRes.status === 200 && Array.isArray(historyBody.data?.backups));

      // Test Restore safety guard on endpoint
      const restoreFailRes = await fetch(`${baseUrl}/backups/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ confirmation_phrase: 'WRONG_PHRASE' }),
      });
      logTest('POST /api/backups/restore rejects invalid confirmation phrase with 400', restoreFailRes.status === 400);
    } else {
      logTest('Admin authentication check', false, 'Could not authenticate admin');
    }

  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }

  console.log('\n================================================================');
  console.log(`📊 EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
