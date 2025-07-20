import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className, ...props }, ref) => {
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">{icon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-lg border transition-colors duration-200 bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
              icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3',
              error ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : 'border-slate-600 focus:border-primary-500 focus:ring-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
        </div>
        {(error || helperText) && (
          <div className="mt-2 text-sm">
            {error ? <span className="text-error-500 flex items-center gap-1"><span>⚠️</span>{error}</span> : <span className="text-slate-400">{helperText}</span>}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';