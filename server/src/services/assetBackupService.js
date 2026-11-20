import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { env } from '../config/env.js';
import { db } from '../db/db.js';
import { getSupabase, isSupabaseConfigured, uploadToSupabaseStorage } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function withTimeout(promise, ms = 4000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function getMimeType(fileName, fallback = 'image/png') {
  const ext = path.extname(fileName).toLowerCase();
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
  };
  return map[ext] || fallback;
}

function extractFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || `asset-${Date.now()}.png`;
  } catch (_) {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0] || `asset-${Date.now()}.png`;
  }
}

/**
 * Downloads a remote image/asset URL into a Buffer.
 */
async function fetchUrlBuffer(url, timeoutMs = 8000) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'MobotechBackupEngine/1.0',
      },
    });
    return {
      buffer: Buffer.from(res.data),
      mimeType: res.headers['content-type'] || getMimeType(url),
    };
  } catch (err) {
    console.warn(`⚠️ Could not fetch asset from URL "${url}": ${err.message}`);
    return null;
  }
}

/**
 * Collects all shop logos, uploaded images, and asset files across:
 * 1. Shop profile (logo_url)
 * 2. Settings (logo_url_dark, instagram_qr_url)
 * 3. Attachments table (device check-in photos, receipts)
 * 4. Local server/uploads/ directory
 * 5. Supabase Storage bucket ('repair-assets')
 */
