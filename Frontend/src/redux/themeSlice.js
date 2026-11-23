/**
 * @file themeSlice.js
 * Centralized Theme State Management for Prepper AI.
 * Supports 'light' (Warm Yellow/Cream) and 'dark' (Cyber Dark) themes.
 * Persists user preference to localStorage and manages the 'dark' root HTML class.
 */

import { createSlice } from '@reduxjs/toolkit';

const THEME_STORAGE_KEY = 'prepper_theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Respect system preference as initial fallback
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    console.warn('Failed to access localStorage for theme:', e);
  }
  return 'light';
};

const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }
};

const initialTheme = getInitialTheme();
applyThemeToDocument(initialTheme);

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    current: initialTheme,
  },
  reducers: {
    setTheme: (state, action) => {
      const nextTheme = action.payload === 'dark' ? 'dark' : 'light';
      state.current = nextTheme;
      applyThemeToDocument(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (e) {
        console.warn('Failed to persist theme:', e);
      }
    },
    toggleTheme: (state) => {
      const nextTheme = state.current === 'dark' ? 'light' : 'dark';
      state.current = nextTheme;
      applyThemeToDocument(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (e) {
        console.warn('Failed to persist theme:', e);
      }
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
