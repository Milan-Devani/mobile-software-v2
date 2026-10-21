import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  triggerManualBackup,
  getBackupHistory,
  getBackupStatus,
  restoreBackupEndpoint,
} from '../controllers/backupController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

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
router.post('/restore', restoreBackupEndpoint);

export default router;
