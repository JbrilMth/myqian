"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/finance/decimal";
import { AccountModal } from "@/components/accounts/AccountModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleArchiveAccount } from "@/actions/accounts";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import type { AccountWithBalance } from "@/lib/finance/types";
import {
  Wallet,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountsClientProps {
  initialAccounts: AccountWithBalance[];
}

export function AccountsClient({ initialAccounts }: AccountsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithBalance | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const displayedAccounts = initialAccounts.filter(
    (a) => showArchived || !a.isArchived
  );

  // Group by currency
  const grouped: { [currency: string]: AccountWithBalance[] } = {};
  for (const acc of displayedAccounts) {
    const curr = acc.currency.toUpperCase();
    if (!grouped[curr]) grouped[curr] = [];
    grouped[curr].push(acc);
  }

  const handleEdit = (acc: AccountWithBalance, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedAccount(acc);
    setIsModalOpen(true);
  };

  const handleToggleArchive = async (acc: AccountWithBalance, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleArchiveAccount(acc.id, !acc.isArchived);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Accounts
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your bank accounts, digital balances, and cash reserves.
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
              setSelectedAccount(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {displayedAccounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-5 h-5" />}
          title="No accounts found"
          description="Create your first financial account (e.g. ICBC, WeChat Balance, Alipay, Cash, CIH, Attijari) to start tracking balances."
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedAccount(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Account
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([curr, accs]) => (
            <div key={curr} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {curr} Accounts ({accs.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {accs.map((acc) => {
                  const identity = getAccountIdentity(acc.name, acc.type);

                  return (
                    <Link
                      key={acc.id}
                      href={`/accounts/${acc.id}`}
                      className={cn(
                        "group p-4 rounded-xl bg-white dark:bg-zinc-900 border border-l-4 transition-all shadow-2xs flex flex-col justify-between",
                        identity.borderAccent,
                        acc.isArchived
                          ? "border-zinc-200 dark:border-zinc-800 opacity-60"
                          : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full shrink-0", identity.dotColor)} />
                              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                                {acc.name}
                              </h3>
                              {acc.isArchived && (
                                <span className="px-1.5 py-0.5 text-[9px] bg-zinc-100 text-zinc-500 rounded">
                                  Archived
                                </span>
                              )}
                            </div>
                            <span className="inline-block uppercase tracking-wider text-[10px] font-medium text-zinc-400 mt-0.5 ml-4">
                              {acc.type.replace("_", " ")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleEdit(acc, e)}
                              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Edit account"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleToggleArchive(acc, e)}
                              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title={acc.isArchived ? "Unarchive account" : "Archive account"}
                            >
                              {acc.isArchived ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                          <span>Initial Balance:</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(acc.initialBalance, acc.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-baseline justify-between">
                        <span className="text-[11px] text-zinc-400">Current Balance</span>
                        <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {formatCurrency(acc.currentBalance, acc.currency)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={selectedAccount}
      />
    </div>
  );
}
