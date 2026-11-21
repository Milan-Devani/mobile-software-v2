#!/usr/bin/env node
import readline from 'readline';
import { listBackupsFromDrive } from '../services/googleDriveService.js';
import { restoreDatabase } from '../services/restoreService.js';
import { initDb } from '../db/db.js';
import { env } from '../config/env.js';

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  await initDb();
  console.log('================================================================');
  console.log('🚨 DATABASE RESTORE & DISASTER RECOVERY CLI WORKFLOW');
  console.log('================================================================\n');

  console.log('⚠️  CRITICAL WARNING: Restoring a database replaces tables and records.');
  console.log('    It is strongly recommended to restore into a separate recovery/staging database.');
  console.log('    A safety pre-restore backup will be created automatically before restore.\n');

  let driveFileId = null;
  let localPath = null;

  const mode = await ask('Restore from (1) Google Drive, or (2) Local .enc file? [1/2]: ');

  let selectedFileName = null;
  if (mode === '2') {
    localPath = await ask('Enter absolute or relative path to local backup file (.sql or .enc): ');
    selectedFileName = localPath;
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
      selectedFileName = backups[selectedIndex].name;
      console.log(`✅ Selected backup: "${selectedFileName}" (ID: ${driveFileId})`);
    } catch (err) {
      console.error('❌ Failed to list backups from Google Drive:', err.message);
      process.exit(1);
    }
  }

  // Decryption key — only required for legacy .enc files
  let decryptionKey = null;
  const isEncryptedFile = (selectedFileName && selectedFileName.endsWith('.enc'));
  if (isEncryptedFile) {
    console.log('\nDecryption Key:');
    console.log('  ℹ️  Enter the Owner (64-char hex), Shopkeeper, or Developer key.');
    console.log('  👉 Press Enter (type nothing) to automatically use the configured Owner key.\n');
    decryptionKey = await ask('👉 Decryption key (press Enter for Owner key): ') || null;
  } else {
    console.log('\n📄 Selected backup is unencrypted plaintext SQL (.sql). Decryption bypassed.');
  }

  // Target database
  const defaultTarget = env.DATABASE_URL || env.SUPABASE_URL;
  console.log('\nTarget Database:');
  if (defaultTarget) {
    console.log(`  ℹ️  Configured default: ${defaultTarget.replace(/:[^@:]*@/, ':****@')}`);
    console.log('  👉 Press Enter to restore into this configured database (recommended).');
  }
  console.log('  ℹ️  Or enter an external PostgreSQL URI: postgresql://user:pass@host:5432/dbname\n');

  let targetConnectionUrl = defaultTarget;
  while (true) {
    const promptText = defaultTarget
      ? `Enter target database (Press Enter to use ${defaultTarget.replace(/:[^@:]*@/, ':****@')}): `
      : `Enter target PostgreSQL connection string (postgresql://...): `;
    const targetUrlInput = await ask(promptText);

    if (!targetUrlInput) {
      targetConnectionUrl = defaultTarget;
      break;
    }

    // Allow Supabase project URL (it will use Supabase REST API)
    if (targetUrlInput.includes('.supabase.co')) {
      targetConnectionUrl = targetUrlInput;
      console.log('  ✅ Selected Supabase API restore mode (HTTPS port 443).');
      break;
    }

    // Other HTTP/HTTPS URLs (like dashboard pages)
    if (targetUrlInput.startsWith('http://') || targetUrlInput.startsWith('https://')) {
      if (defaultTarget) {
        console.log(`  ℹ️  Defaulting to configured: ${defaultTarget}`);
        targetConnectionUrl = defaultTarget;
        break;
      }
      console.log('\n  ❌ Unrecognized URL format. Please provide a postgresql:// URI or press Enter to use default.');
      continue;
    }

    if (!targetUrlInput.startsWith('postgresql://') && !targetUrlInput.startsWith('postgres://')) {
      console.log('\n  ❌ Invalid format. Connection string must start with postgresql:// or postgres://');
      if (defaultTarget) {
        console.log(`  ✅ Or press Enter to use configured: ${defaultTarget}\n`);
      }
      continue;
    }

    targetConnectionUrl = targetUrlInput;
    break;
  }

  if (!targetConnectionUrl) {
    console.error('❌ No target database configured. Please configure SUPABASE_URL or DATABASE_URL in your .env file.');
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
      decryptionKey,
    });

    console.log('\n================================================================');
    console.log('🎉 DATABASE RESTORE COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    console.log(`Tables restored: ${result.tablesRestored.join(', ')}`);
    console.log(`Total records:   ${result.recordCount}`);
    if (result.assetsRestored !== undefined) {
      console.log(`Assets restored:  ${result.assetsRestored} file(s) (logos & media)`);
    }
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
