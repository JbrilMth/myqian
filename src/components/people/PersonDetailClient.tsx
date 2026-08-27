"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, toDecimal } from "@/lib/finance/decimal";
import { MetricCard } from "@/components/ui/MetricCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { PersonModal } from "./PersonModal";
import { toggleArchivePerson } from "@/actions/people";
import { useTransactionModal } from "@/components/layout/AppShell";
import type {
  PersonWithBalance,
  AccountWithBalance,
  CategoryWithChildren,
} from "@/lib/finance/types";
import {
  ArrowLeft,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonDetailClientProps {
  person: PersonWithBalance;
  transactions: any[];
  accounts: AccountWithBalance[];
  categories: CategoryWithChildren[];
}

export function PersonDetailClient({
  person,
  transactions: initialTransactions,
  accounts,
  categories,
}: PersonDetailClientProps) {
  const router = useRouter();
  const { openAddTransaction, openEditTransaction } = useTransactionModal();
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "sent_return" | "received_return" | "no_return"
  >("all");

  const accountsMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, { name: a.name, currency: a.currency, type: a.type }])),
    [accounts]
  );

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const parent of categories) {
      map.set(parent.id, parent.name);
      for (const child of parent.children) {
        map.set(child.id, child.name);
      }
    }
    return map;
  }, [categories]);

  const peopleMap = useMemo(() => new Map([[person.id, person.name]]), [person]);

  const currencyEntries = Object.entries(person.balancesByCurrency);

  // Filtered transactions for this person
  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter((tx) => {
      if (historyFilter === "all") return true;
      if (historyFilter === "sent_return") {
        return (
          tx.personTransferType === "send_with_return" ||
          tx.personTransferType === "lend" ||
          tx.personTransferType === "repay_to_person"
        );
      }
      if (historyFilter === "received_return") {
        return (
          tx.personTransferType === "receive_with_return" ||
          tx.personTransferType === "borrow" ||
          tx.personTransferType === "repayment_from_person"
        );
      }
      if (historyFilter === "no_return") {
        return (
          tx.personTransferType === "send_without_return" ||
          tx.personTransferType === "receive_without_return" ||
          tx.personTransferType === "send" ||
          tx.personTransferType === "receive"
        );
      }
      return true;
    });
  }, [initialTransactions, historyFilter]);

  const handleToggleArchive = async () => {
    await toggleArchivePerson(person.id, !person.isArchived);
    router.refresh();
  };

  const handleSendToPerson = () => {
    openAddTransaction({
      type: "transfer",
      personId: person.id,
      relationship: "they_owe_me",
      personTransferType: "send_with_return",
    });
  };

  const handleReceiveFromPerson = () => {
    openAddTransaction({
      type: "transfer",
      personId: person.id,
      relationship: "i_owe_them",
      personTransferType: "receive_with_return",
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header with Back & Action Controls */}
      <div className="space-y-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to People</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {person.name}
              </h1>
              {person.isArchived && (
                <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md font-medium">
                  Archived
                </span>
              )}
            </div>
            {person.note && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {person.note}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleSendToPerson}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold transition-colors shadow-2xs min-h-[38px]"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Send to {person.name}</span>
            </button>

            <button
              type="button"
              onClick={handleReceiveFromPerson}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold transition-colors shadow-2xs min-h-[38px]"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receive from {person.name}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditPersonModalOpen(true)}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Edit person info"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleArchive}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={person.isArchived ? "Unarchive person" : "Archive person"}
              >
                {person.isArchived ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TWO-WAY FINANCIAL POSITION OVERVIEW */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Financial Position Breakdown
        </h2>

        {currencyEntries.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            No active financial balance with {person.name}.
          </div>
        ) : (
          <div className="space-y-4">
            {currencyEntries.map(([curr, b]) => {
              const theyOwe = toDecimal(b.theyOweYou);
              const youOwe = toDecimal(b.youOweThem);
              const net = toDecimal(b.netPosition);
              const isSettled = theyOwe.eq(0) && youOwe.eq(0);

              return (
                <div key={curr} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {curr} Ledger
                    </h3>
                    {isSettled && (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Settled
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <MetricCard
                      label="They Owe You"
                      value={formatCurrency(b.theyOweYou, curr)}
                      subValue="Outstanding money they owe"
                      icon={<ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                    />
                    <MetricCard
                      label="You Owe Them"
                      value={formatCurrency(b.youOweThem, curr)}
                      subValue="Outstanding money you owe"
                      icon={<ArrowDownLeft className="w-4 h-4 text-red-500" />}
                    />
                    <MetricCard
                      label="Net Position"
                      value={
                        isSettled
                          ? "Settled"
                          : formatCurrency(b.netPosition, curr, { showSign: true })
                      }
                      subValue={
                        isSettled
                          ? "All debts fully settled"
                          : net.gt(0)
                          ? "They owe you in net"
                          : "You owe them in net"
                      }
                      icon={<Users className="w-4 h-4 text-blue-500" />}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PERSON TRANSACTION HISTORY */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Financial History ({initialTransactions.length})
          </h2>

          {/* History Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-lg">
            {[
              { id: "all", label: "All History" },
              { id: "sent_return", label: "Sent (Return)" },
              { id: "received_return", label: "Recv (Return)" },
              { id: "no_return", label: "Gifts (No Return)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryFilter(tab.id as any)}
                className={cn(
                  "px-2.5 py-1.5 text-[11px] font-medium rounded-md whitespace-nowrap transition-all",
                  historyFilter === tab.id
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <TransactionTable
          transactions={filteredTransactions}
          accountsMap={accountsMap}
          categoriesMap={categoriesMap}
          peopleMap={peopleMap}
          onEdit={openEditTransaction}
          onRefresh={() => router.refresh()}
        />
      </section>

      <PersonModal
        isOpen={isEditPersonModalOpen}
        onClose={() => setIsEditPersonModalOpen(false)}
        person={person}
      />
    </div>
  );
}
