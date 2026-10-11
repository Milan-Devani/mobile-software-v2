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

export const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent, textContent }) => {
  if (!toEmail) {
    throw new Error('Recipient email is required.');
  }

  // 1. Try Brevo REST API v3 if BREVO_API_KEY is provided
  if (env.BREVO_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: 'TechFix Pro Repairs',
            email: env.EMAIL_FROM.includes('<')
              ? env.EMAIL_FROM.match(/<([^>]+)>/)[1]
              : env.EMAIL_FROM || 'notifications@techfixpro.com',
          },
          to: [{ email: toEmail, name: toName || toEmail }],
          subject,
          htmlContent,
          textContent: textContent || subject,
        },
        {
          headers: {
            'accept': 'application/json',
            'api-key': env.BREVO_API_KEY,
            'content-type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return { success: true, messageId: response.data?.messageId, provider: 'BREVO_API' };
    } catch (err) {
      console.warn('⚠️ Brevo API call failed, attempting SMTP fallback:', err.response?.data || err.message);
    }
  }

  // 2. Try SMTP via Nodemailer if SMTP credentials are provided
  const smtpTransport = getTransporter();
  if (smtpTransport) {
    try {
      const info = await smtpTransport.sendMail({
        from: env.EMAIL_FROM,
        to: `"${toName || toEmail}" <${toEmail}>`,
        subject,
        text: textContent || subject,
        html: htmlContent,
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
  console.log(`Preview: ${textContent || subject.slice(0, 100)}`);
  console.log('------------------------------------------------------------');

  return {
    success: true,
    messageId: `sim-email-${Date.now()}`,
    provider: 'BREVO_SIMULATOR',
    note: 'Simulated email delivery in development mode. Set BREVO_API_KEY to send live emails.'
  };
};
