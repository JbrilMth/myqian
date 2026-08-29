import React from "react";
import {
  getAccountsWithBalances,
  getCategoriesTree,
  getPeopleWithBalances,
} from "@/lib/finance/service";
import { getReportTransactions } from "@/lib/finance/reports";
import { ReportsClient } from "@/components/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [initialReportData, accounts, categories, people] = await Promise.all([
    getReportTransactions({ datePreset: "this_month" }),
    getAccountsWithBalances(true),
    getCategoriesTree(true),
    getPeopleWithBalances(true),
  ]);

  return (
    <ReportsClient
      initialReportData={initialReportData}
      accounts={accounts}
      categories={categories}
      people={people}
    />
  );
}
