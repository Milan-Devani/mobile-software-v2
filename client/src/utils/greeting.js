/**
 * Time-of-day greeting in India Standard Time, used at the start of WhatsApp messages.
 * Falls back to the device clock if the Intl time zone data is unavailable.
 */
export const getGreeting = () => {
  let hour;
  try {
    const istTimeStr = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: 'numeric',
    });
    hour = parseInt(istTimeStr, 10);
  } catch (_) {
    hour = new Date().getHours();
  }
  if (hour >= 5 && hour < 12) return '☀️ Good Morning';
  if (hour >= 12 && hour < 17) return '🌤️ Good Afternoon';
  if (hour >= 17 && hour < 21) return '🌆 Good Evening';
  return '🌙 Hello';
};
