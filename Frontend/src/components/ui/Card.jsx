/**
 * @file Card.jsx
 * Unified Card component adhering to Prepper AI's universal design tokens.
 * Consistent across light (warm cream / crisp card) and dark (cyber slate).
 */

import React from 'react';
import { motion } from 'framer-motion';

const VARIANT_STYLES = {
  default:
    'bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm',
  elevated:
    'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg dark:shadow-2xl dark:shadow-black/40',
  interactive:
    'bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-yellow-400/70 dark:hover:border-yellow-400/50 hover:shadow-md cursor-pointer transition-all duration-200',
  warm:
    'bg-[#fefdfa] dark:bg-slate-900/95 border border-amber-200/60 dark:border-slate-800 shadow-sm',
  subtle:
    'bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-850',
};

const PADDING_STYLES = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  isMotion = false,
  ...rest
}) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const paddingClass = PADDING_STYLES[padding] || PADDING_STYLES.md;
  const baseClasses = `rounded-2xl transition-colors ${variantClass} ${paddingClass} ${className}`;

  if (isMotion || onClick) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={onClick ? { y: -2 } : {}}
        whileTap={onClick ? { scale: 0.99 } : {}}
        className={baseClasses}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick} {...rest}>
      {children}
    </div>
  );
}
