import React from "react";
import {
  getAccountsWithBalances,
  getCategoriesTree,
  getPeopleWithBalances,
} from "@/lib/finance/service";
import { searchEverything } from "@/lib/finance/analysis";
import { SearchClient } from "@/components/tools/SearchClient";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = resolvedParams.q || "";

  const [initialResults, accounts, categories, people] = await Promise.all([
    searchEverything(query),
    getAccountsWithBalances(true),
    getCategoriesTree(true),
    getPeopleWithBalances(true),
  ]);

  return (
    <SearchClient
      initialResults={initialResults}
      accounts={accounts}
      categories={categories}
      people={people}
    />
  );
}
