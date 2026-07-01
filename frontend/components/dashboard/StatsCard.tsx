'use client';

import React from 'react';

interface StatsCardProps {
  icon: React.ReactNode;
  iconBgClass?: string;
  label: string;
  value: React.ReactNode;
}

export default function StatsCard({
  icon,
  iconBgClass = 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
  label,
  value,
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all hover:shadow-md">
      <div className={`p-3 rounded-xl ${iconBgClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold truncate">
          {label}
        </p>
        {typeof value === 'string' ? (
          <h3 className="text-2xl font-bold mt-1 truncate" title={value}>
            {value}
          </h3>
        ) : (
          <div className="mt-1">
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
