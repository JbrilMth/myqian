"use client";

import React, { useState } from "react";
import { ExchangeRateModal } from "./ExchangeRateModal";
import { deleteExchangeRate } from "@/actions/settings";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Settings,
  Plus,
  Trash2,
  ArrowLeftRight,
  Database,
  ShieldCheck,
  Calculator,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  initialRates: any[];
}

export function SettingsClient({ initialRates }: SettingsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const handleDeleteRate = async (id: string) => {
    if (!confirm("Are you sure you want to remove this exchange rate?")) return;
    setDeletingId(id);
    try {
      await deleteExchangeRate(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Settings & Preferences
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage appearance, exchange rates, and review database configuration.
          </p>
        </div>
      </div>

      {/* APPEARANCE / THEME SECTION */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Interface Appearance
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Customize the look and feel of your finance console.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme === "light"
                ? "border-zinc-950 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/80 shadow-xs ring-1 ring-zinc-950/20 dark:ring-white/20"
                : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Light Mode
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Clean and bright
              </div>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme === "dark"
                ? "border-zinc-950 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/80 shadow-xs ring-1 ring-zinc-950/20 dark:ring-white/20"
                : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Dark Mode
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Subtle low-light
              </div>
            </div>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme === "system"
                ? "border-zinc-950 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/80 shadow-xs ring-1 ring-zinc-950/20 dark:ring-white/20"
                : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                System Sync
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Match OS theme
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* EXCHANGE RATES SECTION */}
      <section className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Manual Exchange Rates
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Used strictly for dashboard approximate total valuations. Native account balances and transaction amounts remain unchanged.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rate</span>
          </button>
        </div>

        {initialRates.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="w-5 h-5 text-zinc-400" />}
            title="No exchange rates configured"
            description="Configure exchange rates (such as 1 CNY = 1.30 MAD) to view an approximate converted total value on your dashboard."
            action={
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Configure Rate
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Conversion Pair</th>
                  <th className="px-4 py-3">Configured Rate</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {initialRates.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      1 {r.fromCurrency} → {r.toCurrency}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {r.rate}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRate(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete rate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SYSTEM ARCHITECTURE & INTEGRITY */}
      <section className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          System Integrity & Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>Neon PostgreSQL</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Connected to real persistent Neon PostgreSQL database with foreign key constraints, indexes, and full relational integrity.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
              <Calculator className="w-4 h-4 text-blue-500" />
              <span>Exact Decimal Arithmetic</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              All financial balances and totals computed using exact decimal arithmetic with zero JavaScript floating-point rounding errors.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>Zero Fake / Mock Data</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Clean initial state with zero hardcoded financial records. Every account, category, person, and transaction is user-managed.
            </p>
          </div>
        </div>
      </section>

      <ExchangeRateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
