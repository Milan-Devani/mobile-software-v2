#!/usr/bin/env node
import readline from 'readline';
import { listBackupsFromDrive } from '../services/googleDriveService.js';
import { restoreDatabase } from '../services/restoreService.js';
import { env } from '../config/env.js';

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('================================================================');
  console.log('🚨 DATABASE RESTORE & DISASTER RECOVERY CLI WORKFLOW');
  console.log('================================================================\n');

  console.log('⚠️  CRITICAL WARNING: Restoring a database replaces tables and records.');
  console.log('    It is strongly recommended to restore into a separate recovery/staging database.');
  console.log('    A safety pre-restore backup will be created automatically before restore.\n');

  let driveFileId = null;
  let localPath = null;

  const mode = await ask('Restore from (1) Google Drive, or (2) Local .enc file? [1/2]: ');

  if (mode === '2') {
    localPath = await ask('Enter absolute or relative path to local .enc file: ');
  } else {
    console.log('🔍 Fetching available backups from Google Drive...');
    try {
      const backups = await listBackupsFromDrive();
      if (backups.length === 0) {
        console.error('❌ No backup archives found in your Google Drive backup folder.');
        process.exit(1);
      }

      console.log('\nAvailable Backups in Google Drive:');
      backups.slice(0, 10).forEach((b, idx) => {
        const sizeMb = (b.sizeBytes / 1024 / 1024).toFixed(2);
        console.log(`  [${idx + 1}] ${b.name} (${sizeMb} MB) - Created: ${b.createdTime}`);
      });

      const selection = await ask('\nEnter the number of the backup to restore [1]: ') || '1';
      const selectedIndex = parseInt(selection, 10) - 1;

      if (selectedIndex < 0 || selectedIndex >= backups.length) {
        console.error('❌ Invalid selection.');
        process.exit(1);
      }

      driveFileId = backups[selectedIndex].id;
      console.log(`✅ Selected backup: "${backups[selectedIndex].name}" (ID: ${driveFileId})`);
    } catch (err) {
      console.error('❌ Failed to list backups from Google Drive:', err.message);
      process.exit(1);
    }
  }

  // Target database
  console.log('\nTarget Database:');
  const targetUrlInput = await ask(`Enter target PostgreSQL connection string (Press Enter to use current DATABASE_URL): `);
  const targetConnectionUrl = targetUrlInput || env.DATABASE_URL;

  if (!targetConnectionUrl) {
    console.error('❌ Target connection URL is required.');
    process.exit(1);
  }

  // Safety confirmation
  console.log('\n================================================================');
  console.log('🛡️  SAFETY CONFIRMATION');
  console.log('================================================================');
  console.log(`Target: ${targetConnectionUrl.replace(/:[^@:]*@/, ':****@')}`);
  console.log('To confirm this restore operation, type exactly "RESTORE_CONFIRMED":');
  const confirmation = await ask('👉 Confirmation phrase: ');

  if (confirmation !== 'RESTORE_CONFIRMED') {
    console.log('❌ Restore cancelled: Confirmation phrase did not match.');
    process.exit(0);
  }

  console.log('\n⏳ Beginning safe restore workflow...');

  try {
    const result = await restoreDatabase({
      driveFileId,
      localEncryptedFilePath: localPath,
      targetConnectionUrl,
      confirmationPhrase: confirmation,
      takePreRestoreBackup: true,
    });

    console.log('\n================================================================');
    console.log('🎉 DATABASE RESTORE COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    console.log(`Tables restored: ${result.tablesRestored.join(', ')}`);
    console.log(`Total records:   ${result.recordCount}`);
    console.log(`Method used:     ${result.method}`);
  } catch (err) {
    console.error('\n❌ Restore failed:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected restore error:', err);
  process.exit(1);
});
