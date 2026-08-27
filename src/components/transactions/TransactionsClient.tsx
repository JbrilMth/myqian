"use client";

import React, { useState, useMemo } from "react";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { useTransactionModal } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  X,
} from "lucide-react";
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
} from "@/lib/finance/types";

interface TransactionsClientProps {
  initialTransactions: any[];
  accounts: AccountWithBalance[];
  categories: CategoryWithChildren[];
  people: PersonWithBalance[];
}

export function TransactionsClient({
  initialTransactions,
  accounts,
  categories,
  people,
}: TransactionsClientProps) {
  const { openAddTransaction, openEditTransaction } = useTransactionModal();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedPersonId, setSelectedPersonId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const accountsMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, { name: a.name, currency: a.currency }])),
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

  const peopleMap = useMemo(
    () => new Map(people.map((p) => [p.id, p.name])),
    [people]
  );

  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter((tx) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = tx.title?.toLowerCase().includes(query);
        const matchNote = tx.note?.toLowerCase().includes(query);
        if (!matchTitle && !matchNote) return false;
      }

      // Type
      if (selectedType !== "all" && tx.type !== selectedType) {
        return false;
      }

      // Account
      if (selectedAccountId !== "all") {
        if (
          tx.sourceAccountId !== selectedAccountId &&
          tx.destinationAccountId !== selectedAccountId
        ) {
          return false;
        }
      }

      // Category
      if (selectedCategoryId !== "all") {
        if (
          tx.parentCategoryId !== selectedCategoryId &&
          tx.childCategoryId !== selectedCategoryId
        ) {
          return false;
        }
      }

      // Person
      if (selectedPersonId !== "all") {
        if (tx.personId !== selectedPersonId) return false;
      }

      // Date range
      if (startDate && tx.transactionDate < startDate) return false;
      if (endDate && tx.transactionDate > endDate) return false;

      return true;
    });
  }, [
    initialTransactions,
    search,
    selectedType,
    selectedAccountId,
    selectedCategoryId,
    selectedPersonId,
    startDate,
    endDate,
  ]);

  const hasActiveFilters =
    search ||
    selectedType !== "all" ||
    selectedAccountId !== "all" ||
    selectedCategoryId !== "all" ||
    selectedPersonId !== "all" ||
    startDate ||
    endDate;

  const resetFilters = () => {
    setSearch("");
    setSelectedType("all");
    setSelectedAccountId("all");
    setSelectedCategoryId("all");
    setSelectedPersonId("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Transactions
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Complete multi-currency ledger history with filters and search.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAddTransaction()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or note..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="deposit">Deposit</option>
            <option value="top_up">Top Up</option>
          </select>

          {/* Account Filter */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <option value="all">All Categories</option>
            {categories.map((p) => (
              <optgroup key={p.id} label={p.name}>
                <option value={p.id}>{p.name} (All)</option>
                {p.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    ↳ {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Person Filter */}
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <option value="all">All People</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter & Clear */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
            <span className="text-zinc-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLE OR EMPTY STATE */}
      {filteredTransactions.length === 0 ? (
        initialTransactions.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="w-5 h-5" />}
            title="No transactions yet"
            description="Add your first transaction (Expense, Income, Transfer, Withdrawal, Deposit, or Top Up) to see it in your ledger."
            action={
              <button
                type="button"
                onClick={() => openAddTransaction()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Transaction
              </button>
            }
          />
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            No transactions matched your filter criteria.
          </div>
        )
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-zinc-500">
            Showing {filteredTransactions.length} of {initialTransactions.length} transactions
          </div>
          <TransactionTable
            transactions={filteredTransactions}
            accountsMap={accountsMap}
            categoriesMap={categoriesMap}
            peopleMap={peopleMap}
            onEdit={openEditTransaction}
          />
        </div>
      )}
    </div>
  );
}
