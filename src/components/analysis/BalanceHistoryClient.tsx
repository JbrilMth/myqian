"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import { fetchAccountBalanceHistoryAction } from "@/actions/analysis";
import { AreaLineChart } from "@/components/ui/Chart";
import {
  History,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountBalanceHistoryData } from "@/lib/finance/analysis";

interface BalanceHistoryClientProps {
  initialData: AccountBalanceHistoryData;
}

export function BalanceHistoryClient({ initialData }: BalanceHistoryClientProps) {
  const [data, setData] = useState<AccountBalanceHistoryData>(initialData);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialData.selectedAccountId);
  const [timeRange, setTimeRange] = useState<string>(initialData.timeRange || "30d");
  const [isPending, startTransition] = useTransition();

  const handleAccountChange = (accId: string) => {
    setSelectedAccountId(accId);
    startTransition(async () => {
      const res = await fetchAccountBalanceHistoryAction(accId, timeRange);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    startTransition(async () => {
      const res = await fetchAccountBalanceHistoryAction(selectedAccountId, range);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const isNetPositive = Number(data.netChange) >= 0;
  const identity = getAccountIdentity(data.accountName);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Account Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Balance History
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Chronological balance trajectory and movement history for individual accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Account Selector */}
        {data.accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-500">Account:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
            >
              {data.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1. CURRENT BALANCE & TIMELINE CHART */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-6">
        {/* Top Balance & Time Range Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", identity.dotColor)} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {data.accountName} • Current Balance
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
              {formatCurrency(data.currentBalance, data.currency)}
            </div>
          </div>

          {/* Timeframe Selector */}
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

        {/* Inflow / Outflow / Net Change Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase text-zinc-400">Starting Balance</span>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
              {formatCurrency(data.startingBalance, data.currency)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase text-zinc-400">Total Inflow</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{formatCurrency(data.totalInflow, data.currency)}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase text-zinc-400">Total Outflow</span>
            <div className="text-sm font-bold text-red-600 dark:text-red-400 font-mono mt-0.5 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>-{formatCurrency(data.totalOutflow, data.currency)}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase text-zinc-400">Net Movement</span>
            <div
              className={cn(
                "text-sm font-bold font-mono mt-0.5",
                isNetPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isNetPositive ? "+" : ""}
              {formatCurrency(data.netChange, data.currency)}
            </div>
          </div>
        </div>

        {/* Historical Chart */}
        <div className="pt-2">
          <AreaLineChart
            data={data.history}
            currency={data.currency}
            color="indigo"
            height={220}
          />
        </div>
      </div>

      {/* 2. CHRONOLOGICAL MOVEMENTS LEDGER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Movements in Selected Timeframe
          </h2>
          <span className="text-xs text-zinc-400">{data.movements.length} transactions</span>
        </div>

        {data.movements.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            No movements recorded for this account in the selected timeframe.
          </div>
        ) : (
          <div className="space-y-2">
            {data.movements.map((tx) => {
              const isDest = tx.destinationAccountId === data.selectedAccountId;
              const isSrc = tx.sourceAccountId === data.selectedAccountId;
              const rawAmt = isDest ? (tx.destinationAmount || tx.sourceAmount || "0") : (tx.sourceAmount || tx.destinationAmount || "0");
              const isPositive = isDest;

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isPositive
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      )}
                    >
                      {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {tx.title}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {tx.transactionDate} • {tx.type.replace("_", " ")}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold">
                    <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                      {isPositive ? "+" : "-"}
                      {formatCurrency(rawAmt, data.currency)}
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
