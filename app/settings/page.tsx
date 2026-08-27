import React from "react";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { desc } from "drizzle-orm";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const rates = await db
    .select()
    .from(exchangeRates)
    .orderBy(desc(exchangeRates.updatedAt));

  return <SettingsClient initialRates={rates} />;
}
