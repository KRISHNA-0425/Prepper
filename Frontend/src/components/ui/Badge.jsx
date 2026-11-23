/**
 * @file Badge.jsx
 * Unified Status and Category Badge adhering to Prepper AI's design tokens.
 */

import React from 'react';

const VARIANT_STYLES = {
  primary:
    'bg-yellow-100 text-yellow-900 border border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30',
  success:
    'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  warning:
    'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  error:
    'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  info:
    'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  neutral:
    'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  dark:
    'bg-slate-900 text-slate-100 border border-slate-700 dark:bg-slate-800 dark:text-white',
};

const SIZE_STYLES = {
  xs: 'px-2 py-0.5 text-[10px] rounded-md gap-1',
  sm: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
  md: 'px-3 py-1.5 text-xs sm:text-sm rounded-xl gap-2',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  icon = null,
  className = '',
  ...rest
}) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight select-none transition-colors ${sizeClass} ${variantClass} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
