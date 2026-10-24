import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { sendBrevoEmail } from './brevoEmailService.js';
import { sendOpenWaMessage } from './openWaService.js';
import { sendFast2SmsWhatsApp, sendFast2SmsSms } from './fast2smsService.js';
import { getBaileysStatus, sendBaileysMessage } from './baileysService.js';
import { sendMsg91Sms } from './msg91SmsService.js';
import { generateInvoicePdfBuffer, generateSaleInvoicePdfBuffer } from './pdfService.js';

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

    case 'ESTIMATE_REJECTED':
      subject = `[${shopName}] Estimate Declined - Job #${job.job_number} Ready for Return Pickup`;
      plainMessage =
        `❌ *REPAIR ESTIMATE DECLINED* - *${shopName}*\n\n` +
        `Hello *${customer.full_name}*,\n` +
        `We acknowledge that you have declined the repair estimate for your handset:\n\n` +
        `📱 *Device:* ${job.device?.brand || ''} ${job.device?.model || 'Device'}\n` +
        `📄 *Job Sheet:* #${job.job_number}\n` +
        (metadata?.reason ? `💬 *Reason:* "${metadata.reason}"\n` : '') +
        `\nℹ️ *Important Information:*\n` +
        `• No repair work has been performed on your phone.\n` +
        `• Repair charge is cancelled (Balance Due: ${currSym}0.00).\n` +
        `• Your phone is safely reassembled in its original intake condition.\n` +
        `• Your device is *READY FOR RETURN PICKUP* at our service center.\n\n` +
        `📍 *Collection Location:*\n${shopAddress}\n\n` +
        `📞 *Contact Us:* ${shopPhone}\n` +
        `🌐 *Track Record:* ${approvalUrl}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
          <h2 style="color: #e11d48; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Estimate Declined • Device Ready for Return Pickup</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>We have recorded your decision to decline the repair estimate for your device.</p>
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 12px 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; color: #9f1239; font-weight: bold; font-size: 13px;">✓ No Repair Conducted — Zero Balance Due</p>
            <p style="margin: 4px 0 0; color: #881337; font-size: 12px;">Your handset has been safely packaged in its original intake condition and is waiting for you to collect.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
            <tr><td style="padding: 6px; color: #64748b;">Job Sheet:</td><td style="padding: 6px; font-weight: bold; font-family: monospace;">#${job.job_number}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px; font-weight: bold;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
            ${metadata?.reason ? `<tr><td style="padding: 6px; color: #64748b;">Customer Note:</td><td style="padding: 6px; color: #e11d48; font-style: italic;">"${metadata.reason}"</td></tr>` : ''}
            <tr><td style="padding: 6px; color: #64748b;">Repair Charges:</td><td style="padding: 6px; font-weight: bold; color: #64748b; text-decoration: line-through;">${currSym}${Number(job.total_amount || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Total Payable:</td><td style="padding: 6px; font-weight: bold; color: #059669; font-size: 15px;">${currSym}0.00</td></tr>
          </table>
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 15px 0; font-size: 12px;">
            <p style="margin: 0; font-weight: bold; color: #334155;">Pickup Location & Hours:</p>
            <p style="margin: 4px 0 0 0; color: #475569;">${shopAddress}<br/>Phone: <strong>${shopPhone}</strong></p>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${approvalUrl}" style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Repair Record Online</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopPhone}</p>
        </div>
      `;
      break;

    case 'DEVICE_RETURNED_UNREPAIRED':
      subject = `[${shopName}] Handset Return Confirmation (Unrepaired) - Job #${job.job_number}`;
      plainMessage =
        `📦 *HANDSET RETURN CONFIRMATION* - *${shopName}*\n\n` +
        `Hello *${customer.full_name}*,\n` +
        `Your ${job.device?.brand || ''} ${job.device?.model || 'Device'} (Job #${job.job_number}) has been returned and handed over to you in its original intake condition (Estimate declined • ${currSym}0.00 Charged).\n\n` +
        `Thank you for visiting ${shopName}! Feel free to reach out anytime for your mobile needs.\n\n` +
        `🏢 *${shopName}*\n` +
        `📍 ${shopAddress}\n` +
        `📞 ${shopPhone}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
          <h2 style="color: #0284c7; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">✓ Handset Returned in Original Condition</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>This is to confirm that your device has been handed over to you in its original intake condition as the repair estimate was declined.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
            <tr><td style="padding: 6px; color: #64748b;">Job Sheet:</td><td style="padding: 6px; font-weight: bold; font-family: monospace;">#${job.job_number}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px; font-weight: bold;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Status:</td><td style="padding: 6px; font-weight: bold; color: #0284c7;">Returned Unrepaired</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Amount Charged:</td><td style="padding: 6px; font-weight: bold; color: #059669;">${currSym}0.00</td></tr>
          </table>
          <p style="font-size: 13px; color: #475569;">Thank you for visiting ${shopName}. We hope to serve you again in the future.</p>
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

/**
 * Dispatches Sales Bill / Tax Invoice to customer WhatsApp & Email
 */
export const dispatchSaleInvoiceNotification = async ({ sale, shop }) => {
  if (!sale) return { success: false, error: 'Missing sale data' };

  const shopName = shop?.name || 'Mobotech mobile care';
  const shopPhone = shop?.phone || '080000 24439';
  const shopAddress = shop?.address || 'Surat, Gujarat';

  const customerPhone = (sale.customer_phone || '').trim();
  const customerEmail = (sale.customer_email || '').trim();
  const customerName = (sale.customer_name || '').trim() || 'Valued Customer';

  const itemsListText = (sale.items || [])
    .map(
      (it) =>
        `• ${it.name}${it.imei ? ` (${it.imei})` : ''}${it.warranty ? ` [Warranty: ${it.warranty}]` : ''} x${it.quantity} - ₹${Number(it.total).toFixed(2)}`
    )
    .join('\n');

  const plainMessage =
    `🧾 *TAX INVOICE / BILL* - *${shopName}*\n\n` +
    `Hello *${customerName}*,\n` +
    `Thank you for your purchase! Here is your bill summary:\n\n` +
    `📄 *Bill / Invoice #:* ${sale.invoice_number}\n` +
    `📅 *Date:* ${sale.invoice_date}\n\n` +
    `*Items:*\n${itemsListText}\n\n` +
    `*Subtotal:* ₹${Number(sale.subtotal).toFixed(2)}\n` +
    (sale.discount_amount > 0 ? `*Discount:* -₹${Number(sale.discount_amount).toFixed(2)}\n` : '') +
    (sale.gst_enabled ? `*GST (${sale.gst_rate}%):* +₹${Number(sale.total_tax).toFixed(2)}\n` : '') +
    `*Total Paid:* ₹${Number(sale.total_amount).toFixed(2)}\n` +
    `*Payment Mode:* ${sale.payment_mode || 'CASH'}\n\n` +
    `📄 *Download Official PDF Bill:*\nhttp://localhost:5000/api/sales/public/${sale.id}/download-pdf\n\n` +
    `🏢 *${shopName}*\n` +
    `📍 ${shopAddress}\n` +
    `📞 ${shopPhone}`;

  const emailSubject = `[${shopName}] Tax Invoice / Bill #${sale.invoice_number}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0284c7; margin: 0; font-size: 24px; text-transform: uppercase;">${shopName}</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">${shopAddress}</p>
        <p style="color: #64748b; font-size: 13px; margin: 2px 0 0;">Phone: <strong>${shopPhone}</strong></p>
      </div>

      <div style="margin-bottom: 20px; font-size: 13px;">
        <table style="width: 100%;">
          <tr>
            <td style="vertical-align: top; width: 50%;">
              <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">Billed To:</p>
              <p style="margin: 4px 0 0; font-size: 15px; font-weight: bold; color: #0f172a;">${customerName}</p>
              <p style="margin: 2px 0 0; color: #475569;">${customerPhone}</p>
              ${sale.customer_address ? `<p style="margin: 2px 0 0; color: #475569;">${sale.customer_address}</p>` : ''}
              ${sale.customer_gstin ? `<p style="margin: 2px 0 0; color: #475569;">GSTIN: <strong>${sale.customer_gstin}</strong></p>` : ''}
            </td>
            <td style="vertical-align: top; width: 50%; text-align: right;">
              <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">Invoice Details:</p>
              <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold; color: #0284c7; font-family: monospace;">Bill #${sale.invoice_number}</p>
              <p style="margin: 2px 0 0; color: #475569;">Date: <strong>${sale.invoice_date}</strong></p>
              <p style="margin: 2px 0 0; color: #475569;">Payment: <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">${sale.payment_mode || 'PAID'}</span></p>
            </td>
          </tr>
        </table>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 8px 10px; font-weight: bold; color: #475569;">Item / Product</th>
            <th style="padding: 8px 10px; text-align: center; font-weight: bold; color: #475569;">Qty</th>
            <th style="padding: 8px 10px; text-align: right; font-weight: bold; color: #475569;">Rate</th>
            <th style="padding: 8px 10px; text-align: right; font-weight: bold; color: #475569;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(sale.items || [])
            .map(
              (it) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px;">
                <div style="font-weight: bold; color: #0f172a;">${it.name}</div>
                ${it.imei ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">IMEI/Serial: ${it.imei}</div>` : ''}
                ${it.warranty ? `<div style="font-size: 11px; color: #0284c7; font-weight: 500;">Warranty: ${it.warranty}</div>` : ''}
              </td>
              <td style="padding: 10px; text-align: center; font-family: monospace;">${it.quantity}</td>
              <td style="padding: 10px; text-align: right; font-family: monospace;">₹${Number(it.rate || 0).toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">₹${Number(it.total || 0).toFixed(2)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div style="width: 100%; margin-bottom: 20px;">
        <table style="width: 260px; margin-left: auto; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 8px; color: #64748b;">Subtotal:</td>
            <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: bold;">₹${Number(sale.subtotal).toFixed(2)}</td>
          </tr>
          ${
            sale.discount_amount > 0
              ? `
          <tr>
            <td style="padding: 4px 8px; color: #10b981;">Discount:</td>
            <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #10b981;">-₹${Number(sale.discount_amount).toFixed(2)}</td>
          </tr>`
              : ''
          }
          ${
            sale.gst_enabled
              ? `
          <tr>
            <td style="padding: 4px 8px; color: #64748b;">GST (${sale.gst_rate}%):</td>
            <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: bold;">+₹${Number(sale.total_tax).toFixed(2)}</td>
          </tr>`
              : ''
          }
          <tr style="border-top: 2px solid #0f172a;">
            <td style="padding: 8px; font-weight: bold; font-size: 15px; color: #0f172a;">Grand Total:</td>
            <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 16px; color: #10b981; font-family: monospace;">₹${Number(sale.total_amount).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 10px; font-size: 12px; color: #64748b; text-align: center;">
        Thank you for choosing <strong>${shopName}</strong>! Please retain this invoice for your records and warranty validation.
      </div>
    </div>
  `;

  const results = { email: false, whatsapp: false };

  // Generate official vector PDF
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateSaleInvoicePdfBuffer({ sale, shop });
  } catch (err) {
    console.warn('⚠️ [Notification] PDF generation warning:', err.message);
  }

  const emailAttachments = pdfBuffer ? [
    {
      name: `Invoice_${sale.invoice_number}.pdf`,
      filename: `Invoice_${sale.invoice_number}.pdf`,
      content: pdfBuffer,
    }
  ] : [];

  // 1. Dispatch Email (Brevo / SMTP with PDF attachment)
  if (customerEmail) {
    try {
      await sendBrevoEmail({
        toEmail: customerEmail,
        toName: customerName,
        subject: emailSubject,
        htmlContent: emailHtml,
        textContent: plainMessage,
        attachments: emailAttachments,
      });
      results.email = true;
      console.log(`✅ [Notification] Sales Invoice #${sale.invoice_number} emailed with PDF to ${customerEmail}`);
    } catch (err) {
      console.warn(`⚠️ [Notification] Failed to email invoice to ${customerEmail}:`, err.message);
    }
  }

  // 2. Dispatch WhatsApp (Baileys with real PDF attachment / Fast2SMS / OpenWA)
  if (customerPhone) {
    try {
      const baileysState = getBaileysStatus();
      if (baileysState.isConnected) {
        if (pdfBuffer) {
          await sendBaileysMessage({
            phone: customerPhone,
            message: plainMessage,
            documentBuffer: pdfBuffer,
            documentFilename: `Invoice_${sale.invoice_no_seq || sale.invoice_number}.pdf`,
            caption: plainMessage,
          });
        } else {
          await sendBaileysMessage({
            phone: customerPhone,
            message: plainMessage,
          });
        }
        results.whatsapp = true;
        console.log(`✅ [Notification] Sales Invoice #${sale.invoice_number} original PDF sent via Baileys WhatsApp to ${customerPhone}`);
      } else if (env.FAST2SMS_API_KEY && env.FAST2SMS_API_KEY.trim()) {
        await sendFast2SmsWhatsApp({
          phone: customerPhone,
          message: plainMessage,
          mediaUrl: `http://localhost:5000/api/sales/public/${sale.id}/download-pdf`,
          documentFilename: `Invoice_${sale.invoice_no_seq || sale.invoice_number}.pdf`,
        });
        results.whatsapp = true;
        console.log(`✅ [Notification] Sales Invoice #${sale.invoice_number} sent via Fast2SMS WhatsApp to ${customerPhone}`);
      } else if (env.OPENWA_API_KEY) {
        await sendOpenWaMessage({
          phone: customerPhone,
          message: plainMessage,
        });
        results.whatsapp = true;
        console.log(`✅ [Notification] Sales Invoice #${sale.invoice_number} sent via OpenWA to ${customerPhone}`);
      } else {
        await sendFast2SmsWhatsApp({
          phone: customerPhone,
          message: plainMessage,
          mediaUrl: `http://localhost:5000/api/sales/public/${sale.id}/download-pdf`,
          documentFilename: `Invoice_${sale.invoice_no_seq || sale.invoice_number}.pdf`,
        });
        results.whatsapp = true;
        console.log(`✅ [Notification Simulator] Sales Invoice #${sale.invoice_number} logged for WhatsApp to ${customerPhone}`);
      }
    } catch (err) {
      console.warn(`⚠️ [Notification] Failed to send WhatsApp invoice to ${customerPhone}:`, err.message);
    }
  }

  // 3. Log into notification_logs for complete audit trail
  try {
    if (customerPhone) {
      await db.notifications.log({
        jobId: null,
        customerId: sale.customer_id || null,
        channel: 'WHATSAPP',
        messageType: 'SALES_INVOICE_PDF',
        recipient: customerPhone,
        status: results.whatsapp ? 'SENT' : 'FAILED',
        provider: getBaileysStatus().isConnected ? 'BAILEYS' : 'FAST2SMS',
        providerResponse: results.whatsapp ? 'Real PDF Sent' : 'Failed',
        errorMessage: null,
      });
    }
    if (customerEmail && results.email) {
      await db.notifications.log({
        jobId: null,
        customerId: sale.customer_id || null,
        channel: 'EMAIL',
        messageType: 'SALES_INVOICE_PDF',
        recipient: customerEmail,
        status: 'SENT',
        provider: 'BREVO',
        providerResponse: 'PDF Attached & Sent',
        errorMessage: null,
      });
    }
  } catch (_) {
    // Non-blocking log
  }

  return results;
};

