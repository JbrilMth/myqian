"use client";

import React, { createContext, useContext, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
  TransactionType,
  PersonTransferType,
} from "@/lib/finance/types";

export interface TransactionInitialValues {
  type?: TransactionType;
  personId?: string;
  personTransferType?: PersonTransferType;
  relationship?: "they_owe_me" | "i_owe_them";
  sourceAccountId?: string;
  destinationAccountId?: string;
  amount?: string;
  title?: string;
}

interface ModalContextType {
  openAddTransaction: (initialValues?: TransactionInitialValues) => void;
  openEditTransaction: (tx: any) => void;
}

const ModalContext = createContext<ModalContextType>({
  openAddTransaction: () => {},
  openEditTransaction: () => {},
});

export const useTransactionModal = () => useContext(ModalContext);

interface AppShellProps {
  children: React.ReactNode;
  accounts: AccountWithBalance[];
  categories: CategoryWithChildren[];
  people: PersonWithBalance[];
}

export function AppShell({
  children,
  accounts,
  categories,
  people,
}: AppShellProps) {
  const [shellCategories, setShellCategories] = useState<CategoryWithChildren[]>(categories);

  React.useEffect(() => {
    setShellCategories(categories);
  }, [categories]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [initialValues, setInitialValues] = useState<TransactionInitialValues | null>(null);

  const openAddTransaction = (initial?: TransactionInitialValues) => {
    setEditingTransaction(null);
    setInitialValues(initial || null);
    setIsModalOpen(true);
  };

  const openEditTransaction = (tx: any) => {
    setInitialValues(null);
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setInitialValues(null);
  };

  return (
    <ModalContext.Provider value={{ openAddTransaction, openEditTransaction }}>
      <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white">
        <Sidebar onOpenTransactionModal={() => openAddTransaction()} />

        <main className="flex-1 min-w-0 md:h-screen md:overflow-y-auto md:overscroll-contain p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-10">
          {children}
        </main>

        <MobileBottomNav onOpenTransactionModal={() => openAddTransaction()} />

        <TransactionModal
          isOpen={isModalOpen}
          onClose={handleClose}
          accounts={accounts}
          categories={shellCategories}
          people={people}
          editTransaction={editingTransaction}
          initialValues={initialValues}
        />
      </div>
    </ModalContext.Provider>
  );
}
