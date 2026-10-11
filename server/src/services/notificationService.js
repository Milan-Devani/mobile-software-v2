import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { sendBrevoEmail } from './brevoEmailService.js';
import { sendOpenWaMessage } from './openWaService.js';
import { sendMsg91Sms } from './msg91SmsService.js';

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
  const shopName = shop?.name || 'TechFix Pro Repairs';
  const shopPhone = shop?.phone || '+1 (555) 789-0123';
  const shopAddress = shop?.address || '742 Evergreen Terrace, Suite 12';
  const approvalUrl = `${env.CLIENT_URL}/repair/${job.job_number}/approval?token=${job.approval_token}`;

  let subject = '';
  let emailHtml = '';
  let plainMessage = '';

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
      plainMessage = `Hello ${customer.full_name}, your repair estimate for Job #${job.job_number} (${job.device?.model}) is ready. Estimated Total: $${Number(job.total_amount).toFixed(2)}. Please review and authorize your repair here: ${approvalUrl}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Diagnosis & Repair Estimate</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>We have completed diagnosis of your <strong>${job.device?.brand || ''} ${job.device?.model || 'Device'}</strong> (Job #${job.job_number}).</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Estimated Total:</strong> <span style="font-size: 20px; color: #0f172a; font-weight: bold;">$${Number(job.total_amount).toFixed(2)}</span></p>
            <p style="margin: 0; color: #64748b; font-size: 13px;">Includes diagnostic labor, genuine replacement parts, and 90-day warranty.</p>
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
      plainMessage = `Great news ${customer.full_name}! Your ${job.device?.model || 'Device'} (Job #${job.job_number}) has been fully repaired, passed all quality checks, and is READY FOR PICKUP at ${shopName} (${shopAddress}). Amount Due: $${Number(job.balance_due || 0).toFixed(2)}.`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #10b981; margin-bottom: 4px;">🎉 Ready for Pickup!</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">${shopName} Service Center</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>Your repair for <strong>${job.device?.brand || ''} ${job.device?.model || 'Device'}</strong> (Job #${job.job_number}) is complete! The device has successfully passed our 16-point hardware quality assurance test.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 6px; color: #64748b;">Total Amount:</td><td style="padding: 6px; font-weight: bold;">$${Number(job.total_amount).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Paid to date:</td><td style="padding: 6px; color: #10b981;">$${Number(job.paid_amount || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Remaining Due:</td><td style="padding: 6px; color: #ef4444; font-weight: bold;">$${Number(job.balance_due || 0).toFixed(2)}</td></tr>
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

    case 'INVOICE_GENERATED':
    case 'PAYMENT_RECEIVED':
      subject = `[${shopName}] Payment Receipt & Invoice - Job #${job.job_number}`;
      plainMessage = `Thank you ${customer.full_name}! Payment received for Job #${job.job_number}. Amount: $${Number(metadata.paymentAmount || job.paid_amount).toFixed(2)}. Remaining Balance: $${Number(job.balance_due || 0).toFixed(2)}. Warranty: ${job.warranty_days || 90} Days. ${shopName}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7; margin-bottom: 4px;">${shopName}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Payment Receipt & Warranty Confirmation</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p>Dear <strong>${customer.full_name}</strong>,</p>
          <p>We have successfully recorded your payment for Job #${job.job_number}.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 6px; color: #64748b;">Device:</td><td style="padding: 6px;">${job.device?.brand || ''} ${job.device?.model || 'Device'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Payment Method:</td><td style="padding: 6px; font-weight: bold;">${metadata.paymentMethod || 'CASH'}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Amount Paid:</td><td style="padding: 6px; font-weight: bold; color: #10b981;">$${Number(metadata.paymentAmount || job.paid_amount).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Remaining Balance:</td><td style="padding: 6px; font-weight: bold;">$${Number(job.balance_due || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Warranty Coverage:</td><td style="padding: 6px; color: #0284c7; font-weight: bold;">${job.warranty_days || 90} Days Hardware Warranty</td></tr>
          </table>
          <p style="font-size: 13px; color: #475569;">Thank you for your business! Please keep this receipt for warranty claims.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">${shopName} • ${shopPhone}</p>
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

  // Channel 2: WhatsApp (OpenWA)
  const waNumber = customer.whatsapp_number || customer.phone;
  if (channels.includes('WHATSAPP') && waNumber) {
    try {
      const waResult = await sendOpenWaMessage({
        phone: waNumber,
        message: plainMessage,
      });

      await db.notifications.log({
        jobId: job.id,
        customerId: customer.id,
        channel: 'WHATSAPP',
        messageType: type,
        recipient: waNumber,
        status: waResult.success ? 'SENT' : 'FAILED',
        provider: 'OPENWA',
        providerResponse: waResult,
      });
      results.push({ channel: 'WHATSAPP', success: true });
    } catch (err) {
      console.warn('❌ WhatsApp dispatch failed:', err.message);
      await db.notifications.log({
        jobId: job.id,
        customerId: customer.id,
        channel: 'WHATSAPP',
        messageType: type,
        recipient: waNumber,
        status: 'FAILED',
        provider: 'OPENWA',
        errorMessage: err.message,
      });
      results.push({ channel: 'WHATSAPP', success: false, error: err.message });
    }
  }

  // Channel 3: SMS (MSG91)
  if (channels.includes('SMS') && customer.phone) {
    try {
      const smsResult = await sendMsg91Sms({
        phone: customer.phone,
        message: plainMessage,
        templateVariables: {
          name: customer.full_name,
          job_number: job.job_number,
          amount: String(job.total_amount),
        },
      });

      await db.notifications.log({
        jobId: job.id,
        customerId: customer.id,
        channel: 'SMS',
        messageType: type,
        recipient: customer.phone,
        status: smsResult.success ? 'SENT' : 'FAILED',
        provider: 'MSG91',
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
        provider: 'MSG91',
        errorMessage: err.message,
      });
      results.push({ channel: 'SMS', success: false, error: err.message });
    }
  }

  return { success: true, results };
};
