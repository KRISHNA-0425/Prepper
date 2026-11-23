/**
 * @file PageHeader.jsx
 * Unified PageHeader component adhering to Prepper AI's universal design tokens.
 * Consistent across all module setups, reports, history, and dashboards.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import Badge from './Badge';

export default function PageHeader({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'primary',
  backUrl,
  onBack,
  actions,
  className = '',
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  const showBackButton = Boolean(backUrl || onBack);

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800/80 mb-6 sm:mb-8 ${className}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {showBackButton && (
          <button
            type="button"
            onClick={handleBack}
            className="mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-yellow-400 transition-colors cursor-pointer select-none shrink-0"
            aria-label="Go back"
          >
            <RiArrowLeftLine className="text-lg" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h1>
            {badgeText && (
              <Badge variant={badgeVariant} size="sm">
                {badgeText}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-3 flex-wrap self-start md:self-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