export async function collectAllAssets() {
  const assetMap = new Map(); // fileName -> { fileName, mimeType, assetType, publicUrl, sizeBytes, base64Data }

  // 1. Collect local files from server/uploads/
  if (fs.existsSync(UPLOADS_DIR)) {
    try {
      const files = await fs.promises.readdir(UPLOADS_DIR);
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const fullPath = path.join(UPLOADS_DIR, file);
        const stat = await fs.promises.stat(fullPath);
        if (!stat.isFile()) continue;

        const buf = await fs.promises.readFile(fullPath);
        assetMap.set(file, {
          fileName: file,
          mimeType: getMimeType(file),
          assetType: 'LOCAL_UPLOAD',
          publicUrl: `${env.API_URL}/uploads/${file}`,
          sizeBytes: stat.size,
          base64Data: buf.toString('base64'),
        });
      }
    } catch (err) {
      console.warn('⚠️ Error scanning local uploads directory for backup:', err.message);
    }
  }

  // 2. Collect Shop Profile Logos and Instagram QR
  try {
    let shop = null;
    let extra = {};

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: shopData } = await withTimeout(supabase.from('shops').select('*').limit(1).single(), 3000);
        if (shopData) shop = shopData;

        const { data: settingData } = await withTimeout(supabase.from('settings').select('*').eq('key', 'shop_profile_extra').single(), 3000);
        if (settingData?.value) extra = settingData.value;
      } catch (_) {}
    }

    if (!shop && db.shops?.getProfile) {
      try {
        shop = await db.shops.getProfile();
      } catch (_) {}
    }
    if (Object.keys(extra).length === 0 && db.settings?.get) {
      try {
        extra = (await db.settings.get('shop_profile_extra')) || {};
      } catch (_) {}
    }

    const shopAssets = [
      { url: shop?.logo_url, type: 'SHOP_LOGO_LIGHT' },
      { url: extra?.logo_url_dark, type: 'SHOP_LOGO_DARK' },
      { url: extra?.instagram_qr_url, type: 'INSTAGRAM_QR' },
    ];

    for (const item of shopAssets) {
      if (!item.url || typeof item.url !== 'string') continue;
      const trimmed = item.url.trim();
      if (!trimmed || trimmed.startsWith('data:image/')) continue; // Skip inline data URLs

      // Check if it's an Instagram profile link (not an image)
      if (item.type === 'INSTAGRAM_QR' && !trimmed.match(/\.(png|jpg|jpeg|webp|svg)/i)) {
        continue;
      }

      const fileName = extractFilenameFromUrl(trimmed);

      // If we don't already have this asset buffer from local uploads
      if (!assetMap.has(fileName)) {
        const fetched = await fetchUrlBuffer(trimmed);
        if (fetched) {
          assetMap.set(fileName, {
            fileName,
            mimeType: fetched.mimeType,
            assetType: item.type,
            publicUrl: trimmed,
            sizeBytes: fetched.buffer.length,
            base64Data: fetched.buffer.toString('base64'),
          });
        }
      } else {
        // Tag with more specific asset type if it was from local uploads
        const existing = assetMap.get(fileName);
        existing.assetType = item.type;
        existing.publicUrl = trimmed;
      }
    }
  } catch (err) {
    console.warn('⚠️ Error collecting shop logo assets:', err.message);
  }

  // 3. Collect from Attachments table
  try {
    let attachments = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: attData } = await withTimeout(supabase.from('attachments').select('*').limit(100), 3000);
        if (Array.isArray(attData)) attachments = attData;
      } catch (_) {}
    }
    if (attachments.length === 0 && db.attachments?.list) {
      try {
        const localAtt = await db.attachments.list({ limit: 100 });
        if (Array.isArray(localAtt)) attachments = localAtt;
      } catch (_) {}
    }

    if (Array.isArray(attachments)) {
      for (const att of attachments) {
        const fileName = att.file_name || att.fileName || (att.file_url ? extractFilenameFromUrl(att.file_url) : null);
        if (!fileName || assetMap.has(fileName)) continue;

        if (att.file_url && (att.file_url.startsWith('http://') || att.file_url.startsWith('https://'))) {
          const fetched = await fetchUrlBuffer(att.file_url);
          if (fetched) {
            assetMap.set(fileName, {
              fileName,
              mimeType: att.mime_type || fetched.mimeType,
              assetType: att.file_type || 'ATTACHMENT',
              publicUrl: att.file_url,
              sizeBytes: fetched.buffer.length,
              base64Data: fetched.buffer.toString('base64'),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Error collecting attachment records:', err.message);
  }

  // 4. Collect from Supabase Storage bucket ('repair-assets')
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const bucketName = env.SUPABASE_STORAGE_BUCKET || 'repair-assets';
      const { data: storageFiles, error } = await withTimeout(supabase.storage.from(bucketName).list(), 3000);

      if (!error && Array.isArray(storageFiles)) {
        for (const sf of storageFiles) {
          if (!sf.name || sf.name === '.emptyFolderPlaceholder' || assetMap.has(sf.name)) continue;

          try {
            const { data: blob, error: dlErr } = await withTimeout(supabase.storage.from(bucketName).download(sf.name), 4000);
            if (!dlErr && blob) {
              const arrayBuffer = await blob.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(sf.name);

              assetMap.set(sf.name, {
                fileName: sf.name,
                mimeType: blob.type || getMimeType(sf.name),
                assetType: 'SUPABASE_STORAGE_FILE',
                publicUrl: publicUrlData?.publicUrl || '',
                sizeBytes: buffer.length,
                base64Data: buffer.toString('base64'),
              });
            }
          } catch (itemErr) {
            console.warn(`⚠️ Failed to download Supabase Storage file "${sf.name}":`, itemErr.message);
          }
        }
      }
    } catch (sbErr) {
      console.warn('⚠️ Supabase Storage list error:', sbErr.message);
    }
  }

  const assets = Array.from(assetMap.values());
  return assets;
}

/**
 * Appends assets table and data to raw SQL dump.
 */
export async function appendStorageAssetsToDump(sqlFilePath) {
  console.log('🖼️ Collecting logo images, QR codes, and media assets for backup...');
  const assets = await collectAllAssets();

  if (assets.length === 0) {
    console.log('ℹ️ No image or media assets found to archive.');
    return { assetCount: 0, totalBytes: 0 };
  }

  let totalBytes = 0;
  for (const a of assets) {
    totalBytes += a.sizeBytes || 0;
  }

  console.log(`📦 Bundling ${assets.length} image & media assets (${(totalBytes / 1024).toFixed(1)} KB) into backup archive...`);

  const writeStream = fs.createWriteStream(sqlFilePath, { flags: 'a', encoding: 'utf-8' });

  writeStream.write('\n\n-- ========================================================\n');
  writeStream.write('-- EMBEDDED MEDIA ASSETS & LOGOS BACKUP\n');
  writeStream.write(`-- Total Assets: ${assets.length} | Size: ${(totalBytes / 1024).toFixed(1)} KB\n`);
  writeStream.write('-- ========================================================\n\n');

  writeStream.write('CREATE TABLE IF NOT EXISTS public."_app_backup_assets" (\n');
  writeStream.write('  "file_name" text PRIMARY KEY,\n');
  writeStream.write('  "mime_type" text,\n');
  writeStream.write('  "asset_type" text,\n');
  writeStream.write('  "public_url" text,\n');
  writeStream.write('  "size_bytes" bigint,\n');
  writeStream.write('  "data_base64" text,\n');
  writeStream.write('  "created_at" text\n');
  writeStream.write(');\n\n');

  for (const asset of assets) {
    const safeFileName = asset.fileName.replace(/'/g, "''");
    const safeMime = (asset.mimeType || 'image/png').replace(/'/g, "''");
    const safeType = (asset.assetType || 'ASSET').replace(/'/g, "''");
    const safeUrl = (asset.publicUrl || '').replace(/'/g, "''");
    const safeB64 = asset.base64Data || '';
    const safeSize = asset.sizeBytes || 0;
    const nowIso = new Date().toISOString();

    writeStream.write(
      `INSERT INTO public."_app_backup_assets" ("file_name", "mime_type", "asset_type", "public_url", "size_bytes", "data_base64", "created_at") ` +
      `VALUES ('${safeFileName}', '${safeMime}', '${safeType}', '${safeUrl}', ${safeSize}, '${safeB64}', '${nowIso}') ` +
      `ON CONFLICT ("file_name") DO UPDATE SET ` +
      `"data_base64" = EXCLUDED."data_base64", "public_url" = EXCLUDED."public_url", "mime_type" = EXCLUDED."mime_type", "size_bytes" = EXCLUDED."size_bytes";\n`
    );
  }

  await new Promise((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });

  console.log(`✅ Successfully embedded ${assets.length} logos and assets into backup SQL.`);
  return { assetCount: assets.length, totalBytes };
}

/**
 * Restores embedded assets from a decrypted SQL file or database:
 * 1. Saves them into server/uploads/
 * 2. Re-uploads them to Supabase Storage if configured
 */
export async function restoreStorageAssetsFromDump(sqlFilePath) {
  console.log('🔄 Checking for embedded logos and media assets in decrypted backup...');
  if (!fs.existsSync(sqlFilePath)) return { restoredCount: 0 };

  const content = await fs.promises.readFile(sqlFilePath, 'utf-8');
  if (!content.includes('_app_backup_assets')) {
    console.log('ℹ️ No embedded assets table found in this backup.');
    return { restoredCount: 0 };
  }

  // Regex extract INSERT statements for _app_backup_assets
  const insertRegex = /INSERT INTO\s+public\."_app_backup_assets"\s*\([^)]+\)\s*VALUES\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*(\d+),\s*'([^']+)',/gi;

  let match;
  let restoredCount = 0;

  while ((match = insertRegex.exec(content)) !== null) {
    const fileName = match[1].replace(/''/g, "'");
    const mimeType = match[2].replace(/''/g, "'");
    const assetType = match[3].replace(/''/g, "'");
    const publicUrl = match[4].replace(/''/g, "'");
    const sizeBytes = parseInt(match[5], 10);
    const base64Data = match[6];

    if (!fileName || !base64Data) continue;

    try {
      const buffer = Buffer.from(base64Data, 'base64');

      // 1. Save to local server/uploads/
      const localFilePath = path.join(UPLOADS_DIR, fileName);
      await fs.promises.writeFile(localFilePath, buffer);

      // 2. Upload to Supabase Storage if configured
      if (isSupabaseConfigured()) {
        try {
          await uploadToSupabaseStorage(
            buffer,
            fileName,
            mimeType,
            env.SUPABASE_STORAGE_BUCKET || 'repair-assets'
          );
        } catch (sbErr) {
          console.warn(`⚠️ Could not restore asset "${fileName}" to Supabase Storage:`, sbErr.message);
        }
      }

      restoredCount++;
      console.log(`   ✅ Restored asset: "${fileName}" (${(buffer.length / 1024).toFixed(1)} KB, type: ${assetType})`);
    } catch (itemErr) {
      console.warn(`⚠️ Failed to restore asset "${fileName}":`, itemErr.message);
    }
  }

  console.log(`🎉 Successfully restored ${restoredCount} logo and media asset file(s).`);
  return { restoredCount };
}
