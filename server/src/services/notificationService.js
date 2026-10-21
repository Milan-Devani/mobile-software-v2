import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { sendBrevoEmail } from './brevoEmailService.js';
import { sendOpenWaMessage } from './openWaService.js';
import { sendFast2SmsWhatsApp, sendFast2SmsSms } from './fast2smsService.js';
import { getBaileysStatus, sendBaileysMessage } from './baileysService.js';
import { sendMsg91Sms } from './msg91SmsService.js';
import { generateInvoicePdfBuffer } from './pdfService.js';

export const dispatchNotification = async ({
  job,
  customer,
  type, // JOB_CREATED, ESTIMATE_SENT, ESTIMATE_APPROVED, READY_FOR_PICKUP, PAYMENT_RECEIVED, INVOICE_GENERATED
  channels = ['EMAIL', 'WHATSAPP', 'SMS'],
  metadata = {}
}) => {
  if (!job || !customer) {
    console.warn('⚠️ Missing job or customer data for notification dispatch');
    return { success: false, error: 'Missing job or customer' };
  }

  const shop = await db.shops.getProfile();
  const shopName = shop?.name || 'Mobotech mobile care';
  const shopPhone = shop?.phone || '080000 24439';
  const shopAddress = shop?.address || 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar, Surat, Gujarat 395006';
  const currSym = shop?.currency_symbol || '₹';
  
  // Resolve accurate live frontend URL (never relative, never asterisk)
  const resolveFrontendBase = () => {
    if (metadata?.clientUrl && typeof metadata.clientUrl === 'string' && metadata.clientUrl.startsWith('http')) {
      return metadata.clientUrl.replace(/\/+$/, '');
    }
    if (env.APP_URL && typeof env.APP_URL === 'string' && env.APP_URL !== '*' && env.APP_URL.startsWith('http')) {
      return env.APP_URL.replace(/\/+$/, '');
    }
    if (env.CLIENT_URL && typeof env.CLIENT_URL === 'string' && env.CLIENT_URL !== '*' && env.CLIENT_URL.startsWith('http')) {
      return env.CLIENT_URL.replace(/\/+$/, '');
    }
    return env.NODE_ENV === 'production' ? 'https://mobile-software-v2.vercel.app' : 'http://localhost:5173';
  };

  const clientBaseUrl = resolveFrontendBase();
  const approvalUrl = `${clientBaseUrl}/repair/${job.job_number}/approval?token=${job.approval_token}`;

  let subject = '';
  let emailHtml = '';
  let plainMessage = '';

  let pdfBuffer = null;
  let invoiceFilename = `Mobotech_Invoice_${(job.job_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  if (type === 'INVOICE_GENERATED') {
    try {
      let invoice = await db.invoices.getByJobId(job.id);
      if (!invoice) {
        invoice = await db.invoices.createOrUpdateForJob({ jobId: job.id, userId: job.created_by_user_id || 'system' });
      }
      pdfBuffer = await generateInvoicePdfBuffer({ job, invoice, shop, trackingUrl: approvalUrl });
      if (invoice?.invoice_number) {
        const cleanInv = invoice.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_');
        invoiceFilename = `Mobotech_Invoice_${cleanInv}.pdf`;
      }
    } catch (pdfErr) {
      console.warn('⚠️ Invoice PDF buffer generation warning:', pdfErr.message);
    }
  }

  switch (type) {
    case 'JOB_CREATED':
      subject = `[${shopName}] Repair Job Sheet Created - #${job.job_number}`;
      plainMessage = `Hello ${customer.full_name}, your ${job.device?.brand || ''} ${job.device?.model || 'Device'} has been checked in under Job #${job.job_number}. Issue: "${job.customer_complaint}". We will diagnose it shortly and send you an estimate. Shop Phone: ${shopPhone}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #0284c7; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Device Intake Confirmation</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>Your device has been received and checked in for repair services.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 6px; color: #64748b;">Job Number:</td><td style="padding: 6px; font-weight: bold; font-family: monospace;">${job.job_number}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Reported Issue:</td><td style="padding: 6px;">${job.customer_complaint}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Current Status:</td><td style="padding: 6px; color: #0284c7; font-weight: bold;">${job.status}</td></tr>
          </table>
          <p style="font-size: 14px; color: #475569;">Our technicians are assessing the device. You will receive an inspection diagnosis and quotation before any repair work commences.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopAddress} • ${shopPhone}</p>
        </div>
      `;
      break;

    case 'ESTIMATE_SENT':
      subject = `[${shopName}] Repair Estimate Ready for Approval - Job #${job.job_number}`;
      plainMessage = `Hello ${customer.full_name}, your repair estimate for Job #${job.job_number} (${job.device?.model}) is ready. Estimated Total: ${currSym}${Number(job.total_amount).toFixed(2)}. Please review and authorize your repair here: ${approvalUrl}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Diagnosis & Repair Estimate</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>We have completed diagnosis of your <strong>${job.device?.brand || ''} ${job.device?.model || 'Device'}</strong> (Job #${job.job_number}).</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Estimated Total:</strong> <span style="font-size: 20px; color: #0f172a; font-weight: bold;">${currSym}${Number(job.total_amount).toFixed(2)}</span></p>
            <p style="margin: 0; color: #64748b; font-size: 13px;">Includes diagnostic labor and genuine replacement parts.</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${approvalUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Approve Repair Online</a>
          </div>
          <p style="font-size: 13px; color: #64748b; text-align: center;">Or copy link: <a href="${approvalUrl}">${approvalUrl}</a></p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopPhone}</p>
        </div>
      `;
      break;

    case 'READY_FOR_PICKUP':
      subject = `[${shopName}] Your Device is Repaired & Ready for Pickup! - Job #${job.job_number}`;
      plainMessage = `Great news ${customer.full_name}! Your ${job.device?.model || 'Device'} (Job #${job.job_number}) has been fully repaired, passed all quality checks, and is READY FOR PICKUP at ${shopName} (${shopAddress}). Amount Due: ${currSym}${Number(job.balance_due || 0).toFixed(2)}.`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #10b981; margin-bottom: 4px;">🎉 Ready for Pickup!</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">${shopName} Service Center</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>Your repair for <strong>${job.device?.brand || ''} ${job.device?.model || 'Device'}</strong> (Job #${job.job_number}) is complete! The device has successfully passed our 16-point hardware quality assurance test.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 6px; color: #64748b;">Total Amount:</td><td style="padding: 6px; font-weight: bold;">${currSym}${Number(job.total_amount).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Paid to date:</td><td style="padding: 6px; color: #10b981;">${currSym}${Number(job.paid_amount || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Remaining Due:</td><td style="padding: 6px; color: #ef4444; font-weight: bold;">${currSym}${Number(job.balance_due || 0).toFixed(2)}</td></tr>
          </table>
          <div style="background-color: #f1f5f9; padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-weight: bold; color: #334155;">Pickup Location & Hours:</p>
            <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;">${shopAddress}<br/>Phone: ${shopPhone}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">${shopName}</p>
        </div>
      `;
      break;

    case 'INVOICE_GENERATED': {
      const isWarranty = Boolean(
        job.is_warranty_claim ||
        job.warranty_same_issue ||
        job.warranty_free_rework ||
        metadata.isWarrantyHandover
      );
      if (isWarranty) {
        subject = `[${shopName}] Warranty Handover & Service Receipt - Job #${job.job_number}`;
        plainMessage = `Dear ${customer.full_name}, your warranty rework for ${job.device?.brand || ''} ${job.device?.model || 'Device'} (Job #${job.job_number}) is successfully completed and handed over (100% Free Rework - ${currSym}0.00 Balance Due). Your official warranty service invoice PDF is attached. Track: ${approvalUrl}. ${shopName}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #059669; margin-bottom: 4px;">${shopName}</h2>
            <p style="color: #059669; font-size: 14px; font-weight: bold; margin-top: 0;">✓ Warranty Handover & Service Receipt (100% Free Rework)</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
            <p>Dear <strong>${customer.full_name}</strong>,</p>
            <p>Your device rework has been completed and handed over to you under warranty coverage.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr><td style="padding: 6px; color: #64748b;">Job Number:</td><td style="padding: 6px; font-family: monospace; font-weight: bold;">#${job.job_number}</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Warranty Claim:</td><td style="padding: 6px; font-weight: bold; color: #059669;">Claim #${job.reopen_count || 1} (Covered Under Warranty)</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Rework Cost:</td><td style="padding: 6px; font-weight: bold; color: #059669;">${currSym}0.00 (100% Free Rework)</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Balance Due:</td><td style="padding: 6px; font-weight: bold;">${currSym}0.00</td></tr>
            </table>
            <p style="font-size: 13px; color: #475569; margin: 15px 0;">
              📎 <strong>Official Warranty Service Invoice PDF is attached to this email.</strong> Please keep this receipt for your records.
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${approvalUrl}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Repair Record Online</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopAddress} • ${shopPhone}</p>
          </div>
        `;
      } else {
        subject = `[${shopName}] Official Tax Invoice & Delivery Receipt - Job #${job.job_number}`;
        plainMessage = `Thank you ${customer.full_name}! Your device (${job.device?.brand || ''} ${job.device?.model || 'Device'}) has been delivered and payment settled in full. Order #${job.job_number}. Total: ${currSym}${Number(job.total_amount || job.paid_amount || 0).toFixed(2)}. View: ${approvalUrl}. ${shopName}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0284c7; margin-bottom: 4px;">${shopName}</h2>
            <p style="color: #16a34a; font-size: 14px; font-weight: bold; margin-top: 0;">✓ Tax Invoice & Delivery Receipt</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
            <p>Dear <strong>${customer.full_name}</strong>,</p>
            <p>Thank you for choosing ${shopName}. Your device has been delivered and service payment finalized.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr><td style="padding: 6px; color: #64748b;">Job Number:</td><td style="padding: 6px; font-family: monospace; font-weight: bold;">#${job.job_number}</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Total Amount:</td><td style="padding: 6px; font-weight: bold;">${currSym}${Number(job.total_amount).toFixed(2)}</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Amount Paid:</td><td style="padding: 6px; font-weight: bold; color: #16a34a;">${currSym}${Number(job.paid_amount || job.total_amount).toFixed(2)}</td></tr>
              <tr><td style="padding: 6px; color: #64748b;">Remaining Balance:</td><td style="padding: 6px; font-weight: bold;">${currSym}${Number(job.balance_due || 0).toFixed(2)}</td></tr>
            </table>
            <p style="font-size: 13px; color: #475569; margin: 15px 0;">
              📎 <strong>Official Tax Invoice PDF is attached to this email.</strong> Please keep this receipt for warranty claims.
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${approvalUrl}" style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Repair Record Online</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopAddress} • ${shopPhone}</p>
          </div>
        `;
      }
      break;
    }

    case 'PAYMENT_RECEIVED':
      subject = `[${shopName}] Payment Receipt - Job #${job.job_number}`;
      plainMessage = `Thank you ${customer.full_name}! Payment received for Job #${job.job_number}. Amount: ${currSym}${Number(metadata.paymentAmount || job.paid_amount).toFixed(2)}. Remaining Balance: ${currSym}${Number(job.balance_due || 0).toFixed(2)}. ${shopName}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Payment Receipt Confirmation</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>We have successfully recorded your payment for Job #${job.job_number}.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Payment Method:</td><td style="padding: 6px; font-weight: bold;">${metadata.paymentMethod || 'CASH'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Amount Paid:</td><td style="padding: 6px; font-weight: bold; color: #10b981;">${currSym}${Number(metadata.paymentAmount || job.paid_amount).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Remaining Balance:</td><td style="padding: 6px; font-weight: bold;">${currSym}${Number(job.balance_due || 0).toFixed(2)}</td></tr>
          </table>
          <p style="font-size: 13px; color: #475569;">Thank you for your business!</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopPhone}</p>
        </div>
      `;
      break;

    case 'JOB_REOPENED':
      subject = `[${shopName}] Warranty Claim / Repair Reopened - Job #${job.job_number}`;
      plainMessage = `Hello ${customer.full_name}, your repair Job #${job.job_number} for ${job.device?.brand || ''} ${job.device?.model || 'Device'} has been reopened for warranty service. Issue: "${job.last_warranty_issue || 'Warranty issue reported'}". We are working on it and will notify you when ready. Shop Phone: ${shopPhone}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #d97706; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Warranty Claim & Service Reopened</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>Your repair order <strong>Job #${job.job_number}</strong> has been reopened under warranty service.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 6px; color: #64748b;">Job Number:</td><td style="padding: 6px; font-family: monospace; font-weight: bold;">#${job.job_number}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Reported Warranty Issue:</td><td style="padding: 6px; font-weight: bold; color: #d97706;">${job.last_warranty_issue || 'Warranty claim'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Current Stage:</td><td style="padding: 6px; color: #0284c7; font-weight: bold;">${job.status}</td></tr>
          </table>
          <p style="font-size: 14px; color: #475569;">Our technicians will inspect and address this issue under your warranty policy.</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${approvalUrl}" style="background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Repair Status</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopAddress} • ${shopPhone}</p>
        </div>
      `;
      break;

    default:
      subject = `[${shopName}] Update on Repair Job #${job.job_number}`;
      plainMessage = `Hello ${customer.full_name}, your repair job #${job.job_number} status is now: ${job.status}. ${shopName}`;
      emailHtml = `<p>Hello ${customer.full_name}, your repair job #${job.job_number} status is now: <strong>${job.status}</strong>.</p>`;
  }

  const results = [];

  // Channel 1: Email (Brevo)
  if (channels.includes('EMAIL') && customer.email) {
    try {
      const emailResult = await sendBrevoEmail({
        toEmail: customer.email,
        toName: customer.full_name,
        subject,
        htmlContent: emailHtml,
        textContent: plainMessage,
        attachments: pdfBuffer ? [{ name: invoiceFilename, content: pdfBuffer, contentType: 'application/pdf' }] : [],
      });

      await db.notifications.log({
        jobId: job.id,
        customerId: customer.id,
        channel: 'EMAIL',
        messageType: type,
        recipient: customer.email,
        status: emailResult.success ? 'SENT' : 'FAILED',
        provider: 'BREVO',
        providerResponse: emailResult,
      });
      results.push({ channel: 'EMAIL', success: true });
    } catch (err) {
      console.warn('❌ Email dispatch failed:', err.message);
      await db.notifications.log({
        jobId: job.id,
        customerId: customer.id,
        channel: 'EMAIL',
        messageType: type,
        recipient: customer.email,
        status: 'FAILED',
        provider: 'BREVO',
        errorMessage: err.message,
      });
      results.push({ channel: 'EMAIL', success: false, error: err.message });
    }
  }

  // Channel 2: WhatsApp - Support primary & alternate WhatsApp with phone normalization & deduplication
  const normalizePhone = (num) => {
    if (!num) return '';
    let digits = String(num).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits;
  };

  const waRecipients = [];
  const seenNumbers = new Set();

  const addRecipient = (rawPhone) => {
    if (!rawPhone) return;
    const clean = String(rawPhone).trim();
    const normalized = normalizePhone(clean);
    if (normalized.length >= 10 && !seenNumbers.has(normalized)) {
      seenNumbers.add(normalized);
      waRecipients.push(clean);
    }
  };

  if (customer.alternate_whatsapp) addRecipient(customer.alternate_whatsapp);
  if (customer.whatsapp_number) addRecipient(customer.whatsapp_number);
  if (customer.phone) addRecipient(customer.phone);

  if (channels.includes('WHATSAPP') && waRecipients.length > 0) {
    const baileysState = getBaileysStatus();

    for (const waNumber of waRecipients) {
      try {
        let waResult;
        let providerName = 'BAILEYS';

        if (baileysState.isConnected) {
          waResult = await sendBaileysMessage({
            phone: waNumber,
            message: plainMessage,
            ...(pdfBuffer ? {
              documentBuffer: pdfBuffer,
              documentFilename: invoiceFilename,
              caption: plainMessage,
            } : {}),
          });
          providerName = 'BAILEYS_LOCAL';
        } else if (env.FAST2SMS_API_KEY && env.FAST2SMS_API_KEY.trim()) {
          waResult = await sendFast2SmsWhatsApp({
            phone: waNumber,
            message: plainMessage,
          });
          providerName = waResult.provider || 'FAST2SMS';
        } else if (env.OPENWA_API_KEY) {
          waResult = await sendOpenWaMessage({
            phone: waNumber,
            message: plainMessage,
          });
          providerName = 'OPENWA';
        } else {
          // Default development simulator
          waResult = await sendFast2SmsWhatsApp({
            phone: waNumber,
            message: plainMessage,
          });
          providerName = 'FAST2SMS_SIMULATOR';
        }

        await db.notifications.log({
          jobId: job.id,
          customerId: customer.id,
          channel: 'WHATSAPP',
          messageType: type,
          recipient: waNumber,
          status: waResult.success ? 'SENT' : 'FAILED',
          provider: providerName,
          providerResponse: waResult,
        });
        results.push({ channel: 'WHATSAPP', recipient: waNumber, success: true });
      } catch (err) {
        console.warn(`❌ WhatsApp dispatch failed to ${waNumber}:`, err.message);
        await db.notifications.log({
          jobId: job.id,
          customerId: customer.id,
          channel: 'WHATSAPP',
          messageType: type,
          recipient: waNumber,
          status: 'FAILED',
          provider: 'FAST2SMS',
          errorMessage: err.message,
        });
        results.push({ channel: 'WHATSAPP', recipient: waNumber, success: false, error: err.message });
      }
    }
  }

  // Channel 3: SMS (Fast2SMS / MSG91)
  if (channels.includes('SMS') && customer.phone) {
    try {
      let smsResult;
      let smsProvider = 'FAST2SMS';

      if (env.FAST2SMS_API_KEY && env.FAST2SMS_API_KEY.trim()) {
        smsResult = await sendFast2SmsSms({
          phone: customer.phone,
          message: plainMessage,
        });
        smsProvider = smsResult.provider || 'FAST2SMS';
      } else if (env.MSG91_AUTH_KEY) {
        smsResult = await sendMsg91Sms({
          phone: customer.phone,
          message: plainMessage,
          templateVariables: {
            name: customer.full_name,
            job_number: job.job_number,
            amount: String(job.total_amount),
          },
        });
        smsProvider = 'MSG91';
      } else {
        smsResult = await sendFast2SmsSms({
          phone: customer.phone,
          message: plainMessage,
        });
        smsProvider = 'FAST2SMS_SMS_SIMULATOR';
      }

      await db.notifications.log({
        jobId: job.id,
        customerId: customer.id,
        channel: 'SMS',
        messageType: type,
        recipient: customer.phone,
        status: smsResult.success ? 'SENT' : 'FAILED',
        provider: smsProvider,
        providerResponse: smsResult,
      });
      results.push({ channel: 'SMS', success: true });
    } catch (err) {
      console.warn('❌ SMS dispatch failed:', err.message);
      await db.notifications.log({
        jobId: job.id,
        customerId: customer.id,
        channel: 'SMS',
        messageType: type,
        recipient: customer.phone,
        status: 'FAILED',
        provider: 'FAST2SMS',
        errorMessage: err.message,
      });
      results.push({ channel: 'SMS', success: false, error: err.message });
    }
  }

  return { success: true, results };
};
