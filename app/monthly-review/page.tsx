import React from "react";
import { getMonthlyReviewData } from "@/lib/finance/analysis";
import { MonthlyReviewClient } from "@/components/analysis/MonthlyReviewClient";

export const dynamic = "force-dynamic";

export default async function MonthlyReviewPage() {
  const data = await getMonthlyReviewData();

  return <MonthlyReviewClient initialData={data} />;
}
