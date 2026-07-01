'use client';

import React from 'react';

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
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            {icon}
          </span>
        )}
        <input
          id={id}
          disabled={disabled}
          className={`w-full ${
            icon ? 'pl-10' : 'pl-4'
          } ${
            rightElement ? 'pr-10' : 'pr-4'
          } py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-900 dark:border-zinc-800 transition-all text-zinc-950 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
