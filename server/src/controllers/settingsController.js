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
      sms_enabled: notificationConfig?.sms_enabled ?? true,
      whatsapp_enabled: notificationConfig?.whatsapp_enabled ?? true,
      brevo_configured: Boolean(env.BREVO_API_KEY || env.EMAIL_USER),
      brevo_sender: env.EMAIL_FROM,
      openwa_configured: Boolean(env.OPENWA_API_KEY || (env.OPENWA_API_URL && env.OPENWA_API_URL !== 'http://localhost:8000')),
      openwa_url: env.OPENWA_API_URL,
      msg91_configured: Boolean(env.MSG91_AUTH_KEY),
      msg91_sender: env.MSG91_SENDER_ID,
      msg91_test_mode: env.MSG91_TEST_MODE,
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
    const { email_enabled, sms_enabled, whatsapp_enabled } = req.body;
    const current = (await db.settings.get('notification_config')) || {};

    const updated = await db.settings.set(
      'notification_config',
      {
        ...current,
        email_enabled: email_enabled !== undefined ? email_enabled : current.email_enabled,
        sms_enabled: sms_enabled !== undefined ? sms_enabled : current.sms_enabled,
        whatsapp_enabled: whatsapp_enabled !== undefined ? whatsapp_enabled : current.whatsapp_enabled,
      },
      'Notification toggles'
    );

    res.json({
      success: true,
      message: 'Notification settings updated.',
      data: { settings: updated },
    });
  } catch (err) {
    next(err);
  }
};
