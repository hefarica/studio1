import React from 'react';
import { clsx } from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', variant = 'spinner', text, className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };

  const renderSpinner = () => <div className={clsx(sizes[size], 'border-2 border-current border-t-transparent rounded-full animate-spin')} />;
  const renderDots = () => (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => <div key={i} className={clsx('rounded-full bg-current animate-pulse', size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3')} style={{ animationDelay: `${i * 0.2}s` }} />)}
    </div>
  );
  const renderPulse = () => <div className={clsx(sizes[size], 'bg-current rounded-lg animate-pulse opacity-75')} />;

  const getVariantComponent = () => {
    switch (variant) {
      case 'dots': return renderDots();
      case 'pulse': return renderPulse();
      default: return renderSpinner();
    }
  };

  return (
    <div className={clsx('flex items-center gap-3 text-slate-400', className)}>
      {getVariantComponent()}
      {text && <span className={clsx('font-medium', textSizes[size])}>{text}</span>}
    </div>
  );
};