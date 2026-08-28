import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AutoLockProvider } from "@/components/auth/AutoLockProvider";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import { getUserSecurityStatus } from "@/actions/auth";
import {
  getAccountsWithBalances,
  getCategoriesTree,
  getPeopleWithBalances,
} from "@/lib/finance/service";

export const metadata: Metadata = {
  title: "My Qian — Personal Finance Management",
  description:
    "Clean, reliable multi-currency personal finance console with accurate ledger balances.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateSession();
  const locked = session ? await isAppLocked() : false;

  let accounts: any[] = [];
  let categories: any[] = [];
  let people: any[] = [];
  let securityStatus = {
    hasPasskey: false,
    autoLockTimeout: "never",
    email: "",
    isLocked: locked,
  };

  if (session) {
    try {
      if (!locked) {
        [accounts, categories, people, securityStatus] = await Promise.all([
          getAccountsWithBalances(false),
          getCategoriesTree(false),
          getPeopleWithBalances(false),
          getUserSecurityStatus(),
        ]);
      } else {
        securityStatus = await getUserSecurityStatus();
      }
    } catch (e) {
      console.error("Failed to load initial shell data:", e);
    }
  }

  const isActuallyLocked = locked || securityStatus.isLocked;

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans transition-colors duration-150">
        <ThemeProvider>
          {session ? (
            <AutoLockProvider
              userEmail={securityStatus.email || session.user.email}
              hasPasskeys={securityStatus.hasPasskey}
              autoLockTimeout={securityStatus.autoLockTimeout}
              initialLocked={isActuallyLocked}
            >
              <AppShell
                accounts={accounts}
                categories={categories}
                people={people}
              >
                {children}
              </AppShell>
            </AutoLockProvider>
          ) : (
            <main className="min-h-full flex flex-col">{children}</main>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
