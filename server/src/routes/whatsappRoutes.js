import express from 'express';
import {
  initBaileys,
  getBaileysStatus,
  logoutBaileys,
  sendBaileysMessage,
} from '../services/baileysService.js';
import { generateInvoicePdfBuffer } from '../services/pdfService.js';
import { db } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Public or Authenticated status of Baileys connection
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = getBaileysStatus();
    // If disconnected, trigger background initialization without blocking response
    if (status.status === 'DISCONNECTED') {
      initBaileys(false).catch((err) => {
        console.warn('Background Baileys init warning:', err.message);
      });
    }
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

/**
 * Force reconnect / regenerate QR
 */
router.post('/connect', authenticateToken, async (req, res, next) => {
  try {
    const result = await initBaileys(true);
    res.json({ success: true, message: 'QR regeneration started.', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * Disconnect / Logout
 */
router.post('/disconnect', authenticateToken, async (req, res, next) => {
  try {
    const result = await logoutBaileys();
    res.json({ success: true, message: 'Disconnected from WhatsApp.', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * Send custom or test message
 */
router.post('/send-test', authenticateToken, async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    if (!phone) throw new AppError('Phone number is required.', 400);

    const text = message || `*Mobotech Mobile Care*\nHello! This is an automated background test message sent via your linked WhatsApp number.`;
    const result = await sendBaileysMessage({ phone, message: text });

    res.json({ success: true, message: 'Message sent successfully in background!', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * Send official invoice & PDF automatically in background to customer
 */
router.post('/send-invoice/:jobId', authenticateToken, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { targetPhone } = req.body; // Optional override

    const job = await db.jobs.findById(jobId);
    if (!job) throw new AppError('Job not found.', 404);

    const customer = await db.customers.findById(job.customer_id);
    const invoice = await db.invoices.getByJobId(job.id);
    const shop = await db.shops.getProfile();

    const recipientPhone = targetPhone || customer?.whatsapp_number || customer?.phone;
    if (!recipientPhone) {
      throw new AppError('No phone number found for customer.', 400);
    }

    // 1. Generate Razor-Sharp Vector PDF buffer
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateInvoicePdfBuffer({ job, invoice, shop });
    } catch (pdfErr) {
      console.warn('PDF generation fallback to text-only WhatsApp message:', pdfErr.message);
    }

    const cleanJobNum = (invoice?.invoice_number || job.job_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Mobotech_Invoice_${cleanJobNum}.pdf`;

    const caption =
      `*Service Record & Tax Invoice - ${shop?.name || 'Mobotech mobile care'}*\n` +
      `Dear ${customer?.full_name || 'Customer'},\n` +
      `Your service record & invoice #${invoice?.invoice_number || job.job_number} is ready.\n\n` +
      `📱 *Device:* ${job.device?.brand || ''} ${job.device?.model || ''}\n` +
      `💰 *Total Amount:* ${shop?.currency_symbol || '₹'}${Number(invoice?.total_amount || job.total_amount || 0).toFixed(2)}\n` +
      `🔧 *Status:* ${job.status || 'READY_FOR_PICKUP'}\n` +
      `📍 *Shop:* ${shop?.address || 'Central Bazar, Surat'}\n\n` +
      `_Please find your official tax invoice document attached._`;

    // 2. Dispatch automatically via Baileys in background
    const result = await sendBaileysMessage({
      phone: recipientPhone,
      message: caption,
      documentBuffer: pdfBuffer,
      documentFilename: filename,
      caption: caption,
    });

    // 3. Log notification
    await db.notifications.log({
      jobId: job.id,
      customerId: customer?.id,
      channel: 'WHATSAPP',
      messageType: 'INVOICE_GENERATED',
      recipient: recipientPhone,
      status: 'SENT',
      provider: 'BAILEYS_LOCAL',
      providerResponse: result,
    });

    res.json({
      success: true,
      message: `Invoice PDF sent automatically in background to ${recipientPhone}!`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
