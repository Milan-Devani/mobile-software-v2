import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { isSupabaseConfigured, uploadToSupabaseStorage } from '../config/supabase.js';
import { env } from '../config/env.js';
import { db } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded.', 400, 'FILE_MISSING');
    }

    const { jobId, fileType = 'DEVICE_CHECKIN_PHOTO' } = req.body;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const size = req.file.size;
    const fileExt = path.extname(originalName);
    const uniqueFileName = `${Date.now()}-${uuidv4()}${fileExt}`;

    let fileUrl = '';
    let filePath = '';

    if (isSupabaseConfigured()) {
      try {
        const storageResult = await uploadToSupabaseStorage(
          req.file.buffer,
          uniqueFileName,
          mimeType
        );
        fileUrl = storageResult.url;
        filePath = storageResult.path;
      } catch (storageErr) {
        console.warn('⚠️ Supabase storage upload failed, saving to local uploads folder:', storageErr.message);
        // Fallback to local
        const localPath = path.join(UPLOADS_DIR, uniqueFileName);
        fs.writeFileSync(localPath, req.file.buffer);
        fileUrl = `${env.API_URL}/uploads/${uniqueFileName}`;
        filePath = localPath;
      }
    } else {
      // Local storage
      const localPath = path.join(UPLOADS_DIR, uniqueFileName);
      fs.writeFileSync(localPath, req.file.buffer);
      fileUrl = `${env.API_URL}/uploads/${uniqueFileName}`;
      filePath = localPath;
    }

    let attachment = null;
    if (jobId) {
      attachment = await db.attachments.create({
        jobId,
        fileType,
        fileName: originalName,
        filePath,
        fileUrl,
        sizeBytes: size,
        mimeType,
        userId: req.user?.id || null,
      });
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      data: {
        file_name: originalName,
        file_url: fileUrl,
        file_path: filePath,
        attachment,
      },
    });
  } catch (err) {
    next(err);
  }
};
