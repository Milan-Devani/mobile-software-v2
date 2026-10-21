import express from 'express';
import {
  getNotificationLogs,
  resendNotification,
  deleteNotification,
  bulkDeleteNotifications
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole, requireStaffOrAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/logs', requireAnyRole, getNotificationLogs);
router.post('/bulk-delete', requireStaffOrAdmin, bulkDeleteNotifications);
router.post('/resend', requireStaffOrAdmin, resendNotification);
router.delete('/:id', requireStaffOrAdmin, deleteNotification);

export default router;
