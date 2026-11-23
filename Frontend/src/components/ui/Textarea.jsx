/**
 * @file Textarea.jsx
 * Unified Form Textarea component adhering to Prepper AI's universal design system.
 * Rounded-xl, light/dark theme aware with consistent focus ring.
 */

import React, { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  {
    label,
    id,
    name,
    value,
    defaultValue,
    onChange,
    placeholder,
    rows = 4,
    disabled = false,
    required = false,
    error,
    helperText,
    className = '',
    containerClassName = '',
    labelClassName = '',
    ...rest
  },
  ref
) {
  const textareaId = id || name;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className={`text-xs sm:text-sm font-bold tracking-tight text-slate-700 dark:text-slate-200 select-none flex items-center justify-between ${labelClassName}`}
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1 font-black">*</span>}
          </span>
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`w-full rounded-xl p-3.5 text-sm transition-all duration-150 outline-none select-text custom-scrollbar resize-y ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 text-slate-400'
            : 'bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
        } ${
          error
            ? 'border-2 border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-400/40'
            : 'border border-slate-200 dark:border-slate-800 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50'
        } placeholder:text-slate-400 dark:placeholder:text-slate-500 ${className}`}
        {...rest}
      />

      {error ? (
        <p className="text-xs font-semibold text-red-500 mt-0.5 animate-fadeIn">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Textarea;
