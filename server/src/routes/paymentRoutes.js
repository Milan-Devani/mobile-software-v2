import express from 'express';
import { recordPayment, getJobPayments } from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireStaffOrAdmin, requireAnyRole } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', requireStaffOrAdmin, recordPayment);
router.get('/job/:jobId', requireAnyRole, getJobPayments);

export default router;
