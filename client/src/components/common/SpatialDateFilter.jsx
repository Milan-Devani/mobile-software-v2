import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';

// Format Date object to local YYYY-MM-DD string
export const formatLocalDate = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Friendly readable format for display (e.g. "Oct 31, 2026")
export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Short format for triggers (e.g. "Oct 31")
export const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const DATE_PRESETS = [
  { key: 'ALL', label: 'All Dates', description: 'Show all historical jobs' },
  { key: 'TODAY', label: 'Today', description: 'Current day jobs' },
  { key: 'YESTERDAY', label: 'Yesterday', description: 'Previous day jobs' },
  { key: 'LAST_7_DAYS', label: 'Last 7 Days', description: 'Past 7 days up to today' },
  { key: 'THIS_MONTH', label: 'This Month', description: 'From 1st to today' },
  { key: 'LAST_MONTH', label: 'Last Month', description: 'Previous full month' },
  { key: 'LAST_3_MONTHS', label: 'Last 3 Months', description: 'Past 90 days' },
  { key: 'LAST_6_MONTHS', label: 'Last 6 Months', description: 'Past 180 days' },
  { key: 'LAST_1_YEAR', label: 'Last 1 Year', description: 'Past 365 days' },
  { key: 'CUSTOM', label: 'Custom Range', description: 'Pick specific date range' },
];

