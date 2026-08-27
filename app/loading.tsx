import React from "react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="space-y-2">
          <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-3.5 w-64 bg-zinc-100 dark:bg-zinc-850 rounded-md" />
        </div>
        <div className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-6 w-6 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="h-7 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-3 w-36 bg-zinc-100 dark:bg-zinc-850 rounded" />
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
        <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-zinc-50 dark:bg-zinc-850 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
