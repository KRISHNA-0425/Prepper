/**
 * @file ThemeToggle.jsx
 * Accessible, animated theme toggle button for switching between
 * Light (Warm Yellow/Cream) and Dark (Cyber Dark) themes.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { RiSunLine, RiMoonLine } from 'react-icons/ri';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      className={`relative inline-flex items-center gap-2 p-2 rounded-full transition-colors border cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-yellow-400/50 ${
        isDark
          ? 'bg-slate-900/90 text-yellow-400 border-slate-700/80 hover:bg-slate-800 shadow-md'
          : 'bg-white/80 text-amber-700 border-amber-200/70 hover:bg-white shadow-xs'
      } ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode (currently ${theme})`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-5 h-5 flex items-center justify-center text-base"
      >
        {isDark ? <RiMoonLine /> : <RiSunLine />}
      </motion.div>

      {showLabel && (
        <span className="text-xs font-black uppercase tracking-wider pr-1">
          {isDark ? 'Cyber Dark' : 'Warm Light'}
        </span>
      )}
    </motion.button>
  );
}
