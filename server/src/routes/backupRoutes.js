import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import {
  triggerManualBackup,
  getBackupHistory,
  getBackupStatus,
  restoreBackupEndpoint,
  restoreUploadedBackupEndpoint,
  downloadBackupArchive,
  getGoogleAuthUrlEndpoint,
  exchangeGoogleAuthCodeEndpoint,
  wipeAllDataEndpoint,
  deleteBackupEndpoint,
  bulkDeleteBackupsEndpoint,
  cancelRunningBackupJob,
  saveBackupKeysEndpoint,
} from '../controllers/backupController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

// Multer disk storage for uploaded backup archive (.enc)
const uploadTempDir = env.BACKUP_TEMP_DIR || path.join(os.tmpdir(), 'repairos-backups');
if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}

const backupFileUploader = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(uploadTempDir)) {
        fs.mkdirSync(uploadTempDir, { recursive: true });
      }
      cb(null, uploadTempDir);
    },
    filename: (req, file, cb) => {
      const sanitized = (file.originalname || 'backup.enc').replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `upload-restore-${Date.now()}-${sanitized}`);
    },
  }),
  limits: {
    fileSize: 150 * 1024 * 1024, // 150 MB limit
  },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const isAllowedExt = name.endsWith('.sql') || name.endsWith('.enc');
    const isAllowedMime =
      file.mimetype === 'application/sql' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'text/x-sql' ||
      file.mimetype === 'application/octet-stream';
    if (isAllowedExt || isAllowedMime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a valid .sql backup or legacy .enc file.'), false);
    }
  },
});

// Rate limiter for manual backup creation to prevent resource exhaustion
const manualBackupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 6, // max 6 manual backups per 15 minutes
  message: {
    success: false,
    message: 'Too many backup requests. Please wait a few minutes before triggering another backup.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enforce authentication & admin authorization for all backup routes
router.use(authenticateToken);
router.use(requireAdmin);

// Backup Routes
router.post('/', manualBackupRateLimiter, triggerManualBackup);
router.get('/', getBackupHistory);
router.get('/status', getBackupStatus);
router.post('/keys', saveBackupKeysEndpoint);
router.get('/download/:filename', downloadBackupArchive);
router.get('/auth/google/url', getGoogleAuthUrlEndpoint);
router.post('/auth/google/exchange', exchangeGoogleAuthCodeEndpoint);
router.post('/restore', restoreBackupEndpoint);
router.post('/restore-upload', backupFileUploader.single('backup_file'), restoreUploadedBackupEndpoint);
router.post('/wipe', wipeAllDataEndpoint);
router.post('/cancel-job', cancelRunningBackupJob);
router.delete('/bulk', bulkDeleteBackupsEndpoint);
router.delete('/:id', deleteBackupEndpoint);

export default router;
