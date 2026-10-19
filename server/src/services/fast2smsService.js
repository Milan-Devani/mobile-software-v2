import axios from 'axios';
import { env } from '../config/env.js';

/**
 * Fast2SMS Official WhatsApp & SMS Messaging Service
 * Documentation: https://www.fast2sms.com/dev/whatsapp
 */

/**
 * Cleans and standardizes an Indian phone number
 * @param {string} phone 
 * @returns {string} 10-digit mobile number
 */
export const cleanIndianPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits;
};

/**
 * Sends a WhatsApp message via Fast2SMS API
 * @param {Object} options
 * @param {string} options.phone - Recipient mobile number
 * @param {string} options.message - Text message / body
 * @param {string} [options.messageId] - Fast2SMS pre-approved WhatsApp message_id (if using templates)
 * @param {string} [options.variablesValues] - Pipe-separated values e.g. "Milan|iPhone 14|8500"
 * @param {string} [options.phoneNumberId] - Registered WABA phone number id (optional)
 * @param {string} [options.mediaUrl] - Public URL to PDF or media file (optional)
 * @param {string} [options.documentFilename] - Filename for PDF e.g. Invoice_INV001.pdf (optional)
 */
export const sendFast2SmsWhatsApp = async ({
  phone,
  message,
  messageId,
  variablesValues,
  phoneNumberId,
  mediaUrl,
  documentFilename,
}) => {
  const cleanPhone = cleanIndianPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    throw new Error(`Invalid Indian phone number: ${phone}. 10 digits required.`);
  }

  const apiKey = env.FAST2SMS_API_KEY;

  // LIVE MODE: When Fast2SMS API Key is provided
  if (apiKey && apiKey.trim()) {
    try {
      const activePhoneId = phoneNumberId || env.FAST2SMS_PHONE_NUMBER_ID || '';

      // If a pre-approved template message_id is provided, use the template route
      if (messageId) {
        const params = new URLSearchParams({
          message_id: messageId,
          numbers: `91${cleanPhone}`,
          variables_values: variablesValues || '',
        });
        if (activePhoneId) {
          params.append('phone_number_id', activePhoneId);
        }
        if (mediaUrl) {
          params.append('media_url', mediaUrl);
          if (documentFilename) {
            params.append('document_filename', documentFilename);
          }
        }

        const response = await axios.get(
          `https://www.fast2sms.com/dev/whatsapp?${params.toString()}`,
          {
            headers: {
              Authorization: apiKey.trim(),
              accept: 'application/json',
            },
            timeout: 10000,
          }
        );

        return {
          success: response.data?.return === true || response.data?.status === 'success',
          provider: 'FAST2SMS_WHATSAPP_TEMPLATE',
          data: response.data,
          phone: cleanPhone,
        };
      }

      // If activePhoneId is present, we can also use the WhatsApp Session / Direct route
      if (activePhoneId) {
        const payload = mediaUrl
          ? {
              type: 'document',
              document: {
                link: mediaUrl,
                filename: documentFilename || 'Invoice.pdf',
                caption: message,
              },
            }
          : {
              type: 'text',
              text: {
                text: message,
              },
            };

        const response = await axios.post(
          `https://www.fast2sms.com/dev/whatsapp-session?phone_number_id=${encodeURIComponent(activePhoneId)}&to=91${cleanPhone}`,
          payload,
          {
            headers: {
              Authorization: apiKey.trim(),
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
            timeout: 10000,
          }
        );

        return {
          success: response.data?.return === true || response.data?.status === 'success',
          provider: 'FAST2SMS_WHATSAPP_SESSION',
          data: response.data,
          phone: cleanPhone,
        };
      }

      // Fallback: If mediaUrl is provided, append the link to the SMS message
      const textWithLink = mediaUrl
        ? `${message}\nDownload Document: ${mediaUrl}`
        : message;

      return await sendFast2SmsSms({ phone: cleanPhone, message: textWithLink });
    } catch (err) {
      console.error('❌ Fast2SMS API call error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.message || err.message);
    }
  }

  // SIMULATOR MODE (Local development / before user pastes API key)
  console.log('------------------------------------------------------------');
  console.log('💬 [DEV WHATSAPP SIMULATOR - FAST2SMS]');
  console.log(`📱 To: +91 ${cleanPhone}`);
  console.log(`📝 Message:\n${message}`);
  console.log('💡 Note: Add FAST2SMS_API_KEY in server/.env to send live WhatsApp messages.');
  console.log('------------------------------------------------------------');

  return {
    success: true,
    provider: 'FAST2SMS_SIMULATOR',
    messageId: `sim-fast2sms-${Date.now()}`,
    phone: cleanPhone,
    note: 'Simulated Fast2SMS delivery. Add FAST2SMS_API_KEY in server/.env for live delivery.',
  };
};

/**
 * Sends a direct SMS (e.g., "Your mobile is ready for pickup!") via Fast2SMS
 * @param {Object} options
 * @param {string} options.phone - Recipient 10-digit mobile number
 * @param {string} options.message - SMS message text
 */
export const sendFast2SmsSms = async ({ phone, message }) => {
  const cleanPhone = cleanIndianPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    throw new Error(`Invalid Indian phone number: ${phone}. 10 digits required.`);
  }

  const apiKey = env.FAST2SMS_API_KEY;

  if (apiKey && apiKey.trim()) {
    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanPhone,
        },
        {
          headers: {
            Authorization: apiKey.trim(),
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        success: response.data?.return === true,
        provider: 'FAST2SMS_SMS',
        data: response.data,
        phone: cleanPhone,
      };
    } catch (err) {
      console.error('❌ Fast2SMS SMS error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.message || err.message);
    }
  }

  // SMS Simulator Mode
  console.log('------------------------------------------------------------');
  console.log('📱 [DEV SMS SIMULATOR - FAST2SMS]');
  console.log(`To: +91 ${cleanPhone}`);
  console.log(`Message: \n${message}`);
  console.log('------------------------------------------------------------');

  return {
    success: true,
    provider: 'FAST2SMS_SMS_SIMULATOR',
    messageId: `sim-sms-${Date.now()}`,
    phone: cleanPhone,
  };
};

/**
 * Quick direct test helper
 */
export const testFast2SmsConnection = async (testPhone, customMessage) => {
  const clean = cleanIndianPhoneNumber(testPhone);
  const msg = customMessage || `*Mobotech Mobile Care - Test Message*\nHello! This is a test verification message from Mobotech service portal.`;
  return await sendFast2SmsWhatsApp({ phone: clean, message: msg });
};
