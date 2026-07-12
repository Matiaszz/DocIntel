'use client';

import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 animate-pulse select-none">
      {/* Navigation Header Skeleton */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/30 dark:border-zinc-800/30 w-28 h-8">
              <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section Skeleton */}
        <div className="h-40 bg-zinc-250 dark:bg-zinc-900 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-5 w-40 bg-zinc-300 dark:bg-zinc-850 rounded-full animate-pulse" />
            <div className="h-4 w-64 bg-zinc-300 dark:bg-zinc-850 rounded-md animate-pulse" />
            <div className="h-3.5 w-5/6 bg-zinc-300 dark:bg-zinc-850 rounded-md hidden md:block animate-pulse" />
            <div className="h-3.5 w-2/3 bg-zinc-300 dark:bg-zinc-850 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Dashboard Modules Selector Skeleton */}
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-4.5 w-60 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-56 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                  <div className="space-y-2">
                    <div className="h-4.5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3.5 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
