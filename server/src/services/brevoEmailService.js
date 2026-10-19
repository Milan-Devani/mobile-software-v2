import axios from 'axios';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (env.EMAIL_USER && env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST || 'smtp-relay.brevo.com',
      port: env.EMAIL_PORT || 587,
      secure: false, // TLS
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
};

export const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent, textContent, attachments = [] }) => {
  if (!toEmail) {
    throw new Error('Recipient email is required.');
  }

  let lastError = null;

  // 1. Try Brevo REST API v3 if BREVO_API_KEY is provided
  if (env.BREVO_API_KEY) {
    try {
      let senderName = 'Mobotech mobile care';
      let senderEmail = 'onlylaptop994@gmail.com';
      if (env.EMAIL_FROM) {
        if (env.EMAIL_FROM.includes('<')) {
          const match = env.EMAIL_FROM.match(/^(.*?)\s*<([^>]+)>/);
          if (match) {
            senderName = match[1]?.trim() || senderName;
            senderEmail = match[2]?.trim() || senderEmail;
          }
        } else {
          senderEmail = env.EMAIL_FROM.trim();
        }
      }

      const brevoAttachments = attachments && attachments.length > 0
        ? attachments.map((att) => ({
            name: att.name || att.filename || 'attachment.pdf',
            content: Buffer.isBuffer(att.content)
              ? att.content.toString('base64')
              : (typeof att.content === 'string' && !att.content.startsWith('http') ? att.content : undefined),
            url: typeof att.content === 'string' && att.content.startsWith('http') ? att.content : undefined,
          }))
        : undefined;

      const payload = {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent,
        textContent: textContent || subject,
        ...(brevoAttachments ? { attachment: brevoAttachments } : {}),
      };

      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        payload,
        {
          headers: {
            'accept': 'application/json',
            'api-key': env.BREVO_API_KEY,
            'content-type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return { success: true, messageId: response.data?.messageId, provider: 'BREVO_API' };
    } catch (err) {
      lastError = err.response?.data?.message || err.message;
      console.warn('⚠️ Brevo API call warning:', lastError);
    }
  }

  // 2. Try SMTP via Nodemailer if SMTP credentials are provided
  const smtpTransport = getTransporter();
  if (smtpTransport) {
    try {
      const smtpAttachments = attachments && attachments.length > 0
        ? attachments.map((att) => ({
            filename: att.name || att.filename || 'attachment.pdf',
            content: att.content,
            contentType: att.contentType || 'application/pdf',
          }))
        : undefined;

      const info = await smtpTransport.sendMail({
        from: env.EMAIL_FROM,
        to: `"${toName || toEmail}" <${toEmail}>`,
        subject,
        text: textContent || subject,
        html: htmlContent,
        ...(smtpAttachments ? { attachments: smtpAttachments } : {}),
      });
      return { success: true, messageId: info.messageId, provider: 'BREVO_SMTP' };
    } catch (err) {
      console.warn('⚠️ Brevo SMTP failed:', err.message);
      throw err;
    }
  }

  // 3. Development / Test Mode Mock Output
  console.log('------------------------------------------------------------');
  console.log('📧 [DEV EMAIL SIMULATOR - BREVO]');
  console.log(`To: ${toName} <${toEmail}>`);
  console.log(`Subject: ${subject}`);
  if (lastError) console.log(`Note: Brevo API response: ${lastError}`);
  console.log(`Preview: ${textContent || subject.slice(0, 100)}`);
  console.log('------------------------------------------------------------');

  return {
    success: true,
    messageId: `sim-email-${Date.now()}`,
    provider: lastError ? 'BREVO_ERROR_FALLBACK' : 'BREVO_SIMULATOR',
    note: lastError ? `Brevo API note: ${lastError}` : 'Simulated email delivery in development mode.'
  };
};
