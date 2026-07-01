'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
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
  let variantClasses = 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20';
  
  if (variant === 'secondary') {
    variantClasses = 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 focus:ring-zinc-500';
  } else if (variant === 'danger') {
    variantClasses = 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-lg shadow-red-600/10 hover:shadow-red-600/20';
  }

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`w-full flex items-center justify-center gap-2 py-3 font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {icon}
        </>
      )}
    </button>
  );
}
