/**
 * Legacy MSG91 SMS Service (Disabled - kept for backward compatibility so older callers don't throw)
 */
export const sendMsg91Sms = async ({ phone } = {}) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  console.log(`ℹ️ [MSG91] SMS feature is disabled. Message to ${cleanPhone || phone} not dispatched.`);
  return {
    success: false,
    disabled: true,
    provider: 'MSG91_DISABLED',
    message: 'SMS notification feature has been disabled.',
  };
};

