import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className, children, ...props }, ref) => {
    const baseClasses = 'rounded-xl transition-all duration-200 bg-dark-darker border border-slate-700';
    const variants = {
      default: 'shadow-lg',
      elevated: 'shadow-2xl hover:shadow-3xl hover:-translate-y-1',
      outlined: 'border-2 hover:border-slate-600',
    };
    const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
    return (
      <div ref={ref} className={clsx(baseClasses, variants[variant], paddings[padding], className)} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';