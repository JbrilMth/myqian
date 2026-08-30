"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { fetchMonthlyReviewAction } from "@/actions/analysis";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonthlyReviewData } from "@/lib/finance/analysis";

interface MonthlyReviewClientProps {
  initialData: MonthlyReviewData;
}

export function MonthlyReviewClient({ initialData }: MonthlyReviewClientProps) {
  const [data, setData] = useState<MonthlyReviewData>(initialData);
  const [expandedCategories, setExpandedCategories] = useState<{ [id: string]: boolean }>({});
  const [isPending, startTransition] = useTransition();

  const handleMonthChange = (ym: string) => {
    startTransition(async () => {
      const res = await fetchMonthlyReviewAction(ym);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Format Month Title
  const [year, month] = data.yearMonth.split("-").map(Number);
  const monthDate = new Date(year, month - 1, 1);
  const monthTitle = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  const currentIdx = data.availableMonths.indexOf(data.yearMonth);
  const hasPrev = currentIdx < data.availableMonths.length - 1;
  const hasNext = currentIdx > 0;

  const prevMonthStr = hasPrev ? data.availableMonths[currentIdx + 1] : null;
  const nextMonthStr = hasNext ? data.availableMonths[currentIdx - 1] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Monthly Financial Review
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                In-depth financial review, spending distribution, and month-over-month performance.
              </p>
            </div>
          </div>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-1 rounded-xl shadow-2xs">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => prevMonthStr && handleMonthChange(prevMonthStr)}
            className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={data.yearMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-2 py-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-hidden cursor-pointer"
          >
            {data.availableMonths.map((ym) => {
              const [y, m] = ym.split("-").map(Number);
              const label = new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
              return (
                <option key={ym} value={ym} className="dark:bg-zinc-900">
                  {label}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => nextMonthStr && handleMonthChange(nextMonthStr)}
            className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. MONTH SUMMARY CARDS (BY CURRENCY) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            {monthTitle} • Financial Overview
          </h2>
          {isPending && <span className="text-[11px] text-zinc-400 animate-pulse">Loading review...</span>}
        </div>

        {Object.keys(data.summaryByCurrency).length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            No transactions recorded for {monthTitle}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(data.summaryByCurrency).map((s) => {
              const netNum = Number(s.net);
              return (
                <div
                  key={s.currency}
                  className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {s.currency} Performance
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {s.txCount} transactions
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span>Income</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 truncate">
                        +{formatCurrency(s.income, s.currency)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span>Expenses</span>
                      </div>
                      <div className="text-xs font-bold text-red-600 dark:text-red-400 font-mono mt-0.5 truncate">
                        -{formatCurrency(s.expenses, s.currency)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                        <Scale className="w-3 h-3 text-zinc-500" />
                        <span>Net</span>
                      </div>
                      <div
                        className={cn(
                          "text-xs font-bold font-mono mt-0.5 truncate",
                          netNum >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {netNum > 0 ? "+" : ""}
                        {formatCurrency(s.net, s.currency)}
                      </div>
                    </div>
                  </div>

                  {s.savingsRate > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
                      <span>Savings Rate:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {s.savingsRate}% of income saved
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SPENDING BY CATEGORY BREAKDOWN */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Spending by Category
            </h3>
            <span className="text-[11px] text-zinc-400">Expense breakdown by taxonomy</span>
          </div>
          <span className="text-xs text-zinc-400">
            {data.categoryBreakdown.length} {data.categoryBreakdown.length === 1 ? "category" : "categories"}
          </span>
        </div>

        {data.categoryBreakdown.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            No categorized expenses recorded in {monthTitle}.
          </p>
        ) : (
          <div className="space-y-3">
            {data.categoryBreakdown.map((cat) => {
              const isExpanded = !!expandedCategories[cat.parentId];
              return (
                <div
                  key={cat.parentId}
                  className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2.5"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => cat.children.length > 0 && toggleCategory(cat.parentId)}
                  >
                    <div className="flex items-center gap-2">
                      {cat.children.length > 0 && (
                        <ChevronDown
                          className={cn(
                            "w-3.5 h-3.5 text-zinc-400 transition-transform",
                            isExpanded ? "rotate-180" : ""
                          )}
                        />
                      )}
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {cat.parentName}
                      </span>
                      <span className="text-[11px] text-zinc-400">({cat.percentage}%)</span>
                    </div>

                    <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(cat.amount, cat.currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                    />
                  </div>

                  {/* Subcategories (Expanded) */}
                  {isExpanded && cat.children.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-1.5 pl-4">
                      {cat.children.map((sub) => (
                        <div
                          key={sub.childId}
                          className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400"
                        >
                          <span>↳ {sub.childName} ({sub.percentage}%)</span>
                          <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(sub.amount, cat.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MONTH-OVER-MONTH COMPARISON */}
      <div className="p-5 sm:p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Compared with Previous Month
          </h3>
          <span className="text-[10px] text-zinc-400">Month-over-month trend</span>
        </div>

        {data.monthOverMonth.expenseChanges.length === 0 ? (
          <p className="text-xs text-zinc-400 py-3 text-center">
            No historical data available from the previous month.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.monthOverMonth.expenseChanges.map((change) => {
              const prevExp = data.monthOverMonth.prevExpensesByCurrency[change.currency] || "0.00";
              const currExp = data.monthOverMonth.currExpensesByCurrency[change.currency] || "0.00";

              return (
                <div
                  key={change.currency}
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {change.currency} Expenses
                    </span>
                    <span
                      className={cn(
                        "font-bold font-mono",
                        change.isIncrease
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {change.isIncrease ? `+${change.diffPercent}% higher` : `-${change.diffPercent}% lower`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                    <div>
                      <span>Previous ({data.monthOverMonth.prevMonth}):</span>
                      <div className="font-bold font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">
                        {formatCurrency(prevExp, change.currency)}
                      </div>
                    </div>
                    <div>
                      <span>Current ({data.yearMonth}):</span>
                      <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {formatCurrency(currExp, change.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. NON-EXPENSE MONEY MOVEMENTS */}
      {data.moneyMovements.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Money Movements & Flows
              </h3>
              <span className="text-[11px] text-zinc-400">
                Internal transfers, cash withdrawals, deposits, and top ups
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {data.moneyMovements.map((m) => (
              <React.Fragment key={m.currency}>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold text-zinc-400 block">
                    Transfers Out ({m.currency})
                  </span>
                  <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {formatCurrency(m.transfersOut, m.currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold text-zinc-400 block">
                    Withdrawals ({m.currency})
                  </span>
                  <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {formatCurrency(m.withdrawals, m.currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold text-zinc-400 block">
                    Deposits ({m.currency})
                  </span>
                  <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {formatCurrency(m.deposits, m.currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold text-zinc-400 block">
                    Top Ups ({m.currency})
                  </span>
                  <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {formatCurrency(m.topUps, m.currency)}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
