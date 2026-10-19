import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const STORAGE_KEYS = {
  STYLE: 'mobotech_spatial_style',
  MODE: 'mobotech_theme_mode',
  ANIMATIONS: 'mobotech_animations',
};

export const SPATIAL_STYLES = {
  DARK_SPATIAL: 'dark-spatial',
  CLEAN_LIGHT: 'clean-light',
  FUTURISTIC_GLASS: 'futuristic-glass',
};

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

export const ANIMATION_PREFERENCES = {
  FULL: 'full',
  REDUCED: 'reduced',
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // 1. Spatial Style ('dark-spatial' | 'clean-light' | 'futuristic-glass')
  const [spatialStyle, setSpatialStyleState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STYLE);
      if (saved && Object.values(SPATIAL_STYLES).includes(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return SPATIAL_STYLES.DARK_SPATIAL;
  });

  // 2. Theme Mode ('light' | 'dark' | 'system')
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODE);
      if (saved && Object.values(THEME_MODES).includes(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return THEME_MODES.DARK;
  });

  // 3. Animation Preference ('full' | 'reduced')
  const [animations, setAnimationsState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANIMATIONS);
      if (saved && Object.values(ANIMATION_PREFERENCES).includes(saved)) {
        return saved;
      }
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return ANIMATION_PREFERENCES.REDUCED;
      }
    } catch {
      // fallback
    }
    return ANIMATION_PREFERENCES.FULL;
  });

  // System OS theme listener state
  const [systemIsDark, setSystemIsDark] = useState(() => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Listen to OS theme changes when themeMode is 'system'
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Compute effective theme ('dark' or 'light')
  const effectiveTheme = useMemo(() => {
    if (themeMode === THEME_MODES.SYSTEM) {
      return systemIsDark ? 'dark' : 'light';
    }
    return themeMode === THEME_MODES.LIGHT ? 'light' : 'dark';
  }, [themeMode, systemIsDark]);

  // Synchronize attributes to documentElement
  useEffect(() => {
    const root = document.documentElement;

    // Apply spatial style
    root.setAttribute('data-spatial-style', spatialStyle);

    // Apply effective theme
    root.setAttribute('data-theme', effectiveTheme);

    // Synchronize Tailwind 'dark' class
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Apply animations preference
    root.setAttribute('data-animations', animations);
  }, [spatialStyle, effectiveTheme, animations]);

  // Setters with persistent storage
  const setSpatialStyle = useCallback((newStyle) => {
    if (Object.values(SPATIAL_STYLES).includes(newStyle)) {
      setSpatialStyleState(newStyle);
      try {
        localStorage.setItem(STORAGE_KEYS.STYLE, newStyle);
      } catch (e) {
        console.error('Failed to save spatial style preference:', e);
      }
    }
  }, []);

  const setThemeMode = useCallback((newMode) => {
    if (Object.values(THEME_MODES).includes(newMode)) {
      setThemeModeState(newMode);
      try {
        localStorage.setItem(STORAGE_KEYS.MODE, newMode);
      } catch (e) {
        console.error('Failed to save theme mode preference:', e);
      }
    }
  }, []);

  const setAnimations = useCallback((newPref) => {
    if (Object.values(ANIMATION_PREFERENCES).includes(newPref)) {
      setAnimationsState(newPref);
      try {
        localStorage.setItem(STORAGE_KEYS.ANIMATIONS, newPref);
      } catch (e) {
        console.error('Failed to save animations preference:', e);
      }
    }
  }, []);

  // Reset to default
  const resetDefaults = useCallback(() => {
    setSpatialStyle(SPATIAL_STYLES.DARK_SPATIAL);
    setThemeMode(THEME_MODES.DARK);
    setAnimations(ANIMATION_PREFERENCES.FULL);
  }, [setSpatialStyle, setThemeMode, setAnimations]);

  const value = useMemo(
    () => ({
      spatialStyle,
      setSpatialStyle,
      themeMode,
      setThemeMode,
      effectiveTheme,
      animations,
      setAnimations,
      resetDefaults,
      isDark: effectiveTheme === 'dark',
    }),
    [spatialStyle, setSpatialStyle, themeMode, setThemeMode, effectiveTheme, animations, setAnimations, resetDefaults]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
