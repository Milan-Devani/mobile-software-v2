export const MAX_PHONE_INPUT_LENGTH = 25;
export const PHONE_NUMBER_VALIDATION_MESSAGE =
  'Enter a valid phone number with 6 to 15 digits.';

const PHONE_CHARACTERS_PATTERN = /^\+?[\d\s().-]+$/;

export const isValidPhoneNumber = (value) => {
  if (typeof value !== 'string') return false;

  const phone = value.trim();
  if (!phone || phone.length > MAX_PHONE_INPUT_LENGTH) return false;
  if (!PHONE_CHARACTERS_PATTERN.test(phone)) return false;

  const digitCount = phone.replace(/\D/g, '').length;
  return digitCount >= 6 && digitCount <= 15;
};
