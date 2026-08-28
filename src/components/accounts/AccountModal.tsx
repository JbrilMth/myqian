"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { createAccount, updateAccount } from "@/actions/accounts";
import type { AccountWithBalance } from "@/lib/finance/types";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: AccountWithBalance | null;
  onSuccess?: () => void;
}

export function AccountModal({
  isOpen,
  onClose,
  account,
  onSuccess,
}: AccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [currency, setCurrency] = useState("CNY");
  const [initialBalance, setInitialBalance] = useState("0.00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevIsOpenRef = React.useRef(false);
  const prevAccountIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const accountId = account?.id || null;
    const isDifferentAccount = account && accountId !== prevAccountIdRef.current;

    if (isOpening || isDifferentAccount) {
      if (account) {
        setName(account.name);
        setType(account.type);
        setCurrency(account.currency);
        setInitialBalance(account.initialBalance);
      } else {
        setName("");
        setType("bank");
        setCurrency("CNY");
        setInitialBalance("0.00");
      }
      setError(null);
    }

    prevIsOpenRef.current = isOpen;
    prevAccountIdRef.current = account?.id || null;
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (account) {
        const res = await updateAccount(account.id, {
          name,
          type,
          initialBalance,
        });
        if (!res.success) {
          setError(res.error || "Failed to update account.");
          return;
        }
      } else {
        const res = await createAccount({
          name,
          type,
          currency,
          initialBalance,
        });
        if (!res.success) {
          setError(res.error || "Failed to create account.");
          return;
        }
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={account ? "Edit Account" : "Create Account"}
      description="Accounts represent real places where your money exists (banks, wallets, cash)."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Account Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ICBC, WeChat Balance, CIH, Cash"
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
            >
              <option value="bank">Bank Card / Account</option>
              <option value="e_wallet">E-Wallet (WeChat / Alipay)</option>
              <option value="cash">Cash (Physical)</option>
              <option value="international_card">International Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Currency
            </label>
            <select
              disabled={!!account}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs disabled:opacity-60"
            >
              <option value="CNY">CNY (¥)</option>
              <option value="MAD">MAD</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Initial Balance
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-semibold"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Baseline starting amount at initial setup. Not recorded as income.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : account
              ? "Save Changes"
              : "Create Account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
