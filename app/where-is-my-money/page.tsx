import React from "react";
import { getWhereIsMyMoneyData } from "@/lib/finance/analysis";
import { WhereIsMyMoneyClient } from "@/components/analysis/WhereIsMyMoneyClient";

export const dynamic = "force-dynamic";

export default async function WhereIsMyMoneyPage() {
  const data = await getWhereIsMyMoneyData();

  return <WhereIsMyMoneyClient initialData={data} />;
}
