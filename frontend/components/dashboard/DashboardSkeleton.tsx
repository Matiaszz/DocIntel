'use client';

import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 animate-pulse">
      {/* Navigation Header Skeleton */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 w-32 h-9 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800" />
          </div>
        </div>
      </header>

      {/* Main Content Area Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section Skeleton */}
        <div className="h-44 bg-zinc-200 dark:bg-zinc-900 rounded-3xl p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-5 w-40 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
            <div className="h-8 w-64 bg-zinc-300 dark:bg-zinc-800 rounded-md" />
            <div className="h-4 w-5/6 bg-zinc-300 dark:bg-zinc-800 rounded-md hidden md:block" />
            <div className="h-4 w-2/3 bg-zinc-300 dark:bg-zinc-800 rounded-md" />
          </div>
        </div>

        {/* Dashboard Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm"
            >
              <div className="p-3 w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Workspace Operations & Upload Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Upload Area Skeleton */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 h-44">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>

          {/* User Info details Skeleton */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 last:border-0 last:pb-0">
                  <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                  <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
