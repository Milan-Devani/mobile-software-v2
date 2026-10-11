import express from 'express';
import { getNotificationLogs, resendNotification } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole, requireStaffOrAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/logs', requireAnyRole, getNotificationLogs);
router.post('/resend', requireStaffOrAdmin, resendNotification);

export default router;
