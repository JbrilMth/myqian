import React from "react";
import Link from "next/link";
import {
  getDashboardData,
  getCategoriesTree,
  getPeopleWithBalances,
} from "@/lib/finance/service";
import { formatCurrency } from "@/lib/finance/decimal";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import { TotalMoneySection } from "@/components/dashboard/TotalMoneySection";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import {
  Wallet,
  CreditCard,
  Plus,
  ArrowUpRight as ExternalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, categories, people] = await Promise.all([
    getDashboardData(),
    getCategoriesTree(true),
    getPeopleWithBalances(true),
  ]);

  // Map lookups for transaction table
  const accountsMap = new Map(
    data.accounts.map((a) => [a.id, { name: a.name, currency: a.currency, type: a.type }])
  );

  const categoriesMap = new Map<string, string>();
  for (const parent of categories) {
    categoriesMap.set(parent.id, parent.name);
    for (const child of parent.children) {
      categoriesMap.set(child.id, child.name);
    }
  }

  const peopleMap = new Map(people.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time financial status, balances, and ledger summary.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold transition-colors shadow-2xs"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Manage Accounts</span>
          </Link>
        </div>
      </div>

      {/* DYNAMIC SELECTABLE TOTAL MONEY SECTION */}
      <TotalMoneySection
        totalMoneyByCurrency={data.totalMoneyByCurrency}
        exchangeRates={data.exchangeRates}
      />

      {/* ACCOUNTS BREAKDOWN */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Accounts ({data.accounts.length})
          </h2>
          <Link
            href="/accounts"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1"
          >
            View all <ExternalIcon className="w-3 h-3" />
          </Link>
        </div>

        {data.accounts.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-5 h-5" />}
            title="No accounts yet"
            description="Create your first financial account (such as ICBC, WeChat Balance, Alipay, Cash, CIH, or Attijari) to start tracking your finances."
            action={
              <Link
                href="/accounts"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Account
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {data.accounts.map((acc) => {
              const identity = getAccountIdentity(acc.name, acc.type);

              return (
                <Link
                  key={acc.id}
                  href={`/accounts/${acc.id}`}
                  className={cn(
                    "group p-4 rounded-xl bg-white dark:bg-zinc-900 border border-l-4 transition-all shadow-2xs flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-600",
                    identity.borderAccent,
                    "border-zinc-200/80 dark:border-zinc-800"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", identity.dotColor)} />
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                          {acc.name}
                        </h3>
                      </div>
                      <span className="inline-block uppercase tracking-wider text-[10px] font-medium text-zinc-400 mt-0.5 ml-4">
                        {acc.type.replace("_", " ")} • {acc.currency}
                      </span>
                    </div>
                    <span className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-baseline justify-between">
                    <span className="text-[11px] text-zinc-400">Balance</span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {formatCurrency(acc.currentBalance, acc.currency)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* RECENT TRANSACTIONS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Recent Transactions
          </h2>
          {data.recentTransactions.length > 0 && (
            <Link
              href="/transactions"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1"
            >
              All transactions <ExternalIcon className="w-3 h-3" />
            </Link>
          )}
        </div>

        <TransactionTable
          transactions={data.recentTransactions}
          accountsMap={accountsMap}
          categoriesMap={categoriesMap}
          peopleMap={peopleMap}
        />
      </section>
    </div>
  );
}
