import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getPeopleWithBalances,
  getAccountsWithBalances,
  getCategoriesTree,
} from "@/lib/finance/service";
import { PersonDetailClient } from "@/components/people/PersonDetailClient";

export const dynamic = "force-dynamic";

interface PersonDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const { id } = await params;
  const [allPeople, accounts, categories, personTx] = await Promise.all([
    getPeopleWithBalances(true),
    getAccountsWithBalances(true),
    getCategoriesTree(true),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.personId, id))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt)),
  ]);

  const person = allPeople.find((p) => p.id === id);
  if (!person) {
    notFound();
  }

  return (
    <PersonDetailClient
      person={person}
      transactions={personTx}
      accounts={accounts}
      categories={categories}
    />
  );
}
