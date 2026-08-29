"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import { fetchReportDataAction } from "@/actions/reports";
import { generateFinancialReportPDF } from "@/lib/export/pdfExport";
import { generateTransactionsExcel } from "@/lib/export/excelExport";
import {
  FileSpreadsheet,
  FileText,
  Search,
  RotateCcw,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
  TransactionType,
} from "@/lib/finance/types";
import type {
  DatePreset,
  ReportFilterOptions,
  ReportDataResult,
  CurrencySummary,
} from "@/lib/finance/reports";

interface ReportsClientProps {
  initialReportData: ReportDataResult;
  accounts: AccountWithBalance[];
  categories: CategoryWithChildren[];
  people: PersonWithBalance[];
}

export function ReportsClient({
  initialReportData,
  accounts,
  categories,
  people,
}: ReportsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [reportData, setReportData] = useState<ReportDataResult>(initialReportData);

  // Filters State
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategoryValue, setSelectedCategoryValue] = useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Maps for quick lookups
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

  // Fetch updated report data whenever filters change
  const applyFilters = (overrides: Partial<ReportFilterOptions> = {}) => {
    const filters: ReportFilterOptions = {
      datePreset,
      startDate: customStartDate || undefined,
      endDate: customEndDate || undefined,
      type: selectedType !== "all" ? (selectedType as TransactionType) : undefined,
      accountId: selectedAccountId !== "all" ? selectedAccountId : undefined,
      searchQuery: searchQuery.trim() || undefined,
      ...overrides,
    };

    // Parse category value
    const catVal = overrides.categoryId !== undefined ? overrides.categoryId : selectedCategoryValue;
    if (catVal && catVal !== "all") {
      if (catVal.startsWith("parent:")) {
        filters.parentCategoryId = catVal.replace("parent:", "");
      } else if (catVal.startsWith("child:")) {
        filters.childCategoryId = catVal.replace("child:", "");
      } else {
        filters.categoryId = catVal;
      }
    }

    startTransition(async () => {
      const res = await fetchReportDataAction(filters);
      if (res.success && res.data) {
        setReportData(res.data);
      }
    });
  };

  // Trigger filter change on date preset / inputs
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    applyFilters({ datePreset: preset });
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (datePreset === "custom") {
      applyFilters({ datePreset: "custom", startDate: start || undefined, endDate: end || undefined });
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    applyFilters({ type: type !== "all" ? (type as TransactionType) : undefined });
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategoryValue(val);
    applyFilters({ categoryId: val });
  };

  const handleAccountChange = (accId: string) => {
    setSelectedAccountId(accId);
    applyFilters({ accountId: accId !== "all" ? accId : undefined });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters({ searchQuery: query });
  };

  const handleResetFilters = () => {
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedType("all");
    setSelectedCategoryValue("all");
    setSelectedAccountId("all");
    setSearchQuery("");

    startTransition(async () => {
      const res = await fetchReportDataAction({ datePreset: "all" });
      if (res.success && res.data) {
        setReportData(res.data);
      }
    });
  };

  // Determine active filter names for export headers
  const activeCategoryName = useMemo(() => {
    if (selectedCategoryValue === "all") return "All Categories";
    if (selectedCategoryValue.startsWith("parent:")) {
      const pId = selectedCategoryValue.replace("parent:", "");
      return categoriesMap.get(pId) || "All Category";
    }
    if (selectedCategoryValue.startsWith("child:")) {
      const cId = selectedCategoryValue.replace("child:", "");
      return categoriesMap.get(cId) || "Child Category";
    }
    return "All Categories";
  }, [selectedCategoryValue, categoriesMap]);

  const activeAccountName = useMemo(() => {
    if (selectedAccountId === "all") return "All Accounts";
    return accountsMap.get(selectedAccountId)?.name || "All Accounts";
  }, [selectedAccountId, accountsMap]);

  // Export handlers
  const handleExportPDF = async () => {
    if (reportData.transactions.length === 0) return;
    setIsExportingPDF(true);
    try {
      generateFinancialReportPDF({
        transactions: reportData.transactions,
        summaryByCurrency: reportData.summaryByCurrency,
        totalCount: reportData.totalCount,
        dateRangeLabel: reportData.dateRangeLabel,
        appliedFilters: {
          type: selectedType !== "all" ? selectedType.replace("_", " ").toUpperCase() : "All",
          categoryName: activeCategoryName,
          accountName: activeAccountName,
          searchQuery: searchQuery.trim() || undefined,
        },
        accountsMap,
        categoriesMap,
        peopleMap,
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (reportData.transactions.length === 0) return;
    setIsExportingExcel(true);
    try {
      await generateTransactionsExcel({
        transactions: reportData.transactions,
        summaryByCurrency: reportData.summaryByCurrency,
        totalCount: reportData.totalCount,
        dateRangeLabel: reportData.dateRangeLabel,
        appliedFilters: {
          type: selectedType !== "all" ? selectedType.replace("_", " ").toUpperCase() : "All",
          categoryName: activeCategoryName,
          accountName: activeAccountName,
          searchQuery: searchQuery.trim() || undefined,
        },
        accountsMap,
        categoriesMap,
        peopleMap,
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const hasActiveFilters =
    datePreset !== "all" ||
    selectedType !== "all" ||
    selectedCategoryValue !== "all" ||
    selectedAccountId !== "all" ||
    searchQuery.trim() !== "";

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "expense":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900";
      case "income":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
      case "transfer":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
      case "withdrawal":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      case "deposit":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
      case "top_up":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & EXPORT ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Reports & Export
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Generate financial statements, apply multi-criteria filters, and export to PDF or Excel.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={reportData.transactions.length === 0 || isExportingPDF}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs",
              reportData.transactions.length > 0
                ? "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 cursor-pointer"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-800"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isExportingPDF ? "Generating PDF..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={reportData.transactions.length === 0 || isExportingExcel}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide border transition-all shadow-xs",
              reportData.transactions.length > 0
                ? "bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 cursor-pointer"
                : "bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingExcel ? "Exporting Excel..." : "Download Excel"}</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER CONTROLS PANEL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        {/* Date Presets Row */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Range</span>
            </label>
            <span className="text-xs text-zinc-500 font-medium">{reportData.dateRangeLabel}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All dates" },
              { id: "today", label: "Today" },
              { id: "this_week", label: "This week" },
              { id: "this_month", label: "This month" },
              { id: "last_month", label: "Last month" },
              { id: "custom", label: "Custom range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDatePresetChange(p.id as DatePreset)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  datePreset === p.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-2xs font-semibold"
                    : "bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers */}
          {datePreset === "custom" && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">From (Start Date)</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">To (End Date)</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* Dropdowns Row: Type, Category, Account */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {/* Transaction Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Transaction Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="deposit">Deposit</option>
              <option value="top_up">Top Up</option>
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Category
            </label>
            <select
              value={selectedCategoryValue}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
            >
              <option value="all">All Categories</option>
              {categories.map((parent) =>
                parent.children && parent.children.length > 0 ? (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={`parent:${parent.id}`}>{parent.name} (All)</option>
                    {parent.children.map((child) => (
                      <option key={child.id} value={`child:${child.id}`}>
                        &nbsp;&nbsp;{child.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={parent.id} value={`parent:${parent.id}`}>
                    {parent.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Account / Source Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Account / Source
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
            >
              <option value="all">All Accounts / Sources</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Clear Filters Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search transactions (Title, Description, Note)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. REPORT SUMMARY CARDS (STRICTLY GROUPED BY CURRENCY) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Report Summary
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {reportData.totalCount} {reportData.totalCount === 1 ? "transaction" : "transactions"} found
            </span>
          </div>
          {isPending && <span className="text-[11px] text-zinc-400 animate-pulse">Updating...</span>}
        </div>

        {Object.keys(reportData.summaryByCurrency).length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            0 transactions found for the selected criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(reportData.summaryByCurrency).map((item) => {
              const netNum = Number(item.net);
              return (
                <div
                  key={item.currency}
                  className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-bold tracking-wide text-zinc-900 dark:text-zinc-100">
                      {item.currency} Summary
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {item.count} {item.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Income */}
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span>Income</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                        +{formatCurrency(item.income, item.currency)}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span>Expenses</span>
                      </div>
                      <div className="text-xs font-bold text-red-600 dark:text-red-400 mt-0.5 truncate">
                        -{formatCurrency(item.expenses, item.currency)}
                      </div>
                    </div>

                    {/* Net */}
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                        <Scale className="w-3 h-3 text-zinc-500" />
                        <span>Net</span>
                      </div>
                      <div
                        className={cn(
                          "text-xs font-bold mt-0.5 truncate",
                          netNum > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : netNum < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-zinc-600 dark:text-zinc-300"
                        )}
                      >
                        {netNum > 0 ? "+" : ""}
                        {formatCurrency(item.net, item.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. LIVE MATCHING TRANSACTIONS LIST / TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Matching Transactions
          </h2>
          <span className="text-xs text-zinc-400">{reportData.transactions.length} displayed</span>
        </div>

        {reportData.transactions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No transactions found
            </p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Try adjusting your date range, type, category, account, or text search criteria.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table (>= SM) */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-400 font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-4">Title / Note</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Account / Source</th>
                    <th className="py-3 px-4">Person</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                  {reportData.transactions.map((tx) => {
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
                      <tr
                        key={tx.id}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {/* Date */}
                        <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                          {tx.transactionDate}
                          {tx.transactionTime && (
                            <span className="text-[10px] text-zinc-400 block font-normal">
                              {tx.transactionTime}
                            </span>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border",
                              getTypeBadgeClass(tx.type)
                            )}
                          >
                            {tx.type.replace("_", " ")}
                          </span>
                        </td>

                        {/* Title & Note */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <span className="text-zinc-900 dark:text-zinc-100 font-semibold block truncate">
                            {tx.title}
                          </span>
                          {tx.note && (
                            <span className="text-[11px] text-zinc-400 font-normal block truncate">
                              {tx.note}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {fullCat}
                        </td>

                        {/* Source / Destination */}
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {srcAcc && destAcc ? (
                            <span className="flex items-center gap-1.5">
                              <span>{srcAcc.name}</span>
                              <ArrowRight className="w-3 h-3 text-zinc-400" />
                              <span>{destAcc.name}</span>
                            </span>
                          ) : srcAcc ? (
                            srcAcc.name
                          ) : destAcc ? (
                            destAcc.name
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Person */}
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {personName || "—"}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                          <span
                            className={
                              tx.type === "expense"
                                ? "text-red-600 dark:text-red-400"
                                : tx.type === "income"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-zinc-900 dark:text-zinc-100"
                            }
                          >
                            {tx.type === "expense" ? `-${formatted}` : tx.type === "income" ? `+${formatted}` : formatted}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (< SM) */}
            <div className="sm:hidden space-y-2.5">
              {reportData.transactions.map((tx) => {
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
                    className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border",
                            getTypeBadgeClass(tx.type)
                          )}
                        >
                          {tx.type.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-zinc-400">{tx.transactionDate}</span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold",
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
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {tx.title}
                      </h3>
                      {tx.note && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">{tx.note}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{fullCat}</span>
                      <span>
                        {srcAcc && destAcc
                          ? `${srcAcc.name} → ${destAcc.name}`
                          : srcAcc?.name || destAcc?.name || "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 5. BOTTOM EXPORT BAR */}
      {reportData.transactions.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">
            Export ready for <span className="font-bold text-zinc-800 dark:text-zinc-200">{reportData.totalCount}</span> transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
