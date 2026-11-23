/**
 * @file Input.jsx
 * Unified Form Input component adhering to Prepper AI's universal design system.
 * 44px (h-11) height, rounded-xl, light/dark theme aware with accessible focus states.
 */

import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    id,
    name,
    type = 'text',
    value,
    defaultValue,
    onChange,
    placeholder,
    disabled = false,
    required = false,
    error,
    helperText,
    leftIcon,
    rightIcon,
    className = '',
    containerClassName = '',
    labelClassName = '',
    ...rest
  },
  ref
) {
  const inputId = id || name;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`text-xs sm:text-sm font-bold tracking-tight text-slate-700 dark:text-slate-200 select-none flex items-center justify-between ${labelClassName}`}
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1 font-black">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 text-base shrink-0">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full h-11 rounded-xl text-sm transition-all duration-150 outline-none select-text ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
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

        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-slate-400 dark:text-slate-500 text-base shrink-0">
            {rightIcon}
          </div>
        )}
      </div>

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

export default Input;
