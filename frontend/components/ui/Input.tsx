'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export default function Input({
  label,
  id,
  icon,
  rightElement,
  className = '',
  disabled,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1.5 w-full text-left">
      <label
        htmlFor={id}
        className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-zinc-400 dark:text-zinc-500 pointer-events-none select-none flex items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        )}
        <input
          id={id}
          disabled={disabled}
          className={cn(
            'w-full py-2.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500/80 transition-all text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed',
            icon ? 'pl-9' : 'pl-3.5',
            rightElement ? 'pr-9' : 'pr-3.5',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
