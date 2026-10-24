import express from 'express';
import {
  getVendors,
  getVendorStats,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getNextTxnNumber,
  getPendingMobilesWithVendor,
  sendMobilesToVendor,
  receiveMobilesFromVendor,
  recordVendorJobInward,
  recordVendorJobReturn,
  getVendorTransactions,
  getTransactionById,
  getVendorMobiles,
  getMobileById,
  updateMobileStatus,
  getVendorLedger,
  recordVendorPayment,
  getVendorPayments,
  getVendorReports,
} from '../controllers/vendorController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole, requireAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);

// High priority specific endpoints
router.get('/stats', requireAnyRole, getVendorStats);
router.get('/next-number', requireAnyRole, getNextTxnNumber);
router.get('/reports/summary', requireAnyRole, getVendorReports);

// Transactions
router.get('/transactions', requireAnyRole, getVendorTransactions);
router.get('/transactions/:id', requireAnyRole, getTransactionById);
router.post('/transactions/send', requireAnyRole, sendMobilesToVendor);
router.post('/transactions/receive', requireAnyRole, receiveMobilesFromVendor);
router.post('/transactions/vendor-job-inward', requireAnyRole, recordVendorJobInward);
router.post('/transactions/vendor-job-return', requireAnyRole, recordVendorJobReturn);

// Mobiles & Status
router.get('/mobiles', requireAnyRole, getVendorMobiles);
router.get('/mobiles/:id', requireAnyRole, getMobileById);
router.patch('/mobiles/:id/status', requireAnyRole, updateMobileStatus);

// Payments & Ledger
router.get('/payments', requireAnyRole, getVendorPayments);
router.post('/payments', requireAnyRole, recordVendorPayment);

// Vendor Master CRUD & sub-resources
router.get('/', requireAnyRole, getVendors);
router.post('/', requireAnyRole, createVendor);
router.get('/:id', requireAnyRole, getVendorById);
router.put('/:id', requireAnyRole, updateVendor);
router.delete('/:id', requireAdmin, deleteVendor);

router.get('/:vendorId/pending-mobiles', requireAnyRole, getPendingMobilesWithVendor);
router.get('/:vendorId/ledger', requireAnyRole, getVendorLedger);

export default router;