export const getPresetDates = (presetKey) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (presetKey) {
    case 'TODAY': {
      const d = formatLocalDate(today);
      return { startDate: d, endDate: d };
    }
    case 'YESTERDAY': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const d = formatLocalDate(y);
      return { startDate: d, endDate: d };
    }
    case 'LAST_7_DAYS': {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      return { startDate: formatLocalDate(d7), endDate: formatLocalDate(today) };
    }
    case 'THIS_MONTH': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
    }
    case 'LAST_MONTH': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
    }
    case 'LAST_3_MONTHS': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);
      return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
    }
    case 'LAST_6_MONTHS': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
    }
    case 'LAST_1_YEAR': {
      const start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
    }
    default:
      return { startDate: '', endDate: '' };
  }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const SpatialDateFilter = ({
  preset = 'ALL',
  startDate = '',
  endDate = '',
  onChange,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Active view month & year in calendar
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() ?? new Date().getMonth());

  // Local draft state while popup is open
  const [tempPreset, setTempPreset] = useState(preset);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [hoverDate, setHoverDate] = useState(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Mobile tab switch ('presets' | 'calendar')
  const [mobileTab, setMobileTab] = useState('presets');

  // Synchronize when external props change
  useEffect(() => {
    setTempPreset(preset);
    setTempStart(startDate);
    setTempEnd(endDate);
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [preset, startDate, endDate]);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsSelectingRange(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsSelectingRange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      // Elevate parent card to z-index 100 with relative positioning to escape any sibling stacking contexts
      const parentCard = containerRef.current?.closest('.spatial-card');
      let prevZ = '';
      let prevPos = '';
      if (parentCard) {
        prevZ = parentCard.style.zIndex;
        prevPos = parentCard.style.position;
        parentCard.style.zIndex = '100';
        if (!prevPos || prevPos === 'static') {
          parentCard.style.position = 'relative';
        }
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        if (parentCard) {
          parentCard.style.zIndex = prevZ;
          if (!prevPos || prevPos === 'static') {
            parentCard.style.position = prevPos;
          }
        }
      };
    }
  }, [isOpen]);

  // Calculate calendar grid days for current viewMonth & viewYear
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      days.push({
        dateStr: formatLocalDate(prevDate),
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(viewYear, viewMonth, i);
      days.push({
        dateStr: formatLocalDate(currDate),
        dayNumber: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete row (or full 35/42 grid)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(viewYear, viewMonth + 1, i);
      days.push({
        dateStr: formatLocalDate(nextDate),
        dayNumber: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Today's date string
  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  // Preset Selection Click
  const handleSelectPreset = (key) => {
    if (key === 'ALL') {
      setTempPreset('ALL');
      setTempStart('');
      setTempEnd('');
      setIsSelectingRange(false);
      onChange?.({ preset: 'ALL', startDate: '', endDate: '' });
      setIsOpen(false);
      return;
    }

    if (key === 'CUSTOM') {
      setTempPreset('CUSTOM');
      setMobileTab('calendar');
      return;
    }

    const dates = getPresetDates(key);
    setTempPreset(key);
    setTempStart(dates.startDate);
    setTempEnd(dates.endDate);
    setIsSelectingRange(false);

    // If start date exists, navigate calendar to that month
    if (dates.startDate) {
      const d = new Date(dates.startDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }

    // Apply immediately for fast one-tap UX
    onChange?.({ preset: key, startDate: dates.startDate, endDate: dates.endDate });
    setIsOpen(false);
  };

  // Calendar Day Click Handler
  const handleDayClick = (dateStr) => {
    setTempPreset('CUSTOM');

    if (!isSelectingRange || !tempStart || (tempStart && tempEnd)) {
      // First click: sets start date
      setTempStart(dateStr);
      setTempEnd('');
      setIsSelectingRange(true);
    } else {
      // Second click: completes range
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
      setIsSelectingRange(false);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Apply Custom Selection
  const handleApplyCustom = () => {
    const finalStart = tempStart || todayStr;
    const finalEnd = tempEnd || finalStart;

    let s = finalStart;
    let e = finalEnd;
    if (s > e) {
      const swap = s;
      s = e;
      e = swap;
    }

    onChange?.({
      preset: 'CUSTOM',
      startDate: s,
      endDate: e,
    });
    setIsOpen(false);
    setIsSelectingRange(false);
  };

  // Clear Filter
  const handleClear = (e) => {
    e?.stopPropagation();
    setTempPreset('ALL');
    setTempStart('');
    setTempEnd('');
    setIsSelectingRange(false);
    onChange?.({ preset: 'ALL', startDate: '', endDate: '' });
    setIsOpen(false);
  };

  // Computed label for Trigger Button
  const triggerLabel = useMemo(() => {
    if (preset === 'ALL' || (!startDate && !endDate)) {
      return 'All Dates';
    }

    const matched = DATE_PRESETS.find((p) => p.key === preset);
    if (matched && matched.key !== 'CUSTOM') {
      return matched.label;
    }

    // Custom date formatting
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatDisplayDate(startDate);
      }
      return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
    }
    if (startDate) {
      return `From ${formatShortDate(startDate)}`;
    }
    if (endDate) {
      return `Until ${formatShortDate(endDate)}`;
    }

    return 'Date Filter';
  }, [preset, startDate, endDate]);

  const isFilterActive = preset !== 'ALL' && (Boolean(startDate) || Boolean(endDate));

  // Determine current active range for calendar rendering
  const activeStart = tempStart;
  const activeEnd = tempEnd || (isSelectingRange && hoverDate ? hoverDate : tempStart);
  const normalizedStart = activeStart && activeEnd && activeStart > activeEnd ? activeEnd : activeStart;
  const normalizedEnd = activeStart && activeEnd && activeStart > activeEnd ? activeStart : activeEnd;

  return (
    <div className={`relative inline-block text-left ${isOpen ? 'z-[100]' : 'z-auto'} ${className}`} ref={containerRef}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer select-none ${
          isFilterActive
            ? 'border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:text-[#0a84ff] dark:border-[#0a84ff]/50 dark:bg-[#0a84ff]/15 shadow-xs ring-1 ring-[#0071e3]/30'
            : isOpen
            ? 'border-[#0071e3] dark:border-[#0a84ff] bg-[var(--spatial-bg-card)] text-[var(--spatial-text-title)] ring-2 ring-[#0071e3]/20 shadow-xs'
            : 'spatial-input text-[var(--spatial-text-title)] hover:border-[var(--spatial-border-hover)]'
        }`}
        title="Filter by date range"
      >
        <CalendarIcon
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isFilterActive ? 'text-[#0071e3] dark:text-[#0a84ff]' : 'text-[var(--spatial-text-muted)]'
          }`}
        />

        <span className="truncate max-w-[150px] sm:max-w-[200px] font-medium tracking-tight">
          {triggerLabel}
        </span>

        {/* Clear 'X' button when filter is active */}
        {isFilterActive ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-[#0071e3]/20 dark:hover:bg-[#0a84ff]/25 text-[#0071e3] dark:text-[#0a84ff] transition-colors"
            title="Clear date filter"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--spatial-text-muted)] shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#0071e3] dark:text-[#0a84ff]' : ''
            }`}
          />
        )}
      </button>

      {/* DROPDOWN & CALENDAR POPOVER */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 z-[9999] p-0 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10 dark:ring-white/10 data-[theme=light]:ring-black/10 rounded-2xl border border-[var(--spatial-border)] bg-[#18181b] dark:bg-[#18181b] data-[theme=light]:bg-white animate-in fade-in zoom-in-95 duration-150 w-[320px] sm:w-[580px] max-w-[94vw]`}
        >
          {/* Header on Mobile: Switch between Presets and Calendar */}
          <div className="flex sm:hidden border-b border-[var(--spatial-border)] bg-[#121214] dark:bg-[#121214] data-[theme=light]:bg-[#f5f5f7] p-1 gap-1">
            <button
              type="button"
              onClick={() => setMobileTab('presets')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mobileTab === 'presets'
                  ? 'bg-[#27272a] dark:bg-[#27272a] data-[theme=light]:bg-white text-[#0071e3] dark:text-[#0a84ff] shadow-xs'
                  : 'text-[var(--spatial-text-muted)]'
              }`}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('calendar')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mobileTab === 'calendar'
                  ? 'bg-[#27272a] dark:bg-[#27272a] data-[theme=light]:bg-white text-[#0071e3] dark:text-[#0a84ff] shadow-xs'
                  : 'text-[var(--spatial-text-muted)]'
              }`}
            >
              Custom Calendar
            </button>
          </div>

          <div className="flex flex-col sm:flex-row">
            {/* LEFT COLUMN: PRESETS LIST */}
            <div
              className={`w-full sm:w-48 shrink-0 p-2 sm:border-r border-[var(--spatial-border)] bg-[#121214] dark:bg-[#121214] data-[theme=light]:bg-[#f5f5f7] ${
                mobileTab === 'calendar' ? 'hidden sm:block' : 'block'
              }`}
            >
              <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[var(--spatial-text-muted)] flex items-center justify-between">
                <span>Date Range</span>
                <Sparkles className="w-3 h-3 text-[#0071e3]/60 dark:text-[#0a84ff]/60" />
              </div>

              <div className="space-y-0.5 mt-0.5">
                {DATE_PRESETS.map((p) => {
                  const isActive = tempPreset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectPreset(p.key)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left group cursor-pointer ${
                        isActive
                          ? 'bg-[#0071e3] text-white shadow-xs font-semibold'
                          : 'text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
                      }`}
                    >
                      <span className="truncate">{p.label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: INTERACTIVE APPLE CALENDAR */}
            <div
              className={`flex-1 p-3 sm:p-4 flex flex-col justify-between bg-[#18181b] dark:bg-[#18181b] data-[theme=light]:bg-white ${
                mobileTab === 'presets' ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <div>
                {/* CALENDAR HEADER (Month & Year + Nav) */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    {/* Month Select */}
                    <select
                      value={viewMonth}
                      onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                      className="px-2 py-1 text-xs font-semibold rounded-lg bg-[#27272a] dark:bg-[#27272a] data-[theme=light]:bg-[#f5f5f7] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] focus:outline-none focus:border-[#0071e3] cursor-pointer"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>

                    {/* Year Select */}
                    <select
                      value={viewYear}
                      onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                      className="px-2 py-1 text-xs font-semibold rounded-lg bg-[#27272a] dark:bg-[#27272a] data-[theme=light]:bg-[#f5f5f7] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] focus:outline-none focus:border-[#0071e3] cursor-pointer"
                    >
                      {Array.from({ length: 15 }, (_, i) => 2020 + i).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="px-2 py-1 text-[11px] font-medium rounded-lg text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[#27272a] dark:hover:bg-[#27272a] data-[theme=light]:hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Jump to current month"
                    >
                      Today
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer"
                      title="Next month"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>

                {/* WEEKDAY LABELS */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {WEEKDAY_NAMES.map((d) => (
                    <div
                      key={d}
                      className="text-[11px] font-semibold text-[var(--spatial-text-muted)] py-1 select-none"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* DAY CELLS GRID */}
                <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
                  {calendarDays.map((cell, idx) => {
                    const isToday = cell.dateStr === todayStr;
                    const isStart = cell.dateStr === normalizedStart;
                    const isEnd = cell.dateStr === normalizedEnd;
                    const isInRange =
                      normalizedStart &&
                      normalizedEnd &&
                      cell.dateStr > normalizedStart &&
                      cell.dateStr < normalizedEnd;

                    const isSingleSelected = isStart && isEnd;

                    return (
                      <div
                        key={`${cell.dateStr}-${idx}`}
                        className={`relative py-0.5 ${
                          isInRange ? 'bg-[#0071e3]/15 dark:bg-[#0a84ff]/20' : ''
                        } ${
                          isStart && normalizedEnd && !isSingleSelected
                            ? 'rounded-l-full bg-[#0071e3]/15 dark:bg-[#0a84ff]/20'
                            : ''
                        } ${
                          isEnd && normalizedStart && !isSingleSelected
                            ? 'rounded-r-full bg-[#0071e3]/15 dark:bg-[#0a84ff]/20'
                            : ''
                        }`}
                        onMouseEnter={() => {
                          if (isSelectingRange) {
                            setHoverDate(cell.dateStr);
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleDayClick(cell.dateStr)}
                          className={`w-7 h-7 mx-auto flex items-center justify-center text-xs font-medium rounded-full transition-all cursor-pointer select-none relative ${
                            isStart || isEnd
                              ? 'bg-[#0071e3] text-white font-bold shadow-xs scale-105 z-10'
                              : isInRange
                              ? 'text-[#0071e3] dark:text-[#0a84ff] font-semibold hover:bg-[#0071e3]/25'
                              : cell.isCurrentMonth
                              ? 'text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]'
                              : 'text-[var(--spatial-text-muted)] opacity-35 hover:opacity-80'
                          } ${
                            isToday && !isStart && !isEnd
                              ? 'ring-1 ring-[#0071e3] dark:ring-[#0a84ff] font-bold'
                              : ''
                          }`}
                        >
                          {cell.dayNumber}
                          {isToday && !isStart && !isEnd && (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#0071e3] dark:bg-[#0a84ff]" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FOOTER & SELECTION SUMMARY */}
              <div className="mt-4 pt-3 border-t border-[var(--spatial-border)] space-y-2.5">
                {/* Range summary preview */}
                <div className="flex items-center justify-between text-xs text-[var(--spatial-text-muted)] bg-[#121214] dark:bg-[#121214] data-[theme=light]:bg-[#f5f5f7] px-2.5 py-1.5 rounded-lg border border-[var(--spatial-border)] font-mono">
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] mr-1">
                      Start:
                    </span>
                    <span className="text-[var(--spatial-text-title)] font-medium">
                      {tempStart ? formatDisplayDate(tempStart) : 'Select date'}
                    </span>
                  </div>
                  <span className="text-[var(--spatial-border)] px-1">→</span>
                  <div className="truncate text-right">
                    <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] mr-1">
                      End:
                    </span>
                    <span className="text-[var(--spatial-text-title)] font-medium">
                      {tempEnd ? formatDisplayDate(tempEnd) : isSelectingRange ? 'Click date' : tempStart ? formatDisplayDate(tempStart) : 'Select date'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--spatial-text-muted)] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsSelectingRange(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-lg hover:bg-[var(--spatial-bg-card-hover)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCustom}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
