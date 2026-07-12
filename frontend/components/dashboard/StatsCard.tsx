'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  icon: React.ReactNode;
  iconBgClass?: string;
  label: string;
  value: React.ReactNode;
  className?: string;
}

export default function StatsCard({
  icon,
  iconBgClass = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  label,
  value,
  className,
}: StatsCardProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200 select-none",
      className
    )}>
      <div className={cn("p-2.5 rounded-xl shrink-0", iconBgClass)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold truncate">
          {label}
        </p>
        {typeof value === 'string' ? (
          <h3 className="text-xl font-bold tracking-tight mt-0.5 text-zinc-900 dark:text-white truncate" title={value}>
            {value}
          </h3>
        ) : (
          <div className="mt-0.5">
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
