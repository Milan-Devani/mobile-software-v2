import express from 'express';
import { getJobInvoice, generateInvoice, resendInvoice, downloadInvoicePdf } from '../controllers/invoiceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole, requireStaffOrAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

// Allow public or authenticated invoice preview & vector PDF download
router.get('/job/:jobId', authenticateToken, requireAnyRole, getJobInvoice);
router.get('/job/:jobId/download-pdf', authenticateToken, requireAnyRole, downloadInvoicePdf);
router.get('/public/:jobId/download-pdf', downloadInvoicePdf);
router.post('/job/:jobId/generate', authenticateToken, requireStaffOrAdmin, generateInvoice);
router.post('/job/:jobId/resend', authenticateToken, requireStaffOrAdmin, resendInvoice);

export default router;
