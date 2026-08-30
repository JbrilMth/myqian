"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/finance/decimal";
import { searchEverythingAction } from "@/actions/analysis";
import {
  Search,
  ArrowRight,
  ArrowLeftRight,
  Users,
  FolderTree,
  Wallet,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResults } from "@/lib/finance/analysis";
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
} from "@/lib/finance/types";

interface SearchClientProps {
  initialResults: SearchResults;
  accounts: AccountWithBalance[];
  categories: CategoryWithChildren[];
  people: PersonWithBalance[];
}

export function SearchClient({
  initialResults,
  accounts,
  categories,
  people,
}: SearchClientProps) {
  const [query, setQuery] = useState(initialResults.query || "");
  const [results, setResults] = useState<SearchResults>(initialResults);
  const [activeTab, setActiveTab] = useState<"all" | "transactions" | "people" | "categories" | "accounts">("all");
  const [isPending, startTransition] = useTransition();

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

  const peopleMap = useMemo(
    () => new Map(people.map((p) => [p.id, p.name])),
    [people]
  );

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    startTransition(async () => {
      const res = await searchEverythingAction(newQuery);
      if (res.success && res.data) {
        setResults(res.data);
      }
    });
  };

  const handleClear = () => {
    setQuery("");
    setResults({
      query: "",
      transactions: [],
      people: [],
      categories: [],
      accounts: [],
      totalMatches: 0,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Search Everything
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Instant multi-entity search across transactions, descriptions, people, categories, and accounts.
            </p>
          </div>
        </div>
      </div>

      {/* 1. SEARCH INPUT BAR */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search Title, Note, Person, Category, Account..."
          autoFocus
          className="w-full pl-12 pr-10 py-3.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xs placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. FILTER PILLS / TABS */}
      {query.trim() && (
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Results", count: results.totalMatches },
            { id: "transactions", label: "Transactions", count: results.transactions.length },
            { id: "people", label: "People", count: results.people.length },
            { id: "categories", label: "Categories", count: results.categories.length },
            { id: "accounts", label: "Accounts", count: results.accounts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5",
                activeTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-2xs font-bold"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 text-[10px] rounded-md",
                  activeTab === tab.id
                    ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800 font-bold"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 3. RESULTS DISPLAY */}
      {!query.trim() ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Type something to search
          </p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Search transactions, notes, people, categories, or accounts across the entire application.
          </p>
        </div>
      ) : results.totalMatches === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            No matching records found
          </p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            No transactions, accounts, categories, or people matched "{query}".
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Transactions Matches */}
          {(activeTab === "all" || activeTab === "transactions") && results.transactions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Matching Transactions ({results.transactions.length})</span>
                </h2>
                <Link
                  href="/transactions"
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                >
                  <span>View all in ledger</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {results.transactions.map((tx) => {
                  const parentCat = tx.parentCategoryId ? categoriesMap.get(tx.parentCategoryId) : null;
                  const childCat = tx.childCategoryId ? categoriesMap.get(tx.childCategoryId) : null;
                  const fullCat =
                    parentCat && childCat
                      ? `${parentCat} > ${childCat}`
                      : parentCat || childCat || "—";

                  const srcAcc = tx.sourceAccountId ? accountsMap.get(tx.sourceAccountId) : null;
                  const destAcc = tx.destinationAccountId ? accountsMap.get(tx.destinationAccountId) : null;
                  const personName = tx.personId ? peopleMap.get(tx.personId) : null;

                  const curr = (tx.sourceCurrency || tx.destinationCurrency || "CNY").toUpperCase();
                  const rawAmt = tx.type === "income" ? (tx.destinationAmount || tx.sourceAmount || "0") : (tx.sourceAmount || tx.destinationAmount || "0");
                  const formatted = formatCurrency(rawAmt, curr);

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
                            {tx.type.replace("_", " ")}
                          </span>
                          <span className="text-zinc-400">{tx.transactionDate}</span>
                        </div>
                        <span
                          className={cn(
                            "font-bold font-mono",
                            tx.type === "expense"
                              ? "text-red-600 dark:text-red-400"
                              : tx.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-zinc-900 dark:text-zinc-100"
                          )}
                        >
                          {tx.type === "expense" ? `-${formatted}` : tx.type === "income" ? `+${formatted}` : formatted}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                          {tx.title}
                        </h3>
                        {tx.note && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {tx.note}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{fullCat}</span>
                        <span>
                          {srcAcc && destAcc
                            ? `${srcAcc.name} → ${destAcc.name}`
                            : srcAcc?.name || destAcc?.name || "—"}
                          {personName && ` • ${personName}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* People Matches */}
          {(activeTab === "all" || activeTab === "people") && results.people.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Matching People ({results.people.length})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.people.map((p) => (
                  <Link
                    key={p.id}
                    href={`/people/${p.id}`}
                    className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs flex items-center justify-between hover:border-zinc-400 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</div>
                        {p.note && <div className="text-[11px] text-zinc-400">{p.note}</div>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Categories Matches */}
          {(activeTab === "all" || activeTab === "categories") && results.categories.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-zinc-500" />
                <span>Matching Categories ({results.categories.length})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {results.categories.map((c) => (
                  <Link
                    key={c.id}
                    href="/categories"
                    className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between hover:border-zinc-400 transition-all text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    <span>{c.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Accounts Matches */}
          {(activeTab === "all" || activeTab === "accounts") && results.accounts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-zinc-500" />
                <span>Matching Accounts ({results.accounts.length})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.accounts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/accounts/${a.id}`}
                    className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs flex items-center justify-between hover:border-zinc-400 transition-all text-xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{a.name}</div>
                      <div className="text-[11px] text-zinc-400 capitalize">{a.type} • {a.currency}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
