export const MAX_CURRENCY_AMOUNT = 9_999_999.99;
export const MAX_QUANTITY = 9_999_999;
export const PHONE_NUMBER_LENGTH = 10;

export const sanitizePhoneNumber = (value) => String(value || '')
  .replace(/\D/g, '')
  .slice(0, PHONE_NUMBER_LENGTH);

const EDITING_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

/**
 * Prevents number inputs from accepting spaces, letters, exponent notation,
 * or other symbols. Negative values remain available only where required.
 */
export const numberInputProps = ({
  allowDecimal = true,
  allowNegative = false,
} = {}) => ({
  inputMode: allowDecimal ? 'decimal' : 'numeric',
  onKeyDown: (event) => {
    if (event.ctrlKey || event.metaKey || EDITING_KEYS.has(event.key)) return;

    if (/^\d$/.test(event.key)) return;

    const { value, selectionStart } = event.currentTarget;
    if (allowDecimal && event.key === '.' && !value.includes('.')) return;
    if (
      allowNegative &&
      event.key === '-' &&
      selectionStart === 0 &&
      !value.includes('-')
    ) return;

    event.preventDefault();
  },
  onPaste: (event) => {
    const pastedValue = event.clipboardData.getData('text');
    const pattern = allowNegative
      ? /^-?\d+(?:\.\d+)?$/
      : /^\d+(?:\.\d+)?$/;
    if (!pattern.test(pastedValue)) event.preventDefault();
  },
});

// Keeps controlled inputs within their allowed range without disrupting normal typing.
export const limitNumberValue = (value, { min = 0, max = MAX_CURRENCY_AMOUNT } = {}) => {
  if (value === '') return value;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  if (numberValue < min) return String(min);
  if (numberValue > max) return String(max);
  return value;
};
