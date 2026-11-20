import React from 'react';
import { Cake } from 'lucide-react';
import { SpatialDatePicker } from '../common/SpatialDatePicker';

/** Today's date as 'YYYY-MM-DD' in the browser's local time (used as the picker's max). */
export const todayIsoDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Optional DOB check: empty is fine; otherwise must be a real date, not in the future, year >= 1900. */
export const isValidDateOfBirth = (value) => {
  if (!value) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  return y >= 1900 && value <= todayIsoDate();
};

export const DATE_OF_BIRTH_ERROR = 'Enter a valid date of birth (not in the future).';

/** "1 February" from 'YYYY-MM-DD' — shown so staff can confirm day vs month at a glance. */
export const formatBirthdayDayMonth = (value) => {
  if (!value || !isValidDateOfBirth(String(value).slice(0, 10))) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
};

/** 'DD/MM/YYYY' from 'YYYY-MM-DD' for read-only display. */
export const formatDateOfBirth = (value) => {
  const iso = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Calendar date-of-birth input used in every customer create/edit form.
 * Value is always 'YYYY-MM-DD' (or '' when not provided). Optional field.
 */
export const DateOfBirthField = ({ value, onChange, error, name = 'date_of_birth', labelClassName }) => {
  const dayMonth = formatBirthdayDayMonth(value);
  // While typing, the picker passes partial text (e.g. "01/02/20"); only flag it once complete.
  const isPartial = Boolean(value) && !/^\d{4}-\d{2}-\d{2}$/.test(String(value)) && String(value).length < 10;
  const invalid = Boolean(value) && !isPartial && !isValidDateOfBirth(value);

  return (
    <div>
      <label
        htmlFor={`${name}-input`}
        className={labelClassName || 'block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1'}
      >
        Date of Birth
      </label>
      <SpatialDatePicker
        id={`${name}-input`}
        name={name}
        value={value || ''}
        onChange={onChange}
        min="1900-01-01"
        max={todayIsoDate()}
        icon={Cake}
        iconClassName="text-pink-500"
        emptyStartView="year"
        defaultViewYear={new Date().getFullYear() - 25}
        invalid={Boolean(error) || invalid}
      />
      {(error && !isPartial) || invalid ? (
        <p className="text-[11px] text-rose-400 mt-1">{error || DATE_OF_BIRTH_ERROR}</p>
      ) : (
        <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
          {isPartial
            ? 'Keep typing as DD/MM/YYYY, e.g. 01/02/2002'
            : dayMonth
            ? `🎂 Birthday wish on WhatsApp & Email every year on ${dayMonth}.`
            : 'Optional: we send a birthday wish on WhatsApp & Email.'}
        </p>
      )}
    </div>
  );
};

export default DateOfBirthField;
