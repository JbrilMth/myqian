import React from "react";
import { getAccountsWithBalances } from "@/lib/finance/service";
import { AccountsClient } from "@/components/accounts/AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await getAccountsWithBalances(true);
  return <AccountsClient initialAccounts={accounts} />;
}
