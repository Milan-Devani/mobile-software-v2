import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/stats', requireAnyRole, getDashboardStats);

export default router;
