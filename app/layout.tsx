import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
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
  let accounts: any[] = [];
  let categories: any[] = [];
  let people: any[] = [];

  try {
    [accounts, categories, people] = await Promise.all([
      getAccountsWithBalances(false),
      getCategoriesTree(false),
      getPeopleWithBalances(false),
    ]);
  } catch (e) {
    console.error("Failed to load initial shell data:", e);
  }

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans transition-colors duration-150">
        <ThemeProvider>
          <AppShell
            accounts={accounts}
            categories={categories}
            people={people}
          >
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
