import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'info' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, children, className, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0';
    const variants = {
      primary: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-emerald-500/25 focus:ring-emerald-500',
      secondary: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-amber-500/25 focus:ring-amber-500',
      danger: 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white shadow-rose-500/25 focus:ring-rose-500',
      info: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-500/25 focus:ring-blue-500',
      success: 'bg-gradient-to-r from-success-600 to-success-500 hover:from-success-700 hover:to-success-600 text-white shadow-success-500/25 focus:ring-success-500',
      outline: 'border-2 border-slate-600 bg-transparent hover:border-slate-500 hover:bg-slate-800/50 text-slate-200 hover:text-white focus:ring-slate-500',
    };
    const sizes = { sm: 'px-3 py-1.5 text-sm min-w-[80px]', md: 'px-4 py-2 text-base min-w-[120px]', lg: 'px-6 py-3 text-lg min-w-[140px]' };
    return (
      <button ref={ref} disabled={disabled || loading} className={clsx(baseClasses, variants[variant], sizes[size], className)} {...props}>
        {loading ? (
          <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Cargando...</>
        ) : (
          <>{icon && <span className="text-lg">{icon}</span>}{children}</>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';