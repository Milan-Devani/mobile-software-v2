import express from 'express';
import { getSettings, updateShopProfile, updateNotificationSettings, testWhatsAppDispatch, testEmailDispatch } from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, requireAnyRole } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', requireAnyRole, getSettings);
router.put('/profile', requireAdmin, updateShopProfile);
router.put('/notifications', requireAdmin, updateNotificationSettings);
router.post('/test-whatsapp', requireAdmin, testWhatsAppDispatch);
router.post('/test-email', requireAdmin, testEmailDispatch);

export default router;
