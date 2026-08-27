import React from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300">
            {icon}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {value}
        </div>
        {subValue && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}
