"use client";

import React from "react";
import { Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenTransactionModal?: () => void;
  action?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  onOpenTransactionModal,
  action,
}: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/70 dark:border-zinc-800 mb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        {action}
        {onOpenTransactionModal && (
          <button
            type="button"
            onClick={onOpenTransactionModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        )}
      </div>
    </header>
  );
}
