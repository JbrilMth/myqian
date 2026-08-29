import { db } from "@/db";
import {
  transactions,
  accounts,
  categories,
  people,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { Decimal, toDecimal, toFixed2 } from "./decimal";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import type { TransactionType } from "./types";

export type DatePreset =
  | "all"
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

export interface ReportFilterOptions {
  datePreset?: DatePreset;
  startDate?: string;
  endDate?: string;
  type?: string; // 'all' | TransactionType
  categoryId?: string; // 'all' | parentId or childId
  parentCategoryId?: string;
  childCategoryId?: string;
  accountId?: string; // 'all' | accountId
  searchQuery?: string;
}

export interface CurrencySummary {
  currency: string;
  income: string;
  expenses: string;
  transfers: string;
  net: string;
  count: number;
}

export interface ReportDataResult {
  transactions: any[];
  summaryByCurrency: { [currency: string]: CurrencySummary };
  totalCount: number;
  dateRangeLabel: string;
}

/**
 * Resolves Date Range dates based on preset
 */
export function resolveDateRange(
  preset: DatePreset = "all",
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string; label: string } {
  const now = new Date();

  // Helper to format Date as YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  switch (preset) {
    case "today": {
      const todayStr = formatYMD(now);
      return { startDate: todayStr, endDate: todayStr, label: "Today" };
    }
    case "this_week": {
      // Start of week (Monday)
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: formatYMD(monday),
        endDate: formatYMD(sunday),
        label: "This Week",
      };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatYMD(start),
        endDate: formatYMD(end),
        label: "This Month",
      };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: formatYMD(start),
        endDate: formatYMD(end),
        label: "Last Month",
      };
    }
    case "custom": {
      if (customStart && customEnd) {
        return {
          startDate: customStart,
          endDate: customEnd,
          label: `${customStart} to ${customEnd}`,
        };
      }
      if (customStart) {
        return {
          startDate: customStart,
          label: `From ${customStart}`,
        };
      }
      if (customEnd) {
        return {
          endDate: customEnd,
          label: `Until ${customEnd}`,
        };
      }
      return { label: "Custom Range" };
    }
    case "all":
    default:
      return { label: "All Dates" };
  }
}

/**
 * Fetches filtered transactions and computes currency-specific summaries
 */
export async function getReportTransactions(
  filters: ReportFilterOptions = {}
): Promise<ReportDataResult> {
  const locked = await isAppLocked();
  if (locked) {
    return {
      transactions: [],
      summaryByCurrency: {},
      totalCount: 0,
      dateRangeLabel: "Locked",
    };
  }

  const session = await validateSession();
  const userId = session?.user.id;
  if (!userId) {
    return {
      transactions: [],
      summaryByCurrency: {},
      totalCount: 0,
      dateRangeLabel: "Unauthorized",
    };
  }

  const { startDate, endDate, label: dateRangeLabel } = resolveDateRange(
    filters.datePreset,
    filters.startDate,
    filters.endDate
  );

  const whereConditions = [eq(transactions.userId, userId)];

  // 1. Date Range filtering
  if (startDate) {
    whereConditions.push(sql`${transactions.transactionDate} >= ${startDate}`);
  }
  if (endDate) {
    whereConditions.push(sql`${transactions.transactionDate} <= ${endDate}`);
  }

  // 2. Transaction Type filtering
  if (filters.type && filters.type !== "all") {
    whereConditions.push(eq(transactions.type, filters.type));
  }

  // 3. Category filtering (Hierarchy aware)
  if (filters.childCategoryId && filters.childCategoryId !== "all") {
    whereConditions.push(eq(transactions.childCategoryId, filters.childCategoryId));
  } else if (filters.parentCategoryId && filters.parentCategoryId !== "all") {
    // If a parent is selected, match transactions where parentCategoryId is parentId
    // or childCategoryId has parentId as its parent
    const childCats = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.parentId, filters.parentCategoryId)));

    const matchingCatIds = [filters.parentCategoryId, ...childCats.map((c) => c.id)];

    whereConditions.push(
      sql`(${transactions.parentCategoryId} IN ${matchingCatIds} OR ${transactions.childCategoryId} IN ${matchingCatIds})`
    );
  } else if (filters.categoryId && filters.categoryId !== "all") {
    // Check if categoryId is a parent or a child
    const cat = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, filters.categoryId)))
      .limit(1);

    if (cat.length > 0) {
      if (cat[0].parentId) {
        // It's a child category
        whereConditions.push(eq(transactions.childCategoryId, filters.categoryId));
      } else {
        // It's a parent category
        const childCats = await db
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.userId, userId), eq(categories.parentId, filters.categoryId)));

        const matchingCatIds = [filters.categoryId, ...childCats.map((c) => c.id)];
        whereConditions.push(
          sql`(${transactions.parentCategoryId} IN ${matchingCatIds} OR ${transactions.childCategoryId} IN ${matchingCatIds})`
        );
      }
    }
  }

  // 4. Account / Payment Source filtering
  if (filters.accountId && filters.accountId !== "all") {
    whereConditions.push(
      sql`(${transactions.sourceAccountId} = ${filters.accountId} OR ${transactions.destinationAccountId} = ${filters.accountId})`
    );
  }

  // 5. Text search across Title and Note (case-insensitive partial match)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const term = `%${filters.searchQuery.trim().toLowerCase()}%`;
    whereConditions.push(
      sql`(LOWER(${transactions.title}) LIKE ${term} OR LOWER(COALESCE(${transactions.note}, '')) LIKE ${term})`
    );
  }

  // Query transactions
  const txRows = await db
    .select()
    .from(transactions)
    .where(and(...whereConditions))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

  // Compute currency summaries
  const currencyMap: {
    [curr: string]: {
      income: Decimal;
      expenses: Decimal;
      transfers: Decimal;
      count: number;
    };
  } = {};

  for (const tx of txRows) {
    const curr = (tx.sourceCurrency || tx.destinationCurrency || "CNY").toUpperCase();
    if (!currencyMap[curr]) {
      currencyMap[curr] = {
        income: new Decimal(0),
        expenses: new Decimal(0),
        transfers: new Decimal(0),
        count: 0,
      };
    }

    currencyMap[curr].count += 1;

    const srcAmt = toDecimal(tx.sourceAmount || "0");
    const destAmt = toDecimal(tx.destinationAmount || tx.sourceAmount || "0");

    switch (tx.type) {
      case "expense":
        currencyMap[curr].expenses = currencyMap[curr].expenses.add(srcAmt);
        break;
      case "income":
        currencyMap[curr].income = currencyMap[curr].income.add(destAmt);
        break;
      case "transfer":
      case "withdrawal":
      case "deposit":
      case "top_up":
        currencyMap[curr].transfers = currencyMap[curr].transfers.add(srcAmt.gt(0) ? srcAmt : destAmt);
        break;
    }
  }

  const summaryByCurrency: { [currency: string]: CurrencySummary } = {};
  for (const [curr, stats] of Object.entries(currencyMap)) {
    const net = stats.income.sub(stats.expenses);
    summaryByCurrency[curr] = {
      currency: curr,
      income: toFixed2(stats.income),
      expenses: toFixed2(stats.expenses),
      transfers: toFixed2(stats.transfers),
      net: toFixed2(net),
      count: stats.count,
    };
  }

  return {
    transactions: txRows,
    summaryByCurrency,
    totalCount: txRows.length,
    dateRangeLabel,
  };
}
