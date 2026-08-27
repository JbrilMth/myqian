import React from "react";
import { getExchangeRates } from "@/lib/finance/service";
import { getUserSecurityStatus } from "@/actions/auth";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [rates, securityStatus] = await Promise.all([
    getExchangeRates(),
    getUserSecurityStatus(),
  ]);

  return (
    <SettingsClient
      initialRates={rates}
      securityStatus={securityStatus}
    />
  );
}
