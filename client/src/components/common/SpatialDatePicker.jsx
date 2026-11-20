import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

/**
 * SpatialDatePicker — single-date picker that follows the app's Spatial theme
 * (all 3 visual styles × light/dark) via the shared CSS variables and the
 * `.spatial-dropdown-panel` surface used by SpatialSelect.
 *
 * - Value in/out is always 'YYYY-MM-DD' ('' when empty). While the user is
 *   mid-typing an incomplete date, the raw text is passed to onChange so the
 *   parent's validation can block submit instead of silently dropping it.
 * - Type DD/MM/YYYY directly (slashes auto-inserted) or pick from the calendar.
 * - Calendar has Day → Month → Year views, so far-away years (e.g. a date of
 *   birth) take three clicks instead of hundreds of month steps.
 * - Rendered in a portal with fixed positioning so it is never clipped by a
 *   scrolling modal body, and flips above the input when there is no room below.
 */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const PANEL_WIDTH = 300;
const GAP = 6;

const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const isIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const todayIso = () => {
  const d = new Date();
  return toIso(d.getFullYear(), d.getMonth(), d.getDate());
};
const parseIso = (v) => {
  if (!isIso(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return { y, m: m - 1, d };
};
const isoToDisplay = (v) => {
  const p = parseIso(v);
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : '';
};
/** Keeps digits only and re-inserts slashes as DD/MM/YYYY while typing. */
const maskTyped = (raw) => {
  const digits = String(raw).replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};
const displayToIso = (text) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return parseIso(iso) ? iso : null;
};

export const SpatialDatePicker = ({
  value = '',
  onChange,
  min = '1900-01-01',
  max = '',
  placeholder = 'DD/MM/YYYY',
  icon: Icon = CalendarIcon,
  iconClassName = 'text-[var(--spatial-text-muted)]',
  /** 'day' | 'year' — view to open on when no date is selected yet */
  emptyStartView = 'day',
  /** Year to show when nothing is selected (defaults to max/today's year) */
  defaultViewYear,
  id,
  name,
  disabled = false,
  invalid = false,
  className = '',
}) => {
  const maxIso = max || '';
  const anchorRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState(isoToDisplay(value));
  const [view, setView] = useState('day'); // 'day' | 'month' | 'year'
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' });

  const selected = parseIso(value);
  const fallbackYear = defaultViewYear || (parseIso(maxIso)?.y ?? new Date().getFullYear());
  const [viewYear, setViewYear] = useState(selected?.y ?? fallbackYear);
  const [viewMonth, setViewMonth] = useState(selected?.m ?? new Date().getMonth());

  const minParts = parseIso(min);
  const maxParts = parseIso(maxIso);
  const today = todayIso();

  // Keep typed text in sync when the value changes from outside (reset, calendar pick, edit form load)
  useEffect(() => {
    if (isIso(value)) setText(isoToDisplay(value));
    else if (!value) setText('');
  }, [value]);

  const isOutOfRange = (iso) => (min && iso < min) || (maxIso && iso > maxIso);

  /* ---------------- open / close / positioning ---------------- */

  const openPicker = () => {
    if (disabled) return;
    const sel = parseIso(value);
    if (sel) {
      setViewYear(sel.y);
      setViewMonth(sel.m);
      setView('day');
    } else {
      setViewYear(fallbackYear);
      setView(emptyStartView);
    }
    setIsOpen(true);
  };
  const closePicker = () => setIsOpen(false);

  const reposition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelH = panelRef.current?.offsetHeight || 360;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < panelH + GAP + 8 && rect.top > panelH + GAP + 8;
    const top = placeAbove ? rect.top - panelH - GAP : rect.bottom + GAP;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPos({ top: Math.max(8, top), left, placement: placeAbove ? 'top' : 'bottom' });
  };

  useLayoutEffect(() => {
    if (isOpen) reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, view, viewMonth, viewYear]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onScrollOrResize = () => reposition();
    const onPointerDown = (e) => {
      if (anchorRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      closePicker();
    };
    // Capture phase so Escape closes only the picker, not the parent Modal
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closePicker();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* ---------------- typing ---------------- */

  const handleTextChange = (e) => {
    const masked = maskTyped(e.target.value);
    setText(masked);
    if (!masked) {
      onChange?.('');
      return;
    }
    const iso = displayToIso(masked);
    if (iso) {
      onChange?.(iso);
      const p = parseIso(iso);
      setViewYear(p.y);
      setViewMonth(p.m);
    } else {
      onChange?.(masked); // incomplete/invalid → parent validation blocks submit
    }
  };

  /* ---------------- calendar data ---------------- */

  const dayCells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toIso(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const decadeStart = Math.floor(viewYear / 12) * 12;
  const yearCells = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  const monthDisabled = (y, m) => {
    const first = toIso(y, m, 1);
    const last = toIso(y, m, new Date(y, m + 1, 0).getDate());
    return (maxIso && first > maxIso) || (min && last < min);
  };
  const yearDisabled = (y) => (maxParts && y > maxParts.y) || (minParts && y < minParts.y);

  const canPrev = () => {
    if (view === 'day') return !monthDisabled(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
    if (view === 'month') return !yearDisabled(viewYear - 1);
    return !(minParts && decadeStart - 1 < minParts.y);
  };
  const canNext = () => {
    if (view === 'day') return !monthDisabled(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1);
    if (view === 'month') return !yearDisabled(viewYear + 1);
    return !(maxParts && decadeStart + 12 > maxParts.y);
  };

  const goPrev = () => {
    if (!canPrev()) return;
    if (view === 'day') {
      if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1);
    } else if (view === 'month') setViewYear((y) => y - 1);
    else setViewYear((y) => y - 12);
  };
  const goNext = () => {
    if (!canNext()) return;
    if (view === 'day') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1);
    } else if (view === 'month') setViewYear((y) => y + 1);
    else setViewYear((y) => y + 12);
  };

  const pickDay = (iso) => {
    if (isOutOfRange(iso)) return;
    onChange?.(iso);
    setText(isoToDisplay(iso));
    closePicker();
  };

  const headerLabel =
    view === 'day' ? `${MONTHS_LONG[viewMonth]} ${viewYear}` : view === 'month' ? String(viewYear) : `${decadeStart} – ${decadeStart + 11}`;

  const cycleView = () => setView((v) => (v === 'day' ? 'year' : v === 'year' ? 'day' : 'year'));

  /* ---------------- render ---------------- */

  const navBtn =
    'p-1.5 rounded-lg text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';
  const cellBase = 'flex items-center justify-center text-xs font-medium transition-all cursor-pointer select-none';
  const selectedCls = 'bg-[var(--spatial-primary)] text-white font-bold shadow-sm';
  const idleCls = 'text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]';
  const disabledCls = 'text-[var(--spatial-text-muted)] opacity-30 cursor-not-allowed';

  const panel = isOpen ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Choose date"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.min(PANEL_WIDTH, window.innerWidth - 16) }}
      className="z-[10050] spatial-dropdown-panel p-3 animate-in fade-in zoom-in-95 duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          type="button"
          onClick={cycleView}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer"
          title={view === 'day' ? 'Choose year' : 'Back to days'}
        >
          <span>{headerLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--spatial-text-muted)] transition-transform ${view !== 'day' ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={goPrev} disabled={!canPrev()} className={navBtn} aria-label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={goNext} disabled={!canNext()} className={navBtn} aria-label="Next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day view */}
      {view === 'day' && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-[var(--spatial-text-muted)] py-1 select-none">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dayCells.map((iso, i) => {
              if (!iso) return <div key={`e-${i}`} className="h-8" />;
              const day = Number(iso.slice(8));
              const isSel = iso === value;
              const isToday = iso === today;
              const off = isOutOfRange(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={off}
                  onClick={() => pickDay(iso)}
                  className={`${cellBase} h-8 rounded-full relative ${isSel ? selectedCls : off ? disabledCls : idleCls} ${
                    isToday && !isSel ? 'ring-1 ring-[var(--spatial-primary)] text-[var(--spatial-primary)] font-bold' : ''
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {MONTHS_SHORT.map((label, m) => {
            const off = monthDisabled(viewYear, m);
            const isSel = selected && selected.y === viewYear && selected.m === m;
            return (
              <button
                key={label}
                type="button"
                disabled={off}
                onClick={() => { setViewMonth(m); setView('day'); }}
                className={`${cellBase} h-10 rounded-xl ${isSel ? selectedCls : off ? disabledCls : idleCls}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Year view */}
      {view === 'year' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {yearCells.map((y) => {
            const off = yearDisabled(y);
            const isSel = selected && selected.y === y;
            return (
              <button
                key={y}
                type="button"
                disabled={off}
                onClick={() => { setViewYear(y); setView('month'); }}
                className={`${cellBase} h-10 rounded-xl font-mono ${isSel ? selectedCls : off ? disabledCls : idleCls}`}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--spatial-border)]">
        <button
          type="button"
          onClick={() => { onChange?.(''); setText(''); closePicker(); }}
          className="px-2.5 py-1 text-xs font-medium rounded-lg text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          Clear
        </button>
        <span className="text-[11px] text-[var(--spatial-text-muted)] truncate px-2">
          {view === 'year' ? 'Pick a year' : view === 'month' ? 'Pick a month' : selected ? isoToDisplay(value) : 'Pick a day'}
        </span>
        <button
          type="button"
          onClick={closePicker}
          className="px-3 py-1 text-xs font-semibold rounded-lg text-white bg-[var(--spatial-primary)] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={anchorRef} className={`relative ${className}`}>
      <Icon className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconClassName}`} />
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={handleTextChange}
        onFocus={openPicker}
        onClick={() => !isOpen && openPicker()}
        aria-invalid={invalid || undefined}
        className={`w-full pl-8 pr-16 py-2 spatial-input rounded-xl text-xs font-mono tracking-wide ${
          isOpen ? 'ring-2 ring-[var(--spatial-primary)]/25 border-[var(--spatial-primary)]' : ''
        } ${invalid ? '!border-rose-500/60' : ''}`}
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {text && !disabled && (
          <button
            type="button"
            onClick={() => { onChange?.(''); setText(''); inputRef.current?.focus(); }}
            className="p-1 rounded-md text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer"
            aria-label="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => (isOpen ? closePicker() : openPicker())}
          className={`p-1 rounded-md transition-colors cursor-pointer hover:bg-[var(--spatial-bg-card-hover)] ${
            isOpen ? 'text-[var(--spatial-primary)]' : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
          }`}
          aria-label="Open calendar"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
};

export default SpatialDatePicker;
