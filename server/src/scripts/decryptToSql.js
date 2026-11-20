import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { decryptFileToFile } from '../services/encryptionService.js';
import { restoreStorageAssetsFromDump } from '../services/assetBackupService.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

async function main() {
  console.log('================================================================');
  console.log('🔓 MOBOTECH BACKUP DECRYPTOR & ASSET RESTORER');
  console.log('================================================================\n');

  // Find latest .enc backup
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith('.enc'))
    .map(f => ({ name: f, path: path.join(BACKUPS_DIR, f), time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    console.error('❌ No .enc backup files found in server/backups/');
    process.exit(1);
  }

  const latest = files[0];
  console.log(`📦 Latest backup found: "${latest.name}" (${(fs.statSync(latest.path).size / 1024 / 1024).toFixed(2)} MB)`);

  const tempDecryptedPath = path.join(BACKUPS_DIR, 'temp_full_restore.sql');
  const cleanSqlPath = path.join(BACKUPS_DIR, 'restore-data.sql');

  try {
    // 1. Decrypt full archive (accepts optional key via argv[2] or DECRYPTION_KEY env)
    const decryptionKey = process.argv[2] || process.env.DECRYPTION_KEY || env.BACKUP_ENCRYPTION_KEY;
    console.log('\n🔐 Decrypting backup archive with AES-256-GCM cipher...');
    await decryptFileToFile(latest.path, tempDecryptedPath, decryptionKey);
    console.log('✅ Decryption verified with integrity authentication tag.');

    // 2. Restore all embedded logo image files and media assets
    console.log('\n🖼️ Restoring logo image files and media assets...');
    const assetResult = await restoreStorageAssetsFromDump(tempDecryptedPath);
    console.log(`✅ Restored ${assetResult.restoredCount} logo and media file(s) to server/uploads and Supabase Storage.`);

    // 3. Extract clean SQL (excluding the massive base64 asset lines for quick pasting)
    console.log('\n📝 Generating clean database SQL file (without base64 blobs)...');
    const fullContent = fs.readFileSync(tempDecryptedPath, 'utf-8');
    
    // Split lines and keep all table definitions and data except _app_backup_assets
    const lines = fullContent.split('\n');
    const cleanLines = [];
    let skipSection = false;

    for (const line of lines) {
      if (line.includes('-- EMBEDDED MEDIA ASSETS & LOGOS BACKUP')) {
        skipSection = true;
      }
      if (skipSection) continue;
      cleanLines.push(line);
    }

    fs.writeFileSync(cleanSqlPath, cleanLines.join('\n'), 'utf-8');
    const cleanStat = fs.statSync(cleanSqlPath);
    console.log(`✅ Generated clean SQL file: "${cleanSqlPath}" (${(cleanStat.size / 1024).toFixed(1)} KB)`);

    console.log('\n================================================================');
    console.log('🎉 RESTORE ASSETS READY!');
    console.log('================================================================');
    console.log('1. All your logo files and images have been restored to disk & storage.');
    console.log(`2. To restore your database tables, open "${cleanSqlPath}",`);
    console.log('   copy all content, paste into Supabase SQL Editor, and click RUN.');
    console.log('================================================================');
  } finally {
    if (fs.existsSync(tempDecryptedPath)) {
      try { fs.unlinkSync(tempDecryptedPath); } catch (_) {}
    }
  }
}

main().catch(err => {
  console.error('\n❌ Decryption failed:', err.message);
  process.exit(1);
});
