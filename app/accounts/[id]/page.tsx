import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAccountDetails,
  getAccountsWithBalances,
  getCategoriesTree,
  getPeopleWithBalances,
} from "@/lib/finance/service";
import { formatCurrency } from "@/lib/finance/decimal";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import { MetricCard } from "@/components/ui/MetricCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { id } = await params;
  const [{ account, transactions }, allAccounts, categories, people] = await Promise.all([
    getAccountDetails(id),
    getAccountsWithBalances(true),
    getCategoriesTree(true),
    getPeopleWithBalances(true),
  ]);

  if (!account) {
    notFound();
  }

  const identity = getAccountIdentity(account.name, account.type);
  const stats = account.monthlyStats;
  const accountsMap = new Map(
    allAccounts.map((a) => [a.id, { name: a.name, currency: a.currency, type: a.type }])
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
      {/* Header with Back */}
      <div className="space-y-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Accounts</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={cn("w-3 h-3 rounded-full shrink-0", identity.dotColor)} />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {account.name}
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-700 dark:text-zinc-300">
                {account.currency}
              </span>
              {account.isArchived && (
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-md font-medium">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 capitalize ml-5.5">
              {account.type.replace("_", " ")} Account • Initial: {formatCurrency(account.initialBalance, account.currency)}
            </p>
          </div>

          {/* Current Balance Hero Card */}
          <div className="px-5 py-3.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs flex flex-col sm:items-end">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
              Current Balance
            </span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight">
              {formatCurrency(account.currentBalance, account.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* THIS MONTH METRICS */}
      {stats && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            This Month Activity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <MetricCard
              label="Income"
              value={formatCurrency(stats.income, account.currency)}
              icon={<ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />}
            />
            <MetricCard
              label="Expenses"
              value={formatCurrency(stats.expenses, account.currency)}
              icon={<ArrowUpRight className="w-3.5 h-3.5 text-red-500" />}
            />
            <MetricCard
              label="Withdrawals"
              value={formatCurrency(stats.withdrawals, account.currency)}
              icon={<CreditCard className="w-3.5 h-3.5 text-amber-500" />}
            />
            <MetricCard
              label="Deposits"
              value={formatCurrency(stats.deposits, account.currency)}
              icon={<ArrowDownLeft className="w-3.5 h-3.5 text-purple-500" />}
            />
            <MetricCard
              label="Top Ups"
              value={formatCurrency(stats.topUps, account.currency)}
              icon={<ArrowLeftRight className="w-3.5 h-3.5 text-cyan-500" />}
            />
            <MetricCard
              label="Transfers In"
              value={formatCurrency(stats.transfersIn, account.currency)}
              icon={<ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />}
            />
          </div>
        </section>
      )}

      {/* ACCOUNT TRANSACTIONS */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Transaction History ({transactions.length})
        </h2>
        <TransactionTable
          transactions={transactions}
          accountsMap={accountsMap}
          categoriesMap={categoriesMap}
          peopleMap={peopleMap}
        />
      </section>
    </div>
  );
}
