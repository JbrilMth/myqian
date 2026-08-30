"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Plus,
  MoreHorizontal,
  Users,
  FolderTree,
  Settings,
  FileSpreadsheet,
  PieChart,
  LineChart,
  History,
  CalendarDays,
  Calendar as CalendarIcon,
  Search,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenTransactionModal: () => void;
}

export function MobileBottomNav({ onOpenTransactionModal }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Ledger",
      href: "/transactions",
      icon: ArrowLeftRight,
    },
    {
      name: "People",
      href: "/people",
      icon: Users,
    },
  ];

  const moreGroups = [
    {
      label: "FINANCE",
      items: [
        {
          name: "Accounts",
          href: "/accounts",
          icon: Wallet,
          desc: "Balances & multi-currency wallets",
        },
        {
          name: "People & Debts",
          href: "/people",
          icon: Users,
          desc: "Two-way debt claims & settlements",
        },
        {
          name: "Categories",
          href: "/categories",
          icon: FolderTree,
          desc: "Parent & subcategory taxonomy",
        },
      ],
    },
    {
      label: "ANALYSIS",
      items: [
        {
          name: "Where Is My Money?",
          href: "/where-is-my-money",
          icon: PieChart,
          desc: "Current liquid distribution & claims",
        },
        {
          name: "Net Worth",
          href: "/net-worth",
          icon: LineChart,
          desc: "Overall wealth trajectory & charts",
        },
        {
          name: "Balance History",
          href: "/balance-history",
          icon: History,
          desc: "Account timelines & movement logs",
        },
        {
          name: "Monthly Review",
          href: "/monthly-review",
          icon: CalendarDays,
          desc: "Income, spending & month-over-month",
        },
        {
          name: "Calendar",
          href: "/calendar",
          icon: CalendarIcon,
          desc: "Daily cash flow & calendar ledger",
        },
      ],
    },
    {
      label: "TOOLS",
      items: [
        {
          name: "Search Everything",
          href: "/search",
          icon: Search,
          desc: "Find transactions, notes, people & tags",
        },
        {
          name: "Reports & Export",
          href: "/reports",
          icon: FileSpreadsheet,
          desc: "Filter & export PDF / Excel files",
        },
      ],
    },
    {
      label: "SETTINGS",
      items: [
        {
          name: "Settings & Security",
          href: "/settings",
          icon: Settings,
          desc: "Auto-Lock, rates, appearance & backup",
        },
      ],
    },
  ];

  const isTabActive = (tab: { href: string; exact?: boolean }) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  };

  const isMoreActive = moreGroups.some((g) =>
    g.items.some((item) => isTabActive(item) && !mainTabs.some((m) => m.href === item.href && isTabActive(m)))
  );

  return (
    <>
      {/* Fixed Bottom Navigation Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/90 dark:border-zinc-800 safe-area-pb shadow-lg">
        <div className="grid grid-cols-4 items-center h-16 px-2">
          {/* Dashboard */}
          <Link
            href="/"
            onClick={() => setIsMoreOpen(false)}
            className={cn(
              "flex flex-col items-center justify-center h-full transition-colors",
              isTabActive(mainTabs[0])
                ? "text-zinc-950 dark:text-white font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <LayoutDashboard className="w-4 h-4 mb-1" />
            <span className="text-[10px] tracking-tight">Dashboard</span>
          </Link>

          {/* Transactions / Ledger */}
          <Link
            href="/transactions"
            onClick={() => setIsMoreOpen(false)}
            className={cn(
              "flex flex-col items-center justify-center h-full transition-colors",
              isTabActive(mainTabs[1])
                ? "text-zinc-950 dark:text-white font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <ArrowLeftRight className="w-4 h-4 mb-1" />
            <span className="text-[10px] tracking-tight">Ledger</span>
          </Link>

          {/* People */}
          <Link
            href="/people"
            onClick={() => setIsMoreOpen(false)}
            className={cn(
              "flex flex-col items-center justify-center h-full transition-colors",
              isTabActive(mainTabs[2])
                ? "text-zinc-950 dark:text-white font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <Users className="w-4 h-4 mb-1" />
            <span className="text-[10px] tracking-tight">People</span>
          </Link>

          {/* More Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              "flex flex-col items-center justify-center h-full transition-colors",
              isMoreOpen || isMoreActive
                ? "text-zinc-950 dark:text-white font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <MoreHorizontal className="w-4 h-4 mb-1" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>
      </div>

      {/* Floating Action Button for Quick Add on Mobile (positioned comfortably above bottom nav) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <button
          type="button"
          onClick={() => {
            setIsMoreOpen(false);
            onOpenTransactionModal();
          }}
          className="w-12 h-12 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
          aria-label="Add transaction"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Slide-up "More" Sheet on Mobile */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-xs flex items-end animate-in fade-in duration-150"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800 p-5 pb-24 shadow-2xl space-y-5 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Navigation & Analysis
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Groups */}
            <div className="space-y-5">
              {moreGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                    {group.label}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {group.items.map((item) => {
                      const active = isTabActive(item);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                            active
                              ? "bg-zinc-50 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 font-semibold"
                              : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50"
                          )}
                        >
                          <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {item.desc}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Appearance Toggle */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-1">
              <span className="text-xs text-zinc-400 font-medium">Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
