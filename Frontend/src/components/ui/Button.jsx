/**
 * @file Button.jsx
 * Unified Button component adhering to Prepper AI's design tokens.
 * Consistent across light and dark themes with full keyboard accessibility.
 */

import React from 'react';
import { motion } from 'framer-motion';

const VARIANT_STYLES = {
  primary:
    'bg-[#F7D63A] hover:bg-[#ffe04d] text-slate-950 font-black shadow-sm border border-yellow-400/80 active:bg-yellow-500 focus:ring-yellow-400/60',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold focus:ring-slate-400/50',
  outline:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold focus:ring-yellow-400/50',
  ghost:
    'bg-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-transparent focus:ring-yellow-400/40',
  danger:
    'bg-red-500 hover:bg-red-600 text-white font-bold border border-red-600/80 shadow-xs focus:ring-red-400/50',
  dark:
    'bg-slate-900 hover:bg-slate-850 text-white font-black border border-slate-800 shadow-md focus:ring-yellow-400/50',
};

const SIZE_STYLES = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 min-h-[34px]',
  md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2 min-h-[42px]',
  lg: 'px-6 py-3.5 text-sm sm:text-base rounded-2xl gap-2.5 min-h-[50px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon = null,
  rightIcon = null,
  onClick,
  className = '',
  fullWidth = false,
  ...rest
}) {
  const isDisabled = disabled || loading;
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <motion.button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      whileHover={isDisabled ? {} : { y: -1, scale: 1.01 }}
      whileTap={isDisabled ? {} : { y: 1, scale: 0.98 }}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center transition-all select-none cursor-pointer focus:outline-none focus:ring-2 ${
        fullWidth ? 'w-full' : ''
      } ${sizeClass} ${variantClass} ${
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        icon && <span className="text-base shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="text-base shrink-0">{rightIcon}</span>}
    </motion.button>
  );
}
