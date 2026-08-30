import React from "react";
import { getAccountBalanceHistoryData } from "@/lib/finance/analysis";
import { BalanceHistoryClient } from "@/components/analysis/BalanceHistoryClient";

export const dynamic = "force-dynamic";

export default async function BalanceHistoryPage() {
  const data = await getAccountBalanceHistoryData(undefined, "30d");

  return <BalanceHistoryClient initialData={data} />;
}
