'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  icon?: React.ReactNode;
}

export default function Button({
  children,
  isLoading,
  loadingText,
  variant = 'primary',
  icon,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500 shadow-sm hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-200',
    secondary:
      'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 focus-visible:ring-zinc-400 transition-colors',
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm hover:shadow-md hover:shadow-red-600/10 transition-all duration-200',
    outline:
      'border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900 focus-visible:ring-zinc-400 transition-colors',
    ghost:
      'bg-transparent text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-850 focus-visible:ring-zinc-400 transition-colors',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {icon && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
