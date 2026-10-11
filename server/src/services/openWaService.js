import axios from 'axios';
import { env } from '../config/env.js';

export const sendOpenWaMessage = async ({ phone, message }) => {
  if (!phone) {
    throw new Error('Phone number is required for WhatsApp messaging.');
  }

  // Clean phone number: remove non-digits
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) {
    throw new Error('Invalid phone number format.');
  }

  // Format chatId for OpenWA (e.g. 15554321098@c.us)
  const chatId = `${cleanPhone}@c.us`;

  if (env.OPENWA_API_KEY || (env.OPENWA_API_URL && env.OPENWA_API_URL !== 'http://localhost:8000')) {
    try {
      // OpenWA standard REST endpoint
      const headers = {
        'Content-Type': 'application/json',
      };
      if (env.OPENWA_API_KEY) {
        headers['Authorization'] = `Bearer ${env.OPENWA_API_KEY}`;
      }

      const response = await axios.post(
        `${env.OPENWA_API_URL}/api/sendText`,
        {
          chatId,
          content: message,
          session: env.OPENWA_SESSION_ID || 'default',
        },
        { headers, timeout: 8000 }
      );

      return {
        success: true,
        provider: 'OPENWA_API',
        data: response.data,
      };
    } catch (err) {
      console.warn('⚠️ OpenWA gateway call failed, fallback to simulator:', err.response?.data || err.message);
    }
  }

  // Simulator mode
  console.log('------------------------------------------------------------');
  console.log('💬 [DEV WHATSAPP SIMULATOR - OPENWA]');
  console.log(`To: ${phone} (${chatId})`);
  console.log(`Message: \n${message}`);
  console.log('------------------------------------------------------------');

  return {
    success: true,
    provider: 'OPENWA_SIMULATOR',
    messageId: `sim-wa-${Date.now()}`,
    note: 'Simulated WhatsApp delivery. Connect OpenWA instance at OPENWA_API_URL for live delivery.'
  };
};
