'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string | null;
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div className="flex gap-2.5 p-3.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
      <span className="font-medium leading-5">{message}</span>
    </div>
  );
}
