"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  PieChart,
  Scale,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhereIsMyMoneyData } from "@/lib/finance/analysis";

interface WhereIsMyMoneyClientProps {
  initialData: WhereIsMyMoneyData;
}

export function WhereIsMyMoneyClient({ initialData }: WhereIsMyMoneyClientProps) {
  const currencies = initialData.allCurrencies.length > 0 ? initialData.allCurrencies : ["CNY"];
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currencies[0] || "CNY");

  const currentData = initialData.byCurrency[selectedCurrency] || {
    currency: selectedCurrency,
    totalAvailable: "0.00",
    accounts: [],
    totalOwedToMe: "0.00",
    debtors: [],
    totalIOwe: "0.00",
    creditors: [],
    netPosition: "0.00",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Where Is My Money?
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Real-time breakdown of liquid account balances and two-way debt claims.
              </p>
            </div>
          </div>
        </div>

        {/* Currency Switcher */}
        {currencies.length > 1 && (
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
            {currencies.map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setSelectedCurrency(curr)}
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

      {/* 1. TOTAL AVAILABLE LIQUID MONEY HERO */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Total Available Money ({selectedCurrency})
          </span>
          <span className="text-xs text-zinc-400 font-medium">
            {currentData.accounts.length} {currentData.accounts.length === 1 ? "account" : "accounts"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
            {formatCurrency(currentData.totalAvailable, selectedCurrency)}
          </div>
          <div className="text-xs text-zinc-500 font-medium">
            Liquid cash and bank deposits
          </div>
        </div>

        {/* Distribution Progress Bar */}
        {currentData.accounts.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
              {currentData.accounts.map((acc, idx) => {
                const colors = [
                  "bg-zinc-900 dark:bg-zinc-100",
                  "bg-emerald-500",
                  "bg-sky-500",
                  "bg-amber-500",
                  "bg-purple-500",
                  "bg-zinc-400",
                ];
                const colorClass = colors[idx % colors.length];
                return (
                  <div
                    key={acc.id}
                    style={{ width: `${acc.percentage}%` }}
                    className={cn("h-full transition-all", colorClass)}
                    title={`${acc.name}: ${acc.percentage}%`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-500">
              {currentData.accounts.map((acc, idx) => {
                const dotColors = [
                  "bg-zinc-900 dark:bg-zinc-100",
                  "bg-emerald-500",
                  "bg-sky-500",
                  "bg-amber-500",
                  "bg-purple-500",
                  "bg-zinc-400",
                ];
                return (
                  <div key={acc.id} className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", dotColors[idx % dotColors.length])} />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{acc.name}</span>
                    <span className="text-zinc-400">({acc.percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. "MONEY I HAVE" (ACCOUNTS BREAKDOWN) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-zinc-500" />
          <span>Money I Have (Accounts)</span>
        </h2>

        {currentData.accounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            No accounts configured in {selectedCurrency}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentData.accounts.map((acc) => {
              const identity = getAccountIdentity(acc.name, acc.type);
              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full", identity.dotColor)} />
                        <span>{acc.name}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 capitalize">
                        {acc.type.replace("_", " ")} • {acc.percentage}% of total
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {formatCurrency(acc.balance, selectedCurrency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. PEOPLE & DEBT STANDING (TWO-WAY CLAIMS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Money Owed to Me */}
        <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Money Owed to Me
                </h3>
                <span className="text-[10px] text-zinc-400">Receivable assets</span>
              </div>
            </div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              +{formatCurrency(currentData.totalOwedToMe, selectedCurrency)}
            </div>
          </div>

          {currentData.debtors.length === 0 ? (
            <p className="text-xs text-zinc-400 py-3 text-center">
              No one owes you money in {selectedCurrency}.
            </p>
          ) : (
            <div className="space-y-2">
              {currentData.debtors.map((d) => (
                <div
                  key={d.personId}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {d.personName}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{formatCurrency(d.amount, selectedCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Money I Owe */}
        <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Money I Owe
                </h3>
                <span className="text-[10px] text-zinc-400">Payable liabilities</span>
              </div>
            </div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">
              -{formatCurrency(currentData.totalIOwe, selectedCurrency)}
            </div>
          </div>

          {currentData.creditors.length === 0 ? (
            <p className="text-xs text-zinc-400 py-3 text-center">
              You do not owe anyone money in {selectedCurrency}.
            </p>
          ) : (
            <div className="space-y-2">
              {currentData.creditors.map((c) => (
                <div
                  key={c.personId}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {c.personName}
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400 font-mono">
                    -{formatCurrency(c.amount, selectedCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. NET LIQUID + DEBT STANDING STRIP */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-500">
          <Scale className="w-4 h-4 text-zinc-400" />
          <span>
            Formula: Available ({formatCurrency(currentData.totalAvailable, selectedCurrency)}) + Receivables (+{formatCurrency(currentData.totalOwedToMe, selectedCurrency)}) - Payables (-{formatCurrency(currentData.totalIOwe, selectedCurrency)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium">Net Position:</span>
          <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
            {formatCurrency(currentData.netPosition, selectedCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
}
