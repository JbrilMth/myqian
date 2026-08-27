"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PersonModal } from "./PersonModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { toggleArchivePerson } from "@/actions/people";
import { formatCurrency, Decimal, toDecimal, toFixed2 } from "@/lib/finance/decimal";
import type { PersonWithBalance } from "@/lib/finance/types";
import {
  Users,
  Plus,
  Edit2,
  Archive,
  ArrowRight,
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PeopleClientProps {
  initialPeople: PersonWithBalance[];
}

export function PeopleClient({ initialPeople }: PeopleClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonWithBalance | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filterDebt, setFilterDebt] = useState<"all" | "owes_you" | "you_owe" | "settled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate Totals across all active people
  const summary = useMemo(() => {
    const active = initialPeople.filter((p) => !p.isArchived);
    const owesYouByCurrency: { [curr: string]: Decimal } = {};
    const youOweByCurrency: { [curr: string]: Decimal } = {};

    for (const p of active) {
      for (const [curr, b] of Object.entries(p.balancesByCurrency)) {
        const theyOwe = toDecimal(b.theyOweYou);
        const youOwe = toDecimal(b.youOweThem);

        if (theyOwe.gt(0)) {
          owesYouByCurrency[curr] = (owesYouByCurrency[curr] || new Decimal(0)).add(theyOwe);
        }
        if (youOwe.gt(0)) {
          youOweByCurrency[curr] = (youOweByCurrency[curr] || new Decimal(0)).add(youOwe);
        }
      }
    }

    return {
      owesYouByCurrency,
      youOweByCurrency,
      peopleCount: active.length,
    };
  }, [initialPeople]);

  const displayedPeople = useMemo(() => {
    return initialPeople.filter((p) => {
      // 1. Archive filter
      if (!showArchived && p.isArchived) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchNote = p.note?.toLowerCase().includes(query);
        if (!matchName && !matchNote) return false;
      }

      // 3. Debt filter
      const currencyEntries = Object.entries(p.balancesByCurrency);
      const totalTheyOwe = currencyEntries.reduce(
        (acc, [_, b]) => acc.add(toDecimal(b.theyOweYou)),
        new Decimal(0)
      );
      const totalYouOwe = currencyEntries.reduce(
        (acc, [_, b]) => acc.add(toDecimal(b.youOweThem)),
        new Decimal(0)
      );

      if (filterDebt === "owes_you") {
        return totalTheyOwe.gt(0);
      }
      if (filterDebt === "you_owe") {
        return totalYouOwe.gt(0);
      }
      if (filterDebt === "settled") {
        return totalTheyOwe.eq(0) && totalYouOwe.eq(0);
      }

      return true;
    });
  }, [initialPeople, showArchived, searchQuery, filterDebt]);

  const handleEdit = (p: PersonWithBalance, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPerson(p);
    setIsModalOpen(true);
  };

  const handleToggleArchive = async (p: PersonWithBalance, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleArchivePerson(p.id, !p.isArchived);
  };

  const currenciesWithDebts = Array.from(
    new Set([
      ...Object.keys(summary.owesYouByCurrency),
      ...Object.keys(summary.youOweByCurrency),
    ])
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            People & Lending
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Two-way relationship management: track money lent, borrowed, and repayments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
            />
            <span>Show Archived</span>
          </label>

          <button
            type="button"
            onClick={() => {
              setSelectedPerson(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      {initialPeople.length > 0 && (
        <section className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <MetricCard
              label="Owes You"
              value={
                currenciesWithDebts.length === 0
                  ? "¥0.00"
                  : currenciesWithDebts
                      .map((c) =>
                        formatCurrency(
                          toFixed2(summary.owesYouByCurrency[c] || new Decimal(0)),
                          c
                        )
                      )
                      .join(" • ")
              }
              subValue="Total money others owe you"
              icon={<ArrowUpRight className="w-4 h-4 text-emerald-500" />}
            />
            <MetricCard
              label="You Owe"
              value={
                currenciesWithDebts.length === 0
                  ? "¥0.00"
                  : currenciesWithDebts
                      .map((c) =>
                        formatCurrency(
                          toFixed2(summary.youOweByCurrency[c] || new Decimal(0)),
                          c
                        )
                      )
                      .join(" • ")
              }
              subValue="Total money you owe others"
              icon={<ArrowDownLeft className="w-4 h-4 text-red-500" />}
            />
            <MetricCard
              label="People Tracked"
              value={summary.peopleCount.toString()}
              subValue="Active contacts & financial relations"
              icon={<Users className="w-4 h-4 text-zinc-500" />}
            />
          </div>
        </section>
      )}

      {/* CONTROLS: FILTERS & SEARCH */}
      {initialPeople.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-lg">
            {[
              { id: "all", label: "All" },
              { id: "owes_you", label: "Owes you" },
              { id: "you_owe", label: "You owe" },
              { id: "settled", label: "Settled" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterDebt(f.id as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all",
                  filterDebt === f.id
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>
      )}

      {/* PEOPLE GRID OR EMPTY STATE */}
      {displayedPeople.length === 0 ? (
        initialPeople.length === 0 ? (
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title="No people tracked yet"
            description="People will appear here when you add them or record money sent to / received from them (e.g. lending, borrowing, repayments)."
            action={
              <button
                type="button"
                onClick={() => {
                  setSelectedPerson(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Person
              </button>
            }
          />
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            No people matched your filter criteria.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {displayedPeople.map((person) => {
            const currencyEntries = Object.entries(person.balancesByCurrency);
            
            const isSettled =
              currencyEntries.length === 0 ||
              currencyEntries.every(([_, b]) => {
                const theyOwe = toDecimal(b.theyOweYou);
                const youOwe = toDecimal(b.youOweThem);
                return theyOwe.eq(0) && youOwe.eq(0);
              });

            return (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className={cn(
                  "group p-4 rounded-xl bg-white dark:bg-zinc-900 border transition-all shadow-2xs flex flex-col justify-between",
                  person.isArchived
                    ? "border-dashed border-zinc-200 dark:border-zinc-800 opacity-60"
                    : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                )}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                          {person.name}
                        </h3>
                        {person.isArchived && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-zinc-100 text-zinc-500 rounded">
                            Archived
                          </span>
                        )}
                        {isSettled && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-zinc-400" />
                            Settled
                          </span>
                        )}
                      </div>
                      {person.note && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {person.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleEdit(person, e)}
                        className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Edit person"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleArchive(person, e)}
                        className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title={person.isArchived ? "Unarchive" : "Archive"}
                      >
                        {person.isArchived ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Currency Debts */}
                  <div className="mt-4 space-y-2">
                    {currencyEntries.length === 0 ? (
                      <div className="text-xs text-zinc-400 italic py-2">
                        No financial history recorded
                      </div>
                    ) : (
                      currencyEntries.map(([curr, b]) => {
                        const theyOwe = toDecimal(b.theyOweYou);
                        const youOwe = toDecimal(b.youOweThem);
                        const net = toDecimal(b.netPosition);
                        const isCurrSettled = theyOwe.eq(0) && youOwe.eq(0);

                        return (
                          <div
                            key={curr}
                            className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5"
                          >
                            <div className="flex justify-between text-zinc-500">
                              <span>Owes you:</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(b.theyOweYou, curr)}
                              </span>
                            </div>
                            <div className="flex justify-between text-zinc-500">
                              <span>You owe:</span>
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                {formatCurrency(b.youOweThem, curr)}
                              </span>
                            </div>
                            <div className="pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex justify-between font-bold text-zinc-900 dark:text-zinc-100">
                              <span>Net:</span>
                              <span>
                                {isCurrSettled ? (
                                  <span className="text-zinc-500 font-normal">Settled</span>
                                ) : (
                                  <span
                                    className={
                                      net.gt(0)
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : "text-red-700 dark:text-red-400"
                                    }
                                  >
                                    {formatCurrency(b.netPosition, curr, { showSign: true })}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{person.transactionCount} transactions</span>
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium group-hover:underline flex items-center gap-0.5">
                    View Ledger <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <PersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        person={selectedPerson}
      />
    </div>
  );
}
