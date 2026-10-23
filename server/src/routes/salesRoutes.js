import express from 'express';
import {
  getSales,
  getSaleById,
  createSale,
  deleteSale,
  bulkDeleteSales,
  getNextInvoiceNumber,
  downloadSalePdf,
  sendSaleInvoice,
} from '../controllers/salesController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole, requireAdmin } from '../middleware/roleGuard.js';

const router = express.Router();

// Public download route for WhatsApp / SMS customer links
router.get('/public/:id/download-pdf', downloadSalePdf);

// Authenticated routes
router.use(authenticateToken);

router.get('/', requireAnyRole, getSales);
router.get('/next-number', requireAnyRole, getNextInvoiceNumber);
router.get('/:id/download-pdf', requireAnyRole, downloadSalePdf);
router.post('/:id/send-invoice', requireAnyRole, sendSaleInvoice);
router.get('/:id', requireAnyRole, getSaleById);
router.post('/', requireAnyRole, createSale);
router.post('/bulk-delete', requireAdmin, bulkDeleteSales);
router.delete('/:id', requireAdmin, deleteSale);

export default router;

