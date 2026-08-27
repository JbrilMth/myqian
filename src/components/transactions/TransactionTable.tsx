"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { deleteTransaction } from "@/actions/transactions";
import { getAccountIdentity } from "@/lib/finance/account-identities";
import { Edit2, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionTableProps {
  transactions: any[];
  accountsMap?: Map<string, { name: string; currency: string; type?: string }>;
  categoriesMap?: Map<string, string>;
  peopleMap?: Map<string, string>;
  onEdit?: (tx: any) => void;
  onRefresh?: () => void;
}

export function TransactionTable({
  transactions,
  accountsMap = new Map(),
  categoriesMap = new Map(),
  peopleMap = new Map(),
  onEdit,
  onRefresh,
}: TransactionTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction? All associated account balances will be automatically recalculated.")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      onRefresh?.();
    } finally {
      setDeletingId(null);
    }
  };

  const isPersonOutgoing = (pType?: string | null) => {
    return (
      pType === "send_with_return" ||
      pType === "send_without_return" ||
      pType === "lend" ||
      pType === "repay_to_person" ||
      pType === "send"
    );
  };

  const getTypeBadge = (tx: any) => {
    if (tx.personId) {
      if (
        tx.personTransferType === "send_with_return" ||
        tx.personTransferType === "lend"
      ) {
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
      }
      if (
        tx.personTransferType === "receive_with_return" ||
        tx.personTransferType === "borrow"
      ) {
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
      }
      if (
        tx.personTransferType === "repayment_from_person" ||
        tx.personTransferType === "repay_to_person"
      ) {
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900";
      }
      return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }

    switch (tx.type) {
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
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const getTypeName = (tx: any) => {
    if (tx.personId) {
      if (tx.personTransferType === "send_with_return" || tx.personTransferType === "lend") return "Sent (Return)";
      if (tx.personTransferType === "send_without_return" || tx.personTransferType === "send") return "Sent (Gift)";
      if (tx.personTransferType === "receive_with_return" || tx.personTransferType === "borrow") return "Recv (Return)";
      if (tx.personTransferType === "receive_without_return" || tx.personTransferType === "receive") return "Recv (Gift)";
      if (tx.personTransferType === "repayment_from_person") return "Repayment In";
      if (tx.personTransferType === "repay_to_person") return "Repayment Out";
    }
    return tx.type.replace("_", " ");
  };

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500 border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/40">
        No transactions recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 1. MOBILE RESPONSIVE CARD LIST (< SM) */}
      <div className="sm:hidden space-y-2.5">
        {transactions.map((tx) => {
          const parentCat = tx.parentCategoryId ? categoriesMap.get(tx.parentCategoryId) : null;
          const childCat = tx.childCategoryId ? categoriesMap.get(tx.childCategoryId) : null;
          const person = tx.personId ? peopleMap.get(tx.personId) : null;
          const srcAcc = tx.sourceAccountId ? accountsMap.get(tx.sourceAccountId) : null;
          const destAcc = tx.destinationAccountId ? accountsMap.get(tx.destinationAccountId) : null;

          const srcIdentity = getAccountIdentity(srcAcc?.name, srcAcc?.type);
          const destIdentity = getAccountIdentity(destAcc?.name, destAcc?.type);

          return (
            <div
              key={tx.id}
              className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2.5"
            >
              {/* Top Row: Badge + Date + Amount */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border",
                      getTypeBadge(tx)
                    )}
                  >
                    {getTypeName(tx)}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {tx.transactionDate}
                  </span>
                </div>

                <div className="font-bold text-sm">
                  {tx.personId ? (
                    isPersonOutgoing(tx.personTransferType) ? (
                      <span className="text-zinc-900 dark:text-zinc-100">
                        -{formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                      </span>
                    )
                  ) : (
                    <>
                      {tx.type === "expense" && (
                        <span className="text-zinc-900 dark:text-zinc-100">
                          -{formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                        </span>
                      )}
                      {tx.type === "income" && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                        </span>
                      )}
                      {tx.type === "transfer" && (
                        <span className="text-zinc-800 dark:text-zinc-200">
                          {formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                        </span>
                      )}
                      {tx.type === "withdrawal" && (
                        <div className="text-right">
                          <span className="text-zinc-900 dark:text-zinc-100">
                            -{formatCurrency(tx.sourceAmount, tx.sourceCurrency || "MAD")}
                          </span>
                          <span className="text-[10px] text-zinc-400 block">
                            +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                          </span>
                        </div>
                      )}
                      {tx.type === "deposit" && (
                        <span className="text-zinc-900 dark:text-zinc-100">
                          +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                        </span>
                      )}
                      {tx.type === "top_up" && (
                        <span className="text-zinc-800 dark:text-zinc-200">
                          {formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Title & Category */}
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {tx.title}
                </h4>
                {parentCat && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {parentCat}
                    {childCat && <span> › {childCat}</span>}
                  </div>
                )}
                {tx.note && (
                  <p className="text-[10px] text-zinc-400 mt-0.5 italic">
                    {tx.note}
                  </p>
                )}
              </div>

              {/* Bottom Row: Account Movement & Action Buttons */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                {/* Movement */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tx.personId ? (
                    isPersonOutgoing(tx.personTransferType) ? (
                      <div className="flex items-center gap-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                        <span>{srcAcc?.name || "Account"}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{person || "Person"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{person || "Person"}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                        <span>{destAcc?.name || "Account"}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1">
                      {srcAcc && (
                        <>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                          <span>{srcAcc.name}</span>
                        </>
                      )}
                      {destAcc && (
                        <>
                          {srcAcc && <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />}
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                          <span>{destAcc.name}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Touch Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(tx)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. DESKTOP & TABLET STRUCTURED TABLE (>= SM) */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Movement / Direction</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {transactions.map((tx) => {
              const parentCat = tx.parentCategoryId ? categoriesMap.get(tx.parentCategoryId) : null;
              const childCat = tx.childCategoryId ? categoriesMap.get(tx.childCategoryId) : null;
              const person = tx.personId ? peopleMap.get(tx.personId) : null;
              const srcAcc = tx.sourceAccountId ? accountsMap.get(tx.sourceAccountId) : null;
              const destAcc = tx.destinationAccountId ? accountsMap.get(tx.destinationAccountId) : null;

              const srcIdentity = getAccountIdentity(srcAcc?.name, srcAcc?.type);
              const destIdentity = getAccountIdentity(destAcc?.name, destAcc?.type);

              return (
                <tr
                  key={tx.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Date & Time */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {tx.transactionDate}
                    </div>
                    {tx.transactionTime && (
                      <div className="text-[10px] text-zinc-400">{tx.transactionTime}</div>
                    )}
                  </td>

                  {/* Type Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border",
                        getTypeBadge(tx)
                      )}
                    >
                      {getTypeName(tx)}
                    </span>
                  </td>

                  {/* Title & Note */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {tx.title}
                    </div>
                    {tx.note && (
                      <div className="text-[10px] text-zinc-400 truncate max-w-xs">
                        {tx.note}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {parentCat ? (
                      <div className="text-zinc-700 dark:text-zinc-300">
                        <span>{parentCat}</span>
                        {childCat && (
                          <span className="text-zinc-400"> › {childCat}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>

                  {/* Movement / Direction */}
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {tx.personId ? (
                      <div className="flex items-center gap-1.5">
                        {isPersonOutgoing(tx.personTransferType) ? (
                          <>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                            <span>{srcAcc?.name || "Account"}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {person || "Person"}
                            </span>
                            {(tx.personTransferType === "send_with_return" || tx.personTransferType === "lend") && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                (with return)
                              </span>
                            )}
                            {(tx.personTransferType === "send_without_return" || tx.personTransferType === "send") && (
                              <span className="text-[10px] text-zinc-400">
                                (no return)
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {person || "Person"}
                            </span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                            <span>{destAcc?.name || "Account"}</span>
                            {(tx.personTransferType === "receive_with_return" || tx.personTransferType === "borrow") && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400">
                                (with return)
                              </span>
                            )}
                            {(tx.personTransferType === "receive_without_return" || tx.personTransferType === "receive") && (
                              <span className="text-[10px] text-zinc-400">
                                (no return)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {tx.type === "expense" && (
                          <div className="flex items-center gap-1.5">
                            {srcAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                            )}
                            {tx.paymentChannel && (
                              <span className="capitalize px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                                {tx.paymentChannel}
                              </span>
                            )}
                            <span>{srcAcc?.name || "Account"}</span>
                          </div>
                        )}

                        {tx.type === "income" && (
                          <div className="flex items-center gap-1.5">
                            {destAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                            )}
                            <span>{destAcc?.name || "Account"}</span>
                          </div>
                        )}

                        {tx.type === "transfer" && (
                          <div className="flex items-center gap-1.5">
                            {srcAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                            )}
                            <span>{srcAcc?.name || "Source"}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                            {destAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                            )}
                            <span>{destAcc?.name || "Dest"}</span>
                          </div>
                        )}

                        {tx.type === "withdrawal" && (
                          <div className="flex items-center gap-1.5">
                            {srcAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                            )}
                            <span>{srcAcc?.name || "Card"}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                            {destAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                            )}
                            <span>{destAcc?.name || "Cash"}</span>
                          </div>
                        )}

                        {tx.type === "deposit" && (
                          <div className="flex items-center gap-1.5">
                            {srcAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                            )}
                            <span>{srcAcc?.name || "Cash"}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                            {destAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                            )}
                            <span>{destAcc?.name || "Bank"}</span>
                          </div>
                        )}

                        {tx.type === "top_up" && (
                          <div className="flex items-center gap-1.5">
                            {srcAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", srcIdentity.dotColor)} />
                            )}
                            <span>{srcAcc?.name || "Bank"}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                            {destAcc && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", destIdentity.dotColor)} />
                            )}
                            <span>{destAcc?.name || "Wallet"}</span>
                          </div>
                        )}
                      </>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 whitespace-nowrap text-right font-bold">
                    {tx.personId ? (
                      isPersonOutgoing(tx.personTransferType) ? (
                        <span className="text-zinc-900 dark:text-zinc-100">
                          -{formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                        </span>
                      )
                    ) : (
                      <>
                        {tx.type === "expense" && (
                          <span className="text-zinc-900 dark:text-zinc-100">
                            -{formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                          </span>
                        )}
                        {tx.type === "income" && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                          </span>
                        )}
                        {tx.type === "transfer" && (
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                          </span>
                        )}
                        {tx.type === "withdrawal" && (
                          <div className="text-right">
                            <div className="text-zinc-900 dark:text-zinc-100">
                              -{formatCurrency(tx.sourceAmount, tx.sourceCurrency || "MAD")}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                            </div>
                          </div>
                        )}
                        {tx.type === "deposit" && (
                          <div className="text-right">
                            <div className="text-zinc-900 dark:text-zinc-100">
                              +{formatCurrency(tx.destinationAmount, tx.destinationCurrency || "CNY")}
                            </div>
                          </div>
                        )}
                        {tx.type === "top_up" && (
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {formatCurrency(tx.sourceAmount, tx.sourceCurrency || "CNY")}
                          </span>
                        )}
                      </>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(tx)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(tx.id)}
                        disabled={deletingId === tx.id}
                        className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
