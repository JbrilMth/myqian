"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  createTransaction,
  updateTransaction,
  type TransactionInput,
} from "@/actions/transactions";
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
  TransactionType,
  PaymentChannel,
  PersonTransferType,
} from "@/lib/finance/types";
import type { TransactionInitialValues } from "@/components/layout/AppShell";
import { formatCurrency } from "@/lib/finance/decimal";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import { cn } from "@/lib/utils";
import { ArrowRight, Users, Building2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { CategorySelector } from "@/components/categories/CategorySelector";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountWithBalance[];
  categories: CategoryWithChildren[];
  people: PersonWithBalance[];
  editTransaction?: any | null;
  initialValues?: TransactionInitialValues | null;
  onSuccess?: () => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  accounts,
  categories,
  people,
  editTransaction,
  initialValues,
  onSuccess,
}: TransactionModalProps) {
  const [currentCategories, setCurrentCategories] = useState<CategoryWithChildren[]>(categories);

  useEffect(() => {
    setCurrentCategories(categories);
  }, [categories]);

  const [type, setType] = useState<TransactionType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [time, setTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [childCategoryId, setChildCategoryId] = useState("");

  // Payment channel & funding
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("wechat");
  const [fundingSelection, setFundingSelection] = useState<"balance" | "icbc" | "custom">("balance");
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState("");
  const [selectedDestAccountId, setSelectedDestAccountId] = useState("");

  // Dual amounts for withdrawal / cross-currency
  const [sourceAmount, setSourceAmount] = useState("");
  const [destinationAmount, setDestinationAmount] = useState("");

  // People & Transfer State: Direction & 2-Action Model
  const [transferTarget, setTransferTarget] = useState<"account" | "person">("account");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [direction, setDirection] = useState<"me_to_them" | "them_to_me">("me_to_them");
  const [personTransferType, setPersonTransferType] = useState<PersonTransferType>("send_with_return");

  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper lookups for common accounts
  const wechatAccount = accounts.find(
    (a) => a.name.toLowerCase().includes("wechat") || a.name.includes("微信")
  );
  const alipayAccount = accounts.find(
    (a) => a.name.toLowerCase().includes("alipay") || a.name.includes("支付宝")
  );
  const icbcAccount = accounts.find(
    (a) => a.name.toLowerCase().includes("icbc") || a.name.includes("工商")
  );
  const cashAccount = accounts.find(
    (a) =>
      a.type === "cash" ||
      a.name.toLowerCase().includes("cash") ||
      a.name.includes("现金")
  );

  const prevIsOpenRef = React.useRef(false);
  const prevEditTxIdRef = React.useRef<string | null>(null);

  // Prepopulate ONLY on modal open or when switching edit record
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const editTxId = editTransaction?.id || null;
    const isDifferentEditTx = editTransaction && editTxId !== prevEditTxIdRef.current;

    if (isOpening || isDifferentEditTx) {
      if (editTransaction) {
        setType(editTransaction.type);
        setTitle(editTransaction.title || "");
        setDate(editTransaction.transactionDate || new Date().toISOString().split("T")[0]);
        setTime(editTransaction.transactionTime || "");
        setParentCategoryId(editTransaction.parentCategoryId || "");
        setChildCategoryId(editTransaction.childCategoryId || "");
        setPaymentChannel(editTransaction.paymentChannel || "wechat");
        setSelectedSourceAccountId(editTransaction.sourceAccountId || "");
        setSelectedDestAccountId(editTransaction.destinationAccountId || "");
        setSourceAmount(editTransaction.sourceAmount || "");
        setDestinationAmount(editTransaction.destinationAmount || "");
        setAmount(
          editTransaction.sourceAmount || editTransaction.destinationAmount || ""
        );
        setSelectedPersonId(editTransaction.personId || "");
        
        const pType = (editTransaction.personTransferType as PersonTransferType) || "send_with_return";
        setPersonTransferType(pType);
        
        if (
          pType === "receive_with_return" ||
          pType === "receive_without_return" ||
          pType === "borrow" ||
          pType === "repayment_from_person" ||
          pType === "receive"
        ) {
          setDirection("them_to_me");
        } else {
          setDirection("me_to_them");
        }

        setTransferTarget(editTransaction.personId ? "person" : "account");
        setNote(editTransaction.note || "");
        setError(null);
      } else if (initialValues) {
        setType(initialValues.type || "transfer");
        setTitle(initialValues.title || "");
        setAmount(initialValues.amount || "");
        setDate(new Date().toISOString().split("T")[0]);
        setTime(new Date().toTimeString().slice(0, 5));
        setParentCategoryId("");
        setChildCategoryId("");
        setPaymentChannel("wechat");
        setFundingSelection("balance");
        setSelectedSourceAccountId(initialValues.sourceAccountId || icbcAccount?.id || accounts[0]?.id || "");
        setSelectedDestAccountId(initialValues.destinationAccountId || icbcAccount?.id || accounts[0]?.id || "");
        setSourceAmount("");
        setDestinationAmount("");
        
        if (initialValues.personId) {
          setTransferTarget("person");
          setSelectedPersonId(initialValues.personId);
        } else {
          setTransferTarget("account");
          setSelectedPersonId(people[0]?.id || "");
        }

        if (initialValues.personTransferType) {
          setPersonTransferType(initialValues.personTransferType);
          if (
            initialValues.personTransferType === "receive_with_return" ||
            initialValues.personTransferType === "receive_without_return" ||
            initialValues.personTransferType === "borrow" ||
            initialValues.personTransferType === "repayment_from_person" ||
            initialValues.personTransferType === "receive"
          ) {
            setDirection("them_to_me");
          } else {
            setDirection("me_to_them");
          }
        } else if (initialValues.relationship === "i_owe_them") {
          setDirection("them_to_me");
          setPersonTransferType("receive_with_return");
        } else {
          setDirection("me_to_them");
          setPersonTransferType("send_with_return");
        }

        setNote("");
        setError(null);
      } else {
        // Fresh Add Transaction
        setType("expense");
        setTitle("");
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        setTime(new Date().toTimeString().slice(0, 5));
        setParentCategoryId("");
        setChildCategoryId("");
        setPaymentChannel("wechat");
        setFundingSelection("balance");
        setSelectedSourceAccountId(wechatAccount?.id || accounts[0]?.id || "");
        setSelectedDestAccountId(accounts[1]?.id || accounts[0]?.id || "");
        setSourceAmount("");
        setDestinationAmount("");
        setSelectedPersonId(people[0]?.id || "");
        setDirection("me_to_them");
        setPersonTransferType("send_with_return");
        setTransferTarget("account");
        setNote("");
        setError(null);
      }
    }

    prevIsOpenRef.current = isOpen;
    prevEditTxIdRef.current = editTransaction?.id || null;
  }, [isOpen, editTransaction, initialValues]);

  const handlePaymentChannelChange = (ch: PaymentChannel) => {
    setPaymentChannel(ch);
    if (ch === "wechat") {
      setSelectedSourceAccountId(fundingSelection === "icbc" ? (icbcAccount?.id || accounts[0]?.id || "") : (wechatAccount?.id || accounts[0]?.id || ""));
    } else if (ch === "alipay") {
      setSelectedSourceAccountId(fundingSelection === "icbc" ? (icbcAccount?.id || accounts[0]?.id || "") : (alipayAccount?.id || accounts[0]?.id || ""));
    } else if (ch === "cash") {
      setSelectedSourceAccountId(cashAccount?.id || accounts[0]?.id || "");
    }
  };

  const handleFundingSelectionChange = (fs: "balance" | "icbc" | "custom") => {
    setFundingSelection(fs);
    if (paymentChannel === "wechat") {
      setSelectedSourceAccountId(fs === "icbc" ? (icbcAccount?.id || accounts[0]?.id || "") : (wechatAccount?.id || accounts[0]?.id || ""));
    } else if (paymentChannel === "alipay") {
      setSelectedSourceAccountId(fs === "icbc" ? (icbcAccount?.id || accounts[0]?.id || "") : (alipayAccount?.id || accounts[0]?.id || ""));
    }
  };

  // Category filter
  const selectedParentCategory = categories.find((c) => c.id === parentCategoryId);
  const childOptions = selectedParentCategory ? selectedParentCategory.children : [];

  // Selected person lookup
  const currentPerson = people.find((p) => p.id === selectedPersonId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let finalSourceAccountId: string | null = null;
      let finalDestAccountId: string | null = null;
      let finalSourceAmount: string | null = null;
      let finalDestAmount: string | null = null;
      let finalPersonId: string | null = null;
      let finalPersonType: PersonTransferType | null = null;

      switch (type) {
        case "expense": {
          finalSourceAccountId = selectedSourceAccountId;
          finalSourceAmount = amount;
          break;
        }
        case "income": {
          finalDestAccountId = selectedDestAccountId;
          finalDestAmount = amount;
          if (selectedPersonId) {
            finalPersonId = selectedPersonId;
            finalPersonType = personTransferType || "receive_with_return";
          }
          break;
        }
        case "transfer": {
          if (transferTarget === "person") {
            finalPersonId = selectedPersonId;
            finalPersonType = personTransferType;

            if (direction === "me_to_them") {
              finalSourceAccountId = selectedSourceAccountId;
              finalSourceAmount = amount;
              finalDestAccountId = null;
              finalDestAmount = null;
            } else {
              finalSourceAccountId = null;
              finalSourceAmount = null;
              finalDestAccountId = selectedDestAccountId;
              finalDestAmount = amount;
            }
          } else {
            finalSourceAccountId = selectedSourceAccountId;
            finalSourceAmount = amount;
            finalDestAccountId = selectedDestAccountId;
            finalDestAmount = amount;
          }
          break;
        }
        case "withdrawal": {
          finalSourceAccountId = selectedSourceAccountId;
          finalSourceAmount = sourceAmount || amount;
          finalDestAccountId = cashAccount?.id || selectedDestAccountId;
          finalDestAmount = destinationAmount;
          break;
        }
        case "deposit": {
          finalSourceAccountId = cashAccount?.id || selectedSourceAccountId;
          finalSourceAmount = sourceAmount || amount;
          finalDestAccountId = selectedDestAccountId;
          finalDestAmount = destinationAmount || amount;
          break;
        }
        case "top_up": {
          finalSourceAccountId = selectedSourceAccountId;
          finalSourceAmount = amount;
          finalDestAccountId = selectedDestAccountId;
          finalDestAmount = amount;
          break;
        }
      }

      let computedTitle = title.trim();
      if (!computedTitle) {
        if (type === "transfer" && transferTarget === "person" && currentPerson) {
          if (personTransferType === "send_with_return" || personTransferType === "lend" || personTransferType === "repay_to_person") {
            computedTitle = `Sent to ${currentPerson.name} (with return)`;
          } else if (personTransferType === "send_without_return" || personTransferType === "send") {
            computedTitle = `Sent to ${currentPerson.name} (gift)`;
          } else if (personTransferType === "receive_with_return" || personTransferType === "borrow" || personTransferType === "repayment_from_person") {
            computedTitle = `Received from ${currentPerson.name} (with return)`;
          } else if (personTransferType === "receive_without_return" || personTransferType === "receive") {
            computedTitle = `Received from ${currentPerson.name} (gift)`;
          } else {
            computedTitle = `Transfer with ${currentPerson.name}`;
          }
        } else {
          computedTitle = type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
        }
      }

      const payload: TransactionInput = {
        type,
        title: computedTitle,
        transactionDate: date,
        transactionTime: time,
        parentCategoryId: parentCategoryId || null,
        childCategoryId: childCategoryId || null,
        sourceAccountId: finalSourceAccountId,
        sourceAmount: finalSourceAmount,
        destinationAccountId: finalDestAccountId,
        destinationAmount: finalDestAmount,
        paymentChannel: type === "expense" ? paymentChannel : null,
        personId: finalPersonId,
        personTransferType: finalPersonType,
        note: note || null,
      };

      const res = editTransaction
        ? await updateTransaction(editTransaction.id, payload)
        : await createTransaction(payload);

      if (!res.success) {
        setError(res.error || "Failed to save transaction.");
      } else {
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const transactionTypes: { label: string; value: TransactionType }[] = [
    { label: "Expense", value: "expense" },
    { label: "Income", value: "income" },
    { label: "Transfer", value: "transfer" },
    { label: "Withdrawal", value: "withdrawal" },
    { label: "Deposit", value: "deposit" },
    { label: "Top Up", value: "top_up" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTransaction ? "Edit Transaction" : "Add Transaction"}
      description="Record a financial movement into your ledger."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900 leading-relaxed font-medium">
            {error}
          </div>
        )}

        {/* Transaction Type Selector (Touch Friendly) */}
        {!editTransaction && (
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
              {transactionTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "py-2 sm:py-1.5 px-2 text-xs font-medium rounded-lg text-center transition-all min-h-[36px] flex items-center justify-center",
                    type === t.value
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-xs font-bold"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Single Amount (Numeric Keypad Optimized for Mobile) */}
        {type !== "withdrawal" && type !== "deposit" && (
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-3 sm:py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xl sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-400"
              />
            </div>
          </div>
        )}

        {/* Dual Amounts for Cross-Currency Withdrawal */}
        {type === "withdrawal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Amount Deducted
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
                value={sourceAmount}
                onChange={(e) => setSourceAmount(e.target.value)}
                placeholder="500.00"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Cash Received (CNY)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
                value={destinationAmount}
                onChange={(e) => setDestinationAmount(e.target.value)}
                placeholder="105.00"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
              />
            </div>
          </div>
        )}

        {/* Dual / Cash Amount for Deposit */}
        {type === "deposit" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Cash Deducted (CNY)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
                value={sourceAmount}
                onChange={(e) => {
                  setSourceAmount(e.target.value);
                  if (!destinationAmount) setDestinationAmount(e.target.value);
                }}
                placeholder="105.00"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Amount Deposited (CNY)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
                value={destinationAmount}
                onChange={(e) => setDestinationAmount(e.target.value)}
                placeholder="105.00"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Title / Description
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "expense"
                ? "e.g. Lunch, Groceries, Metro"
                : type === "income"
                ? "e.g. August Salary"
                : type === "transfer" && transferTarget === "person" && currentPerson
                ? direction === "me_to_them"
                  ? `e.g. Sent to ${currentPerson.name}`
                  : `e.g. Received from ${currentPerson.name}`
                : "e.g. Account Movement"
            }
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm"
          />
        </div>

        {/* EXPENSE SPECIFIC: Payment Source Hierarchy with Identity Dots */}
        {type === "expense" && (
          <div className="p-3 sm:p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-3">
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Payment Source
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "wechat", label: "WeChat", dot: "bg-emerald-500" },
                { id: "alipay", label: "Alipay", dot: "bg-sky-500" },
                { id: "cash", label: "Cash", dot: "bg-zinc-500" },
                { id: "direct", label: "Direct/Card", dot: "bg-zinc-400" },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handlePaymentChannelChange(ch.id as PaymentChannel)}
                  className={cn(
                    "py-2 px-2.5 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1.5 min-h-[38px]",
                    paymentChannel === ch.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs font-bold"
                      : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", ch.dot)} />
                  <span>{ch.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-selection for WeChat */}
            {paymentChannel === "wechat" && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-[11px] text-zinc-500">Funding source:</span>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleFundingSelectionChange("balance")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border text-center font-medium",
                      fundingSelection === "balance"
                        ? "bg-zinc-900 text-white border-transparent font-bold"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    Balance ({wechatAccount ? formatCurrency(wechatAccount.currentBalance, "CNY") : "¥0.00"})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFundingSelectionChange("icbc")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border text-center font-medium",
                      fundingSelection === "icbc"
                        ? "bg-zinc-900 text-white border-transparent font-bold"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    ICBC ({icbcAccount ? formatCurrency(icbcAccount.currentBalance, "CNY") : "¥0.00"})
                  </button>
                </div>
              </div>
            )}

            {/* Sub-selection for Alipay */}
            {paymentChannel === "alipay" && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-[11px] text-zinc-500">Funding source:</span>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleFundingSelectionChange("balance")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border text-center font-medium",
                      fundingSelection === "balance"
                        ? "bg-zinc-900 text-white border-transparent font-bold"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    Balance ({alipayAccount ? formatCurrency(alipayAccount.currentBalance, "CNY") : "¥0.00"})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFundingSelectionChange("icbc")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border text-center font-medium",
                      fundingSelection === "icbc"
                        ? "bg-zinc-900 text-white border-transparent font-bold"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    ICBC ({icbcAccount ? formatCurrency(icbcAccount.currentBalance, "CNY") : "¥0.00"})
                  </button>
                </div>
              </div>
            )}

            {/* Direct/Card Account Selector */}
            {paymentChannel === "direct" && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <select
                  value={selectedSourceAccountId}
                  onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* INCOME SPECIFIC: Destination Account */}
        {type === "income" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Destination Account
              </label>
              <select
                required
                value={selectedDestAccountId}
                onChange={(e) => setSelectedDestAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
              >
                <option value="">Select destination account...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Received from Person (Optional)
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
              >
                <option value="">None (Standard Income)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* TRANSFER SPECIFIC: Account vs Person */}
        {type === "transfer" && (
          <div className="space-y-3.5 p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Transfer Recipient
              </label>
              <div className="flex gap-1 bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTransferTarget("account")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all",
                    transferTarget === "account"
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-xs font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransferTarget("person")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all",
                    transferTarget === "person"
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-xs font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Person</span>
                </button>
              </div>
            </div>

            {/* INTERNAL ACCOUNT TRANSFER */}
            {transferTarget === "account" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    Source Account
                  </label>
                  <select
                    required
                    value={selectedSourceAccountId}
                    onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                  >
                    <option value="">Select source account...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    Destination Account
                  </label>
                  <select
                    required
                    value={selectedDestAccountId}
                    onChange={(e) => setSelectedDestAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                  >
                    <option value="">Select destination...</option>
                    {accounts
                      .filter((a) => a.id !== selectedSourceAccountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* SIMPLIFIED PERSON TRANSFER */}
            {transferTarget === "person" && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Select Person
                  </label>
                  <select
                    required
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                  >
                    <option value="">Select person...</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Direction
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDirection("me_to_them");
                        setPersonTransferType("send_with_return");
                      }}
                      className={cn(
                        "py-2.5 px-3 text-xs font-medium rounded-xl border text-left flex items-center justify-between transition-all",
                        direction === "me_to_them"
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs font-bold"
                          : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                      )}
                    >
                      <span>Money from me → {currentPerson ? currentPerson.name : "them"}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDirection("them_to_me");
                        setPersonTransferType("receive_with_return");
                      }}
                      className={cn(
                        "py-2.5 px-3 text-xs font-medium rounded-xl border text-left flex items-center justify-between transition-all",
                        direction === "them_to_me"
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs font-bold"
                          : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                      )}
                    >
                      <span>Money from {currentPerson ? currentPerson.name : "them"} → me</span>
                      <ArrowDownLeft className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Action
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {direction === "me_to_them" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPersonTransferType("send_with_return")}
                          className={cn(
                            "py-2.5 px-3 text-xs rounded-xl border text-left transition-all flex flex-col",
                            personTransferType === "send_with_return" || personTransferType === "lend" || personTransferType === "repay_to_person"
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-bold shadow-2xs"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                          )}
                        >
                          <span className="font-semibold">Send with return</span>
                          <span className="text-[10px] font-normal opacity-75 mt-0.5">
                            They owe me (or settles what I owe)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPersonTransferType("send_without_return")}
                          className={cn(
                            "py-2.5 px-3 text-xs rounded-xl border text-left transition-all flex flex-col",
                            personTransferType === "send_without_return" || personTransferType === "send"
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-bold shadow-2xs"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                          )}
                        >
                          <span className="font-semibold">Send without return</span>
                          <span className="text-[10px] font-normal opacity-75 mt-0.5">
                            Gift / no debt created
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setPersonTransferType("receive_with_return")}
                          className={cn(
                            "py-2.5 px-3 text-xs rounded-xl border text-left transition-all flex flex-col",
                            personTransferType === "receive_with_return" || personTransferType === "borrow" || personTransferType === "repayment_from_person"
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-bold shadow-2xs"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                          )}
                        >
                          <span className="font-semibold">Receive with return</span>
                          <span className="text-[10px] font-normal opacity-75 mt-0.5">
                            I owe them (or settles what they owe)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPersonTransferType("receive_without_return")}
                          className={cn(
                            "py-2.5 px-3 text-xs rounded-xl border text-left transition-all flex flex-col",
                            personTransferType === "receive_without_return" || personTransferType === "receive"
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-bold shadow-2xs"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                          )}
                        >
                          <span className="font-semibold">Receive without return</span>
                          <span className="text-[10px] font-normal opacity-75 mt-0.5">
                            Gift / no debt created
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {direction === "them_to_me" ? (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Destination / Receiving Account
                    </label>
                    <select
                      required
                      value={selectedDestAccountId}
                      onChange={(e) => setSelectedDestAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                    >
                      <option value="">Select destination account...</option>
                      {accounts.map((acc) => {
                        const id = getAccountIdentity(acc.name, acc.type);
                        return (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.currency} • Current: {formatCurrency(acc.currentBalance, acc.currency)})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Source / Funding Account
                    </label>
                    <select
                      required
                      value={selectedSourceAccountId}
                      onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                    >
                      <option value="">Select funding account...</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency} • Balance: {formatCurrency(acc.currentBalance, acc.currency)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WITHDRAWAL SPECIFIC */}
        {type === "withdrawal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                From Account (e.g. CIH)
              </label>
              <select
                required
                value={selectedSourceAccountId}
                onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
              >
                <option value="">Select source account...</option>
                {accounts
                  .filter((a) => a.type !== "cash")
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                To Cash Account
              </label>
              <input
                type="text"
                disabled
                value={cashAccount ? `${cashAccount.name} (${cashAccount.currency})` : "Cash (CNY)"}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-600 font-medium"
              />
            </div>
          </div>
        )}

        {/* DEPOSIT SPECIFIC */}
        {type === "deposit" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                From Cash
              </label>
              <input
                type="text"
                disabled
                value={cashAccount ? `${cashAccount.name} (${cashAccount.currency})` : "Cash (CNY)"}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                To Bank Account (e.g. ICBC)
              </label>
              <select
                required
                value={selectedDestAccountId}
                onChange={(e) => setSelectedDestAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
              >
                <option value="">Select destination bank...</option>
                {accounts
                  .filter((a) => a.type !== "cash")
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* TOP UP SPECIFIC */}
        {type === "top_up" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Funding Account (e.g. ICBC)
              </label>
              <select
                required
                value={selectedSourceAccountId}
                onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
              >
                <option value="">Select funding bank...</option>
                {accounts
                  .filter((a) => a.type === "bank" || a.currency === "CNY")
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                E-Wallet Destination
              </label>
              <select
                required
                value={selectedDestAccountId}
                onChange={(e) => setSelectedDestAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
              >
                <option value="">Select destination...</option>
                {accounts
                  .filter(
                    (a) =>
                      a.type === "e_wallet" ||
                      a.name.toLowerCase().includes("wechat") ||
                      a.name.toLowerCase().includes("alipay") ||
                      a.name.includes("微信") ||
                      a.name.includes("支付宝")
                  )
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* CATEGORY SELECTOR */}
        {(type === "expense" || type === "income" || type === "transfer") && (
          <CategorySelector
            parentCategoryId={parentCategoryId}
            childCategoryId={childCategoryId}
            categories={currentCategories}
            onChange={(pId, cId) => {
              setParentCategoryId(pId);
              setChildCategoryId(cId);
            }}
            onCategoriesChange={(updated) => setCurrentCategories(updated)}
          />
        )}

        {/* DATE & TIME */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Time (Optional)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        {/* NOTE */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add memo or details..."
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
          />
        </div>

        {/* SUBMIT ACTIONS (Prominent & Thumb Friendly) */}
        <div className="sticky bottom-0 bg-white dark:bg-zinc-900 pt-3 pb-1 sm:pb-0 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/3 sm:w-auto px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-2/3 sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl shadow-xs transition-colors disabled:opacity-50 min-h-[42px]"
          >
            {isSubmitting
              ? "Saving..."
              : editTransaction
              ? "Save Changes"
              : "Record Transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
