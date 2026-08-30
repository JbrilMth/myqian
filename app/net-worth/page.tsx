import React from "react";
import { getNetWorthData } from "@/lib/finance/analysis";
import { NetWorthClient } from "@/components/analysis/NetWorthClient";

export const dynamic = "force-dynamic";

export default async function NetWorthPage() {
  const data = await getNetWorthData("30d");

  return <NetWorthClient initialData={data} />;
}
