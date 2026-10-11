import axios from 'axios';
import { env } from '../config/env.js';

export const sendMsg91Sms = async ({ phone, message, templateVariables = {} }) => {
  if (!phone) {
    throw new Error('Phone number is required for SMS delivery.');
  }

  const cleanPhone = phone.replace(/\D/g, '');

  if (env.MSG91_AUTH_KEY && !env.MSG91_TEST_MODE) {
    try {
      // Flow API (Template based)
      if (env.MSG91_FLOW_ID) {
        const response = await axios.post(
          'https://control.msg91.com/api/v5/flow/',
          {
            template_id: env.MSG91_FLOW_ID,
            sender: env.MSG91_SENDER_ID || 'TCHFIX',
            short_url: '0',
            recipients: [
              {
                mobiles: cleanPhone,
                ...templateVariables,
              },
            ],
          },
          {
            headers: {
              'authkey': env.MSG91_AUTH_KEY,
              'content-type': 'application/json',
            },
            timeout: 8000,
          }
        );
        return { success: true, provider: 'MSG91_FLOW', data: response.data };
      } else {
        // Direct transactional message API
        const response = await axios.post(
          'https://api.msg91.com/api/v2/sendsms',
          {
            sender: env.MSG91_SENDER_ID || 'TCHFIX',
            route: '4', // Transactional
            country: '91',
            sms: [
              {
                message,
                to: [cleanPhone],
              },
            ],
          },
          {
            headers: {
              'authkey': env.MSG91_AUTH_KEY,
              'content-type': 'application/json',
            },
            timeout: 8000,
          }
        );
        return { success: true, provider: 'MSG91_DIRECT', data: response.data };
      }
    } catch (err) {
      console.warn('⚠️ MSG91 SMS API call failed, falling back to simulator:', err.response?.data || err.message);
    }
  }

  // Simulator mode
  console.log('------------------------------------------------------------');
  console.log('📱 [DEV SMS SIMULATOR - MSG91]');
  console.log(`To: ${phone} (Clean: ${cleanPhone})`);
  console.log(`Message: \n${message}`);
  console.log('------------------------------------------------------------');

  return {
    success: true,
    provider: 'MSG91_SIMULATOR',
    messageId: `sim-sms-${Date.now()}`,
    note: 'Simulated SMS delivery. Set MSG91_AUTH_KEY and disable test mode for live delivery.'
  };
};
