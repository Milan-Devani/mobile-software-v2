import express from 'express';
import {
  getNotificationLogs,
  resendNotification,
  deleteNotification,
  bulkDeleteNotifications,
  getTodaysBirthdays,
  runBirthdayWishesNow
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole, requireStaffOrAdmin, requireAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/logs', requireAnyRole, getNotificationLogs);
router.post('/bulk-delete', requireStaffOrAdmin, bulkDeleteNotifications);
router.post('/resend', requireStaffOrAdmin, resendNotification);
router.get('/birthdays/today', requireAnyRole, getTodaysBirthdays);
router.post('/birthdays/run', requireAdmin, runBirthdayWishesNow);
router.delete('/:id', requireStaffOrAdmin, deleteNotification);

export default router;
