"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { fetchNetWorthAction } from "@/actions/analysis";
import { AreaLineChart } from "@/components/ui/Chart";
import {
  TrendingUp,
  TrendingDown,
  LineChart,
  ShieldCheck,
  Building,
  Users,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetWorthData } from "@/lib/finance/analysis";

interface NetWorthClientProps {
  initialData: NetWorthData;
}

export function NetWorthClient({ initialData }: NetWorthClientProps) {
  const [data, setData] = useState<NetWorthData>(initialData);
  const [timeRange, setTimeRange] = useState<string>(initialData.timeRange || "30d");
  const [selectedCurrency, setSelectedCurrency] = useState<string>(initialData.selectedCurrency || "CNY");
  const [isPending, startTransition] = useTransition();

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    startTransition(async () => {
      const res = await fetchNetWorthAction(range, selectedCurrency);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleCurrencyChange = (curr: string) => {
    setSelectedCurrency(curr);
    startTransition(async () => {
      const res = await fetchNetWorthAction(timeRange, curr);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const isPositiveChange = Number(data.changeAmount) >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
              <LineChart className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Net Worth
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Historical wealth trajectory, asset accumulation, and debt position over time.
              </p>
            </div>
          </div>
        </div>

        {/* Currency Switcher */}
        {data.currencies.length > 1 && (
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
            {data.currencies.map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => handleCurrencyChange(curr)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all",
                  selectedCurrency === curr
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                {curr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. NET WORTH SUMMARY & CHART CONTAINER */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-6">
        {/* Top Metric & Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Current Net Worth ({selectedCurrency})
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
              {formatCurrency(data.currentNetWorth, selectedCurrency)}
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
            {[
              { id: "7d", label: "7D" },
              { id: "30d", label: "30D" },
              { id: "3m", label: "3M" },
              { id: "6m", label: "6M" },
              { id: "1y", label: "1Y" },
              { id: "all", label: "ALL" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleTimeRangeChange(r.id)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                  timeRange === r.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period Change Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase text-zinc-400">Starting Position</span>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
              {formatCurrency(data.startingNetWorth, selectedCurrency)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase text-zinc-400">Period Change</span>
            <div
              className={cn(
                "text-sm font-bold font-mono mt-0.5 flex items-center gap-1",
                isPositiveChange
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {isPositiveChange ? "+" : ""}
                {formatCurrency(data.changeAmount, selectedCurrency)}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold uppercase text-zinc-400">Growth Rate</span>
            <div
              className={cn(
                "text-sm font-bold font-mono mt-0.5",
                isPositiveChange
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositiveChange ? "+" : ""}
              {data.changePercentage}%
            </div>
          </div>
        </div>

        {/* SVG Historical Chart */}
        <div className="pt-2">
          <AreaLineChart
            data={data.history}
            currency={selectedCurrency}
            color={isPositiveChange ? "emerald" : "zinc"}
            height={240}
          />
        </div>
      </div>

      {/* 2. ASSETS VS LIABILITIES BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assets Card */}
        <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Total Assets
                </h3>
                <span className="text-[10px] text-zinc-400">Liquid accounts + Receivables</span>
              </div>
            </div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(data.assets.totalAssets, selectedCurrency)}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <span className="text-zinc-600 dark:text-zinc-400">Bank & Cash Accounts</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {formatCurrency(data.assets.accountsTotal, selectedCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <span className="text-zinc-600 dark:text-zinc-400">Money Owed to Me</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                +{formatCurrency(data.assets.owedToMeTotal, selectedCurrency)}
              </span>
            </div>
          </div>
        </div>

        {/* Liabilities Card */}
        <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Total Liabilities
                </h3>
                <span className="text-[10px] text-zinc-400">Debts & Payables</span>
              </div>
            </div>
            <div className="text-base font-extrabold text-red-600 dark:text-red-400 font-mono">
              {formatCurrency(data.liabilities.totalLiabilities, selectedCurrency)}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <span className="text-zinc-600 dark:text-zinc-400">Money I Owe to Others</span>
              <span className="font-bold text-red-600 dark:text-red-400 font-mono">
                {formatCurrency(data.liabilities.iOweTotal, selectedCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <span className="text-zinc-600 dark:text-zinc-400">Other Debts</span>
              <span className="font-bold text-zinc-500 font-mono">
                {formatCurrency("0.00", selectedCurrency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
