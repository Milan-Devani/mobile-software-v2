import { google } from 'googleapis';
import fs from 'fs';
import { env } from '../config/env.js';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const DEFAULT_FOLDER_NAME = 'Supabase Database Backups';

/**
 * Creates and configures an authenticated Google Drive API client using OAuth2 refresh tokens.
 */
export function getDriveClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google Drive credentials are not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.');
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  oauth2Client.setCredentials({
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Executes a function with bounded retries and exponential backoff for transient errors (429, 5xx, timeouts).
 */
async function withRetry(fn, maxRetries = 3, initialDelayMs = 1000) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = err.status || err.code;
      const isRetryable =
        status === 429 ||
        (typeof status === 'number' && status >= 500 && status < 600) ||
        err.message?.includes('ETIMEDOUT') ||
        err.message?.includes('ECONNRESET');

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Google Drive API transient error (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Resolves the backup folder ID in Google Drive.
 * If GOOGLE_DRIVE_FOLDER_ID is configured, verifies access.
 * Otherwise, searches for or creates a private folder named "Supabase Database Backups".
 */
export async function getOrCreateBackupFolder(drive) {
  if (env.GOOGLE_DRIVE_FOLDER_ID && env.GOOGLE_DRIVE_FOLDER_ID.trim()) {
    const configuredId = env.GOOGLE_DRIVE_FOLDER_ID.trim();
    try {
      const { data } = await withRetry(() =>
        drive.files.get({
          fileId: configuredId,
          fields: 'id, name, mimeType, trashed',
        })
      );
      if (!data.trashed && data.mimeType === 'application/vnd.google-apps.folder') {
        return configuredId;
      }
    } catch (err) {
      console.warn(`⚠️ Configured GOOGLE_DRIVE_FOLDER_ID "${configuredId}" could not be accessed (${err.message}). Searching by name...`);
    }
  }

  // Search for folder by name created by this app
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${DEFAULT_FOLDER_NAME}' and trashed = false`;
  const listRes = await withRetry(() =>
    drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    })
  );

  if (listRes.data.files && listRes.data.files.length > 0) {
    return listRes.data.files[0].id;
  }

  // Create dedicated backup folder
  console.log(`📁 Creating dedicated Google Drive folder: "${DEFAULT_FOLDER_NAME}"...`);
  const folderMetadata = {
    name: DEFAULT_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
    description: 'Automated encrypted database backups for Supabase.',
  };

  const createRes = await withRetry(() =>
    drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name',
    })
  );

  console.log(`✅ Created Google Drive backup folder with ID: ${createRes.data.id}`);
  return createRes.data.id;
}

/**
 * Uploads an encrypted backup file to the target Google Drive backup folder.
 * Verifies upload metadata (size and existence) before reporting success.
 */
export async function uploadBackupToDrive(filePath, fileName) {
  const drive = getDriveClient();
  const folderId = await getOrCreateBackupFolder(drive);

  const stats = await fs.promises.stat(filePath);
  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(filePath),
  };

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    description: `Encrypted Supabase PostgreSQL database backup. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB.`,
  };

  console.log(`🚀 Uploading "${fileName}" (${(stats.size / 1024).toFixed(1)} KB) to Google Drive folder [${folderId}]...`);

  const uploadRes = await withRetry(() =>
    drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, size, md5Checksum, createdTime',
    })
  );

  const file = uploadRes.data;
  if (!file || !file.id) {
    throw new Error('Google Drive upload failed: No file ID returned.');
  }

  // Verification step: fetch uploaded metadata
  const verifyRes = await withRetry(() =>
    drive.files.get({
      fileId: file.id,
      fields: 'id, name, size, md5Checksum, trashed',
    })
  );

  const verifiedFile = verifyRes.data;
  if (verifiedFile.trashed) {
    throw new Error('Upload verification failed: file is marked as trashed.');
  }

  const uploadedSize = parseInt(verifiedFile.size || file.size || '0', 10);
  if (uploadedSize > 0 && Math.abs(uploadedSize - stats.size) > 1024) {
    throw new Error(`Upload verification failed: file size mismatch. Local: ${stats.size}, Remote: ${uploadedSize}`);
  }

  console.log(`✅ Upload verified: Google Drive File ID: ${file.id}, MD5: ${verifiedFile.md5Checksum || 'N/A'}`);

  return {
    fileId: file.id,
    fileName: file.name,
    folderId,
    fileSizeBytes: stats.size,
    checksumMd5: verifiedFile.md5Checksum || null,
  };
}

/**
 * Lists backup files in the Google Drive backup folder with pagination.
 */
export async function listBackupsFromDrive() {
  const drive = getDriveClient();
  const folderId = await getOrCreateBackupFolder(drive);

  const files = [];
  let pageToken = null;

  do {
    const res = await withRetry(() =>
      drive.files.list({
        q: `'${folderId}' in parents and trashed = false and name contains 'supabase-backup-'`,
        fields: 'nextPageToken, files(id, name, size, md5Checksum, createdTime, modifiedTime)',
        orderBy: 'createdTime desc',
        pageSize: 100,
        pageToken,
      })
    );

    if (res.data.files) {
      files.push(...res.data.files);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return files.map((f) => ({
    id: f.id,
    name: f.name,
    sizeBytes: parseInt(f.size || '0', 10),
    checksumMd5: f.md5Checksum || null,
    createdTime: f.createdTime,
    folderId,
  }));
}

/**
 * Downloads an encrypted backup file from Google Drive to local storage.
 */
export async function downloadBackupFromDrive(fileId, targetLocalPath) {
  const drive = getDriveClient();

  const fileMeta = await withRetry(() =>
    drive.files.get({
      fileId,
      fields: 'id, name, size, md5Checksum',
    })
  );

  console.log(`📥 Downloading backup "${fileMeta.data.name}" (${(parseInt(fileMeta.data.size || '0', 10) / 1024).toFixed(1)} KB) from Google Drive...`);

  const destStream = fs.createWriteStream(targetLocalPath);

  const res = await withRetry(() =>
    drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )
  );

  await new Promise((resolve, reject) => {
    res.data
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .pipe(destStream);
  });

  const downloadedStats = await fs.promises.stat(targetLocalPath);
  console.log(`✅ Download complete: ${downloadedStats.size} bytes written to ${targetLocalPath}`);

  return {
    filePath: targetLocalPath,
    fileName: fileMeta.data.name,
    fileSizeBytes: downloadedStats.size,
    checksumMd5: fileMeta.data.md5Checksum || null,
  };
}

/**
 * Deletes a specific backup file from Google Drive by file ID.
 */
export async function deleteBackupFile(fileId) {
  const drive = getDriveClient();
  await withRetry(() => drive.files.delete({ fileId }));
}
