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
      name: "Accounts",
      href: "/accounts",
      icon: Wallet,
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: ArrowLeftRight,
    },
    {
      name: "People",
      href: "/people",
      icon: Users,
    },
  ];

  const moreTabs = [
    {
      name: "Reports & Export",
      href: "/reports",
      icon: FileSpreadsheet,
      desc: "Filter & export PDF / Excel financial statements",
    },
    {
      name: "Categories",
      href: "/categories",
      icon: FolderTree,
      desc: "Manage spending & income taxonomy",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      desc: "Theme, exchange rates & database",
    },
  ];

  const isTabActive = (tab: { href: string; exact?: boolean }) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  };

  const isMoreActive = moreTabs.some((t) => isTabActive(t));

  return (
    <>
      {/* Fixed Bottom Navigation Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/90 dark:border-zinc-800 safe-area-pb shadow-lg">
        <div className="grid grid-cols-5 items-center h-16 px-1">
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

          {/* Accounts */}
          <Link
            href="/accounts"
            onClick={() => setIsMoreOpen(false)}
            className={cn(
              "flex flex-col items-center justify-center h-full transition-colors",
              isTabActive(mainTabs[1])
                ? "text-zinc-950 dark:text-white font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <Wallet className="w-4 h-4 mb-1" />
            <span className="text-[10px] tracking-tight">Accounts</span>
          </Link>

          {/* Center Quick Add Action */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setIsMoreOpen(false);
                onOpenTransactionModal();
              }}
              className="w-11 h-11 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
              aria-label="Add transaction"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Transactions */}
          <Link
            href="/transactions"
            onClick={() => setIsMoreOpen(false)}
            className={cn(
              "flex flex-col items-center justify-center h-full transition-colors",
              isTabActive(mainTabs[2])
                ? "text-zinc-950 dark:text-white font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <ArrowLeftRight className="w-4 h-4 mb-1" />
            <span className="text-[10px] tracking-tight">Ledger</span>
          </Link>

          {/* More Menu Toggle */}
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

      {/* Slide-up "More" Sheet on Mobile */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-xs flex items-end animate-in fade-in duration-150"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="w-full bg-white dark:bg-zinc-900 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 p-5 pb-20 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Navigation & Tools
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* People */}
              <Link
                href="/people"
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isTabActive(mainTabs[3])
                    ? "bg-zinc-50 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 font-semibold"
                    : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50"
                )}
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    People & Debts
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Two-way financial relationships & repayments
                  </div>
                </div>
              </Link>

              {/* Reports & Export */}
              <Link
                href="/reports"
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isTabActive(moreTabs[0])
                    ? "bg-zinc-50 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 font-semibold"
                    : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50"
                )}
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Reports & Export
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Filter & export PDF / Excel statements
                  </div>
                </div>
              </Link>

              {/* Categories */}
              <Link
                href="/categories"
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isTabActive(moreTabs[1])
                    ? "bg-zinc-50 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 font-semibold"
                    : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50"
                )}
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Categories
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Parent & child spending taxonomy
                  </div>
                </div>
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isTabActive(moreTabs[2])
                    ? "bg-zinc-50 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 font-semibold"
                    : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50"
                )}
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Settings
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Appearance, exchange rates & database
                  </div>
                </div>
              </Link>
            </div>

            {/* Bottom Quick Controls */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
