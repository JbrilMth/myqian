"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { fetchCalendarAction } from "@/actions/analysis";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Clock,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarData, CalendarDaySummary } from "@/lib/finance/analysis";

interface CalendarClientProps {
  initialData: CalendarData;
}

export function CalendarClient({ initialData }: CalendarClientProps) {
  const [data, setData] = useState<CalendarData>(initialData);
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isPending, startTransition] = useTransition();

  const handleMonthChange = (offset: number) => {
    const [year, month] = data.yearMonth.split("-").map(Number);
    const targetDate = new Date(year, month - 1 + offset, 1);
    const ym = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

    startTransition(async () => {
      const res = await fetchCalendarAction(ym);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleGoToday = () => {
    const currentYm = todayStr.slice(0, 7);
    setSelectedDate(todayStr);
    if (currentYm !== data.yearMonth) {
      startTransition(async () => {
        const res = await fetchCalendarAction(currentYm);
        if (res.success && res.data) {
          setData(res.data);
        }
      });
    }
  };

  const selectedDayTransactions = data.transactionsByDate[selectedDate] || [];

  // Format selected date title nicely
  const selectedDateObj = new Date(selectedDate);
  const selectedDateTitle = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Calendar View
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Day-by-day cash flow activity and daily spending ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs"
          >
            Today
          </button>

          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 min-w-[120px] text-center">
              {data.monthTitle}
            </span>

            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. CALENDAR GRID */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pb-1">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* 7-Column Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {data.days.map((day, idx) => {
            const isSelected = day.date === selectedDate;
            const hasActivity = day.hasTransactions;

            return (
              <button
                key={`${day.date}-${idx}`}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  "min-h-[64px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-xl text-left transition-all relative flex flex-col justify-between border",
                  !day.isCurrentMonth
                    ? "opacity-30 border-transparent bg-zinc-50/50 dark:bg-zinc-900/30"
                    : isSelected
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs ring-2 ring-zinc-900/20 dark:ring-zinc-100/20"
                    : day.isToday
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                    : "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/60 dark:hover:bg-zinc-800"
                )}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={cn(
                      "text-xs font-bold font-mono",
                      day.isToday && !isSelected ? "text-blue-600 dark:text-blue-400" : ""
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white dark:bg-zinc-900" : "bg-blue-600 dark:bg-blue-400"
                      )}
                    />
                  )}
                </div>

                {/* Day Mini Activity Badges */}
                {hasActivity && (
                  <div className="space-y-0.5 mt-1 w-full">
                    {/* Expense Badge */}
                    {day.hasExpense && (
                      <div
                        className={cn(
                          "text-[9px] sm:text-[10px] font-mono font-bold truncate px-1 py-0.2 rounded-sm",
                          isSelected
                            ? "text-red-300 dark:text-red-600 bg-black/20 dark:bg-white/30"
                            : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                        )}
                      >
                        {Object.entries(day.totalExpenseByCurrency).map(([c, val]) => `-${formatCurrency(val, c)}`).join(" ")}
                      </div>
                    )}
                    {/* Income Badge */}
                    {day.hasIncome && (
                      <div
                        className={cn(
                          "text-[9px] sm:text-[10px] font-mono font-bold truncate px-1 py-0.2 rounded-sm",
                          isSelected
                            ? "text-emerald-300 dark:text-emerald-600 bg-black/20 dark:bg-white/30"
                            : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                        )}
                      >
                        {Object.entries(day.totalIncomeByCurrency).map(([c, val]) => `+${formatCurrency(val, c)}`).join(" ")}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SELECTED DAY TRANSACTIONS DETAIL */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {selectedDateTitle}
            </h3>
            <span className="text-[11px] text-zinc-400">
              {selectedDayTransactions.length} {selectedDayTransactions.length === 1 ? "transaction" : "transactions"}
            </span>
          </div>
        </div>

        {selectedDayTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            No transactions recorded on this day.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayTransactions.map((tx) => {
              const curr = (tx.sourceCurrency || tx.destinationCurrency || "CNY").toUpperCase();
              const isExpense = tx.type === "expense";
              const isIncome = tx.type === "income";
              const rawAmt = isIncome ? (tx.destinationAmount || tx.sourceAmount || "0") : (tx.sourceAmount || tx.destinationAmount || "0");
              const formatted = formatCurrency(rawAmt, curr);

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold",
                        isExpense
                          ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                          : isIncome
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      )}
                    >
                      {isExpense ? "−" : isIncome ? "+" : "⇄"}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {tx.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 capitalize">
                        {tx.type.replace("_", " ")}
                        {tx.note && ` • ${tx.note}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold">
                    <span
                      className={
                        isExpense
                          ? "text-red-600 dark:text-red-400"
                          : isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-900 dark:text-zinc-100"
                      }
                    >
                      {isExpense ? `-${formatted}` : isIncome ? `+${formatted}` : formatted}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
