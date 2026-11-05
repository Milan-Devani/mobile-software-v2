import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export const getSettings = async (req, res, next) => {
  try {
    const shop = await db.shops.getProfile();
    const notificationConfig = await db.settings.get('notification_config');

    // Never expose plain text API keys or passwords
    const sanitizedNotifications = {
      email_enabled: notificationConfig?.email_enabled ?? true,
      sms_enabled: false,
      whatsapp_enabled: notificationConfig?.whatsapp_enabled ?? true,
      brevo_configured: Boolean(env.BREVO_API_KEY || env.EMAIL_USER),
      brevo_sender: notificationConfig?.sender_email || env.EMAIL_FROM,
      sender_email: notificationConfig?.sender_email || env.EMAIL_FROM,
      openwa_configured: Boolean(env.OPENWA_API_KEY || (env.OPENWA_API_URL && env.OPENWA_API_URL !== 'http://localhost:8000')),
      openwa_url: env.OPENWA_API_URL,
      msg91_configured: false,
      msg91_sender: 'DISABLED',
      msg91_test_mode: true,
    };

    res.json({
      success: true,
      data: {
        shop,
        notifications: sanitizedNotifications,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateShopProfile = async (req, res, next) => {
  try {
    const updated = await db.shops.updateProfile(req.body);
    res.json({
      success: true,
      message: 'Shop profile updated successfully.',
      data: { shop: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const updateNotificationSettings = async (req, res, next) => {
  try {
    const { email_enabled, sms_enabled, whatsapp_enabled, sender_email, sender_name, brevo_sender } = req.body;
    const current = (await db.settings.get('notification_config')) || {};

    const newSenderEmail = sender_email !== undefined ? sender_email : (brevo_sender !== undefined ? brevo_sender : current.sender_email);

    const updated = await db.settings.set(
      'notification_config',
      {
        ...current,
        email_enabled: email_enabled !== undefined ? email_enabled : current.email_enabled,
        sms_enabled: false,
        whatsapp_enabled: whatsapp_enabled !== undefined ? whatsapp_enabled : current.whatsapp_enabled,
        sender_email: newSenderEmail !== undefined ? newSenderEmail : current.sender_email,
        sender_name: sender_name !== undefined ? sender_name : current.sender_name,
      },
      'Notification toggles'
    );

    res.json({
      success: true,
      message: 'Notification settings updated.',
      data: {
        settings: updated,
        sender_email: updated.sender_email || env.EMAIL_FROM,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const testWhatsAppDispatch = async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    const { sendFast2SmsWhatsApp } = await import('../services/fast2smsService.js');
    const { getDynamicGreeting } = await import('../services/notificationService.js');
    const greeting = getDynamicGreeting();

    const result = await sendFast2SmsWhatsApp({
      phone: phone || '8758152507',
      message: message || `${greeting} *Customer*!\n\n*Mobotech Mobile Care - Verification*\nWhatsApp notification service is active and working properly! ❤️`,
    });

    res.json({
      success: true,
      message: 'WhatsApp test dispatched successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const testEmailDispatch = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { sendBrevoEmail } = await import('../services/brevoEmailService.js');
    const { getDynamicGreeting } = await import('../services/notificationService.js');
    const greeting = getDynamicGreeting();
    const recipient = email || 'milandevani994@gmail.com';

    const result = await sendBrevoEmail({
      toEmail: recipient,
      toName: 'Shop Admin',
      subject: 'MoboTech Mobile Care - Email Service Verification',
      textContent: `${greeting}! This is a test email verifying that the MoboTech email dispatch service is active and properly delivering.`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 16px; border-radius: 8px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px;">MoboTech Mobile Care</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Email Service Verification</p>
          </div>
          <div style="padding: 20px 0; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>${greeting}!</p>
            <p>Your email notification dispatcher is working properly and is connected to the Brevo email relay.</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
              <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Recipient:</strong> ${recipient}</p>
              <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <p style="margin: 0; font-size: 13px;"><strong>Status:</strong> Queued successfully via Brevo SMTP</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">MoboTech Mobile Care • Verified Notification System</p>
          </div>
        </div>
      `,
    });

    res.json({
      success: true,
      message: `Test email sent successfully to ${recipient}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
