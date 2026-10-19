import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Menu,
  Search,
  Plus,
  Sun,
  Moon,
  Laptop,
  Sparkles,
  ChevronDown,
  Check,
  Palette,
} from 'lucide-react';
import { setSearchQuery } from '../../store/jobSlice';
import { useTheme, SPATIAL_STYLES, THEME_MODES } from '../../context/ThemeContext';

export const Topbar = ({ onToggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);
  const [searchInput, setSearchInput] = useState('');
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const styleMenuRef = useRef(null);
  const themeMenuRef = useRef(null);

  const {
    spatialStyle,
    setSpatialStyle,
    themeMode,
    setThemeMode,
    isDark,
  } = useTheme();

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (styleMenuRef.current && !styleMenuRef.current.contains(e.target)) {
        setStyleMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      dispatch(setSearchQuery(searchInput.trim()));
      navigate(`/jobs?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const styleLabels = {
    [SPATIAL_STYLES.DARK_SPATIAL]: { label: 'Dark Spatial', icon: '🌌' },
    [SPATIAL_STYLES.CLEAN_LIGHT]: { label: 'Clean Light', icon: '☀️' },
    [SPATIAL_STYLES.FUTURISTIC_GLASS]: { label: 'Futuristic Glass', icon: '✨' },
  };

  return (
    <header className="h-16 spatial-topbar sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] rounded-xl lg:hidden transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Job #, Customer, Phone, IMEI..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 spatial-input rounded-xl text-xs placeholder:text-[var(--spatial-text-muted)]"
          />
        </form>
      </div>

      {/* Right: Quick Controls, Actions & User Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 1. Spatial Style Selector Dropdown */}
        <div className="relative" ref={styleMenuRef}>
          <button
            type="button"
            onClick={() => setStyleMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-bg-card-hover)] hover:border-[var(--spatial-border-hover)] text-xs font-semibold text-[var(--spatial-text-title)] transition-all active:scale-95 shadow-2xs"
            title="Switch Spatial UI Design Style"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">{styleLabels[spatialStyle]?.label || 'Style'}</span>
            <ChevronDown className="w-3 h-3 text-[var(--spatial-text-muted)]" />
          </button>

          {styleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 spatial-card p-1.5 z-50 shadow-xl border border-[var(--spatial-border)] animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] border-b border-[var(--spatial-border)] mb-1">
                Spatial UI Design Styles
              </div>

              {Object.entries(styleLabels).map(([key, { label, icon }]) => {
                const isSelected = spatialStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSpatialStyle(key);
                      setStyleMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-sky-500/15 text-sky-400 font-bold'
                        : 'text-[var(--spatial-text-body)] hover:bg-[var(--spatial-bg-card-hover)] hover:text-[var(--spatial-text-title)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span>{label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Theme Mode Toggle (Light / Dark / System) */}
        <div className="relative" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setThemeMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl border border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-bg-card-hover)] text-[var(--spatial-text-title)] transition-all active:scale-95 shadow-2xs"
            title={`Current mode: ${themeMode}`}
          >
            {themeMode === THEME_MODES.SYSTEM ? (
              <Laptop className="w-4 h-4 text-sky-400" />
            ) : isDark ? (
              <Moon className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {themeMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 spatial-card p-1.5 z-50 shadow-xl border border-[var(--spatial-border)]">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] border-b border-[var(--spatial-border)] mb-1">
                Color Mode
              </div>

              {[
                { mode: THEME_MODES.LIGHT, label: 'Light Mode', icon: Sun },
                { mode: THEME_MODES.DARK, label: 'Dark Mode', icon: Moon },
                { mode: THEME_MODES.SYSTEM, label: 'System Mode', icon: Laptop },
              ].map(({ mode, label, icon: Icon }) => {
                const isSelected = themeMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setThemeMode(mode);
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-sky-500/15 text-sky-400 font-bold'
                        : 'text-[var(--spatial-text-body)] hover:bg-[var(--spatial-bg-card-hover)] hover:text-[var(--spatial-text-title)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. New Repair Job Button */}
        <button
          onClick={() => navigate('/jobs/new')}
          className="spatial-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Repair Job</span>
          <span className="sm:hidden">New</span>
        </button>

        <div className="h-6 w-px bg-[var(--spatial-border)] mx-1 hidden sm:block" />

        {/* 4. User Info */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-[var(--spatial-text-title)] leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-[var(--spatial-text-muted)] uppercase font-mono tracking-wider">{user?.role_id}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-bold text-xs uppercase shadow-xs">
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};
