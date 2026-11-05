import crypto from 'crypto';
import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { getDynamicGreeting } from './notificationService.js';
import { sendBaileysMessage } from './baileysService.js';
import { sendFast2SmsWhatsApp } from './fast2smsService.js';

/**
 * Generates a cryptographically secure token and its SHA-256 hash
 */
export const generateSecureReviewToken = () => {
  const token = crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

/**
 * Triggers an automated Google review invitation when a repair job is delivered & invoiced.
 * Guaranteed idempotent: Only sends once per job. Never blocks delivery/invoice if messaging fails.
 */
export const triggerAutoReviewInvitation = async ({ jobId, invoiceId = null, clientUrl = null }) => {
  try {
    if (!jobId) return null;

    // 1. Check if review invitations are enabled globally in settings
    const reviewSettings = await db.reviewSettings.get();
    if (!reviewSettings?.is_enabled) {
      return null;
    }

    // 2. Load job and customer details
    const job = await db.jobs.findById(jobId);
    if (!job) return null;

    // Must be in DELIVERED status
    if (job.status !== 'DELIVERED') {
      return null;
    }

    // Must not be a rejected estimate without repair
    if (job.approval_status === 'REJECTED') {
      return null;
    }

    // 3. Idempotency Check: Do not send duplicate invitations for the same completed job
    const existing = await db.reviewRequests.findByJobId(job.id);
    if (existing && existing.invitation_status === 'SENT') {
      return existing;
    }

    const customer = await db.customers.findById(job.customer_id);
    const shop = await db.shops.getProfile();

    const recipientPhone = customer?.whatsapp_number || customer?.phone;
    const cleanPhone = (recipientPhone || '').replace(/\D/g, '');

    // 4. Generate cryptographically secure token & hash
    const { token, hash } = generateSecureReviewToken();

    // Determine client base URL
    const baseUrl = clientUrl || env.CLIENT_URL || env.APP_URL || 'http://localhost:5173';
    const reviewLink = `${baseUrl.replace(/\/+$/, '')}/review/${token}`;

    // Create or retrieve review request record
    let reviewRequest = existing;
    if (!reviewRequest) {
      reviewRequest = await db.reviewRequests.create({
        shop_id: shop?.id || null,
        job_id: job.id,
        invoice_id: invoiceId || null,
        customer_id: customer?.id || job.customer_id,
        unique_token: token,
        unique_token_hash: hash,
        invitation_status: 'PENDING',
      });
    }

    if (!cleanPhone) {
      await db.reviewRequests.update(reviewRequest.id, {
        invitation_status: 'FAILED',
        error_message: 'Customer has no valid phone number on file',
      });
      return reviewRequest;
    }

    // 5. Build clean, customer-friendly review invitation message (strictly no review gating)
    const greeting = getDynamicGreeting();
    const customerName = (customer?.full_name || 'Customer').trim();
    const deviceName = `${job.device?.brand || ''} ${job.device?.model || 'Device'}`.trim();
    const shopName = shop?.name || 'Mobotech mobile care';

    const message =
      `${greeting} *${customerName}*!\n\n` +
      `🙏 *Thank You for Choosing ${shopName}!* ❤️\n\n` +
      `Your *${deviceName}* (Job #${job.job_number}) repair has been completed and delivered.\n\n` +
      `We hope your device is working smoothly! We would genuinely appreciate your honest feedback. ` +
      `You can share your thoughts or use our quick AI review helper here:\n\n` +
      `⭐ *Review Link:*\n` +
      `${reviewLink}\n\n` +
      `Your feedback helps us serve you better. Thank you for trusting *${shopName}*!`;

    // 6. Dispatch review invitation via WhatsApp (Baileys -> Fast2SMS WhatsApp fallback)
    // Legacy safety: if previously configured as SMS or BOTH, gracefully send via WhatsApp
    let sentSuccess = false;
    let dispatchError = null;

    try {
      await sendBaileysMessage({
        phone: cleanPhone,
        message,
      });
      sentSuccess = true;
    } catch (waErr) {
      dispatchError = waErr.message;
      // Fallback to Fast2SMS WhatsApp if Baileys disconnected
      try {
        await sendFast2SmsWhatsApp({
          phone: cleanPhone,
          message,
        });
        sentSuccess = true;
        dispatchError = null;
      } catch (fErr) {
        dispatchError = fErr.message;
      }
    }

    // 7. Update status in database
    if (sentSuccess) {
      const updated = await db.reviewRequests.update(reviewRequest.id, {
        invitation_status: 'SENT',
        invitation_sent_at: new Date().toISOString(),
        error_message: null,
      });
      console.log(`⭐ [Review Assistant] Sent review invitation to ${cleanPhone} for Job #${job.job_number}`);
      return updated;
    } else {
      const updated = await db.reviewRequests.update(reviewRequest.id, {
        invitation_status: 'FAILED',
        error_message: dispatchError || 'Failed to dispatch messaging',
      });
      console.warn(`⚠️ [Review Assistant] Failed to send review invitation to ${cleanPhone}:`, dispatchError);
      return updated;
    }
  } catch (err) {
    console.error('⚠️ [Review Assistant] triggerAutoReviewInvitation error:', err.message);
    return null;
  }
};

/**
 * Manually retries sending a failed review invitation
 */
export const retryReviewInvitation = async (requestId, clientUrl = null) => {
  const req = await db.reviewRequests.findById(requestId);
  if (!req) throw new Error('Review request not found.');

  return triggerAutoReviewInvitation({
    jobId: req.job_id,
    invoiceId: req.invoice_id,
    clientUrl,
  });
};
