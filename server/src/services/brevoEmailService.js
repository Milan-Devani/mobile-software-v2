import axios from 'axios';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { db } from '../db/db.js';

let transporter = null;

/**
 * Sanitizes and normalizes Brevo SMTP credentials:
 * - Automatically prepends 'xsmtpsib-' to SMTP passwords if omitted by user
 * - Interchanges EMAIL_PASSWORD and BREVO_API_KEY when applicable
 */
const getNormalizedSmtpCredentials = () => {
  let user = (env.EMAIL_USER || '').trim();
  let pass = (env.EMAIL_PASSWORD || '').trim();
  const host = (env.EMAIL_HOST || 'smtp-relay.brevo.com').trim();
  const apiKey = (env.BREVO_API_KEY || '').trim();

  // If EMAIL_PASSWORD is missing but BREVO_API_KEY is provided
  if (!pass && apiKey) {
    pass = apiKey;
  }

  // If EMAIL_USER is missing but we have Brevo host
  if (!user && (host.includes('brevo.com') || host.includes('sendinblue.com'))) {
    user = 'c17778001@smtp-brevo.com';
  }

  // If password belongs to Brevo and is missing the required 'xsmtpsib-' prefix, auto-prepend it
  if (pass && (host.includes('brevo.com') || host.includes('sendinblue.com') || user.includes('smtp-brevo.com'))) {
    if (!pass.startsWith('xsmtpsib-') && !pass.startsWith('xkeysib-')) {
      pass = `xsmtpsib-${pass}`;
    }
  }

  return { user, pass, host };
};

const createSmtpTransportForPort = (port, secure = false) => {
  const { user, pass, host } = getNormalizedSmtpCredentials();
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 12000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
};

export const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent, textContent, attachments = [] }) => {
  if (!toEmail) {
    throw new Error('Recipient email is required.');
  }

  let lastError = null;

  // Retrieve custom sender email from notification config if configured
  const notificationConfig = await db.settings.get('notification_config').catch(() => null);
  const activeEmailFrom = (notificationConfig?.sender_email || env.EMAIL_FROM || '').trim().replace(/^["']|["']$/g, '');

  // Parse sender name and email from active config / env
  let senderName = (env.BREVO_SENDER_NAME || 'MoboTech Mobile Care').trim().replace(/^["']|["']$/g, '');
  let senderEmail = 'mobotechmobilecare.support@gmail.com';

  if (activeEmailFrom) {
    if (activeEmailFrom.includes('<')) {
      const match = activeEmailFrom.match(/^(.*?)\s*<([^>]+)>/);
      if (match) {
        senderName = match[1]?.trim().replace(/^["']|["']$/g, '') || senderName;
        senderEmail = match[2]?.trim().replace(/^["']|["']$/g, '') || senderEmail;
      }
    } else {
      senderEmail = activeEmailFrom.trim().replace(/^["']|["']$/g, '');
    }
  }

  // Ensure sender email is verified in Brevo
  if (senderEmail === 'notifications@mobotech.com') {
    senderEmail = 'mobotechmobilecare.support@gmail.com';
  }

  const formattedFrom = `"${senderName}" <${senderEmail}>`;

  // 1. Try Brevo REST API v3 ONLY if a real REST API key (starts with xkeysib-) is provided
  const isBrevoApiKey = env.BREVO_API_KEY && env.BREVO_API_KEY.startsWith('xkeysib-');
  if (isBrevoApiKey) {
    try {
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
        replyTo: {
          name: senderName,
          email: senderEmail,
        },
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

  // 2. Try SMTP via Nodemailer with multi-port fallback (587 -> 2525 -> 465)
  const { user, pass } = getNormalizedSmtpCredentials();
  if (user && pass) {
    const smtpAttachments = attachments && attachments.length > 0
      ? attachments.map((att) => ({
          filename: att.name || att.filename || 'attachment.pdf',
          content: att.content,
          contentType: att.contentType || 'application/pdf',
        }))
      : undefined;

    const portsToTry = [
      env.EMAIL_PORT || 587,
      2525,
      465,
    ].filter((p, idx, arr) => arr.indexOf(p) === idx);

    let smtpError = null;

    for (const port of portsToTry) {
      try {
        const isSecure = port === 465;
        const currentTransporter = (port === (env.EMAIL_PORT || 587) && transporter)
          ? transporter
          : createSmtpTransportForPort(port, isSecure);

        if (!currentTransporter) continue;

        const info = await currentTransporter.sendMail({
          from: formattedFrom,
          replyTo: formattedFrom,
          to: `"${toName || toEmail}" <${toEmail}>`,
          subject,
          text: textContent || subject,
          html: htmlContent,
          ...(smtpAttachments ? { attachments: smtpAttachments } : {}),
        });

        // Cache working transporter
        transporter = currentTransporter;
        return { success: true, messageId: info.messageId, provider: `BREVO_SMTP_PORT_${port}` };
      } catch (err) {
        smtpError = err;
        console.warn(`⚠️ Brevo SMTP on port ${port} failed: ${err.message}. Trying next fallback port...`);
        transporter = null;
      }
    }

    if (smtpError) {
      console.error('❌ All Brevo SMTP ports failed:', smtpError.message);
      lastError = smtpError.message;
      if (env.NODE_ENV === 'production') {
        throw new Error(
          `Failed to send email via Brevo SMTP: ${smtpError.message}. Note: Cloud platforms like Render block SMTP ports (587/465). To fix, add a Brevo REST API Key (starts with 'xkeysib-') in BREVO_API_KEY environment variable.`
        );
      }
    }
  }

  // In production, if neither API nor SMTP credentials were configured or succeeded, throw
  if (env.NODE_ENV === 'production' && !lastError) {
    throw new Error('Email credentials not configured or all email delivery channels failed.');
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
