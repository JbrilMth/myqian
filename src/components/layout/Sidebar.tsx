"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  FolderTree,
  Users,
  Settings,
  Plus,
  FileSpreadsheet,
  PieChart,
  LineChart,
  History,
  CalendarDays,
  Calendar as CalendarIcon,
  Search,
  StickyNote,
  ClockCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface SidebarProps {
  onOpenTransactionModal?: () => void;
}

export function Sidebar({ onOpenTransactionModal }: SidebarProps) {
  const pathname = usePathname();

  const navGroups = [
    {
      label: "MY QIAN",
      items: [
        {
          name: "Dashboard",
          href: "/",
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      label: "FINANCE",
      items: [
        {
          name: "Transactions",
          href: "/transactions",
          icon: ArrowLeftRight,
        },
        {
          name: "Accounts",
          href: "/accounts",
          icon: Wallet,
        },
        {
          name: "People",
          href: "/people",
          icon: Users,
        },
        {
          name: "Categories",
          href: "/categories",
          icon: FolderTree,
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
        },
        {
          name: "Net Worth",
          href: "/net-worth",
          icon: LineChart,
        },
        {
          name: "Balance History",
          href: "/balance-history",
          icon: History,
        },
        {
          name: "Monthly Review",
          href: "/monthly-review",
          icon: CalendarDays,
        },
        {
          name: "Calendar",
          href: "/calendar",
          icon: CalendarIcon,
        },
      ],
    },
    {
      label: "TOOLS",
      items: [
        {
          name: "Attendance",
          href: "/attendance",
          icon: ClockCheck,
        },
        {
          name: "Notes",
          href: "/notes",
          icon: StickyNote,
        },
        {
          name: "Search",
          href: "/search",
          icon: Search,
        },
        {
          name: "Reports & Export",
          href: "/reports",
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      label: "SYSTEM",
      items: [
        {
          name: "Settings",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
  ];

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      {/* Mobile Top Navbar (Clean Brand & Theme Toggle) */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 dark:bg-white flex items-center justify-center text-white dark:text-zinc-950 font-bold text-xs shadow-2xs">
            钱
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              My Qian
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen bg-white dark:bg-zinc-900/50 border-r border-zinc-200/80 dark:border-zinc-800 select-none">
        {/* App Brand Header & Quick Add */}
        <div className="p-4 pb-2 space-y-4 shrink-0">
          <div className="flex items-center justify-between px-1 pt-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white flex items-center justify-center text-white dark:text-zinc-950 font-bold text-sm tracking-tight shadow-xs">
                钱
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  My Qian
                </h1>
                <p className="text-[10px] uppercase font-medium tracking-wider text-zinc-400">
                  Finance Console
                </p>
              </div>
            </Link>
          </div>

          {onOpenTransactionModal && (
            <div>
              <button
                type="button"
                onClick={onOpenTransactionModal}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Transaction</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Nav Links */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2 space-y-5">
          <nav className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group.label}
                </div>
                <div className="space-y-0.5 mt-1">
                  {group.items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                          active
                            ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800/80 dark:text-white font-semibold"
                            : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/40"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            active
                              ? "text-zinc-900 dark:text-white"
                              : "text-zinc-400 dark:text-zinc-500"
                          )}
                        />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
          <span>Console • v1.0</span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
