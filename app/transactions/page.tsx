import React from "react";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  getAccountsWithBalances,
  getCategoriesTree,
  getPeopleWithBalances,
} from "@/lib/finance/service";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [allTransactions, accounts, categories, people] = await Promise.all([
    db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt)),
    getAccountsWithBalances(true),
    getCategoriesTree(true),
    getPeopleWithBalances(true),
  ]);

  return (
    <TransactionsClient
      initialTransactions={allTransactions}
      accounts={accounts}
      categories={categories}
      people={people}
    />
  );
}
