#!/usr/bin/env node
import { runBackup } from '../services/backupService.js';
import { initDb } from '../db/db.js';

async function main() {
  console.log('====================================================');
  console.log(`⏰ RENDER CRON / SCHEDULED BACKUP WORKER`);
  console.log(`   Time: ${new Date().toISOString()} (UTC)`);
  console.log('====================================================');

  try {
    // Initialize database connectivity (local cache & Supabase)
    await initDb();

    const result = await runBackup({
      backupType: 'SCHEDULED',
      userId: null,
    });

    console.log(`✅ Scheduled backup finished successfully:`);
    console.log(`   Filename:  ${result.filename}`);
    console.log(`   Drive ID:  ${result.drive_file_id}`);
    console.log(`   Size:      ${(result.file_size_bytes / 1024).toFixed(1)} KB`);
    console.log(`   Duration:  ${(result.duration_ms / 1000).toFixed(2)}s`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Scheduled backup failed:`, err.message);
    process.exit(1);
  }
}

main();
