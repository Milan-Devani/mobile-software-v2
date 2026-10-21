import express from 'express';
import {
  recordPayment,
  getJobPayments,
  getPayments,
  deletePayment,
  bulkDeletePayments
} from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireStaffOrAdmin, requireAnyRole } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', requireAnyRole, getPayments);
router.post('/bulk-delete', requireStaffOrAdmin, bulkDeletePayments);
router.post('/', requireStaffOrAdmin, recordPayment);
router.get('/job/:jobId', requireAnyRole, getJobPayments);
router.delete('/:id', requireStaffOrAdmin, deletePayment);

export default router;
