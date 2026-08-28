import { db } from "@/db";
import {
  accounts,
  categories,
  people,
  transactions,
  exchangeRates,
} from "@/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { Decimal, toDecimal, toFixed2 } from "./decimal";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
  DashboardData,
  MonthlyFinancialSummary,
  TransactionType,
} from "./types";

/**
 * Helper to get current authenticated user ID if session is active and unlocked, or null
 */
async function getCurrentUserId(): Promise<string | null> {
  const locked = await isAppLocked();
  if (locked) return null;

  const session = await validateSession();
  return session?.user.id || null;
}

/**
 * Calculates current balances for all accounts deterministically for the current user:
 * Balance = initial_balance + sum(destination_amount) - sum(source_amount)
 */
export async function getAccountsWithBalances(includeArchived = false): Promise<AccountWithBalance[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const whereConditions = [eq(accounts.userId, userId)];
  if (!includeArchived) {
    whereConditions.push(eq(accounts.isArchived, false));
  }

  const allAccounts = await db
    .select()
    .from(accounts)
    .where(and(...whereConditions))
    .orderBy(accounts.currency, accounts.name);

  if (allAccounts.length === 0) {
    return [];
  }

  const allTx = await db
    .select({
      sourceAccountId: transactions.sourceAccountId,
      sourceAmount: transactions.sourceAmount,
      destinationAccountId: transactions.destinationAccountId,
      destinationAmount: transactions.destinationAmount,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  const incomingByAccount = new Map<string, Decimal>();
  const outgoingByAccount = new Map<string, Decimal>();

  for (const tx of allTx) {
    if (tx.destinationAccountId && tx.destinationAmount) {
      const current = incomingByAccount.get(tx.destinationAccountId) || new Decimal(0);
      incomingByAccount.set(
        tx.destinationAccountId,
        current.add(toDecimal(tx.destinationAmount))
      );
    }
    if (tx.sourceAccountId && tx.sourceAmount) {
      const current = outgoingByAccount.get(tx.sourceAccountId) || new Decimal(0);
      outgoingByAccount.set(
        tx.sourceAccountId,
        current.add(toDecimal(tx.sourceAmount))
      );
    }
  }

  return allAccounts.map((acc) => {
    const initial = toDecimal(acc.initialBalance);
    const incoming = incomingByAccount.get(acc.id) || new Decimal(0);
    const outgoing = outgoingByAccount.get(acc.id) || new Decimal(0);
    const current = initial.add(incoming).sub(outgoing);

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      initialBalance: acc.initialBalance,
      currentBalance: toFixed2(current),
      isArchived: acc.isArchived,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    };
  });
}

/**
 * Gets a single account with current balance, monthly metrics, and transaction history
 */
export async function getAccountDetails(accountId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { account: null, transactions: [] };

  const [acc] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!acc) {
    return { account: null, transactions: [] };
  }

  // Fetch all transactions involving this account
  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`(${transactions.sourceAccountId} = ${accountId} OR ${transactions.destinationAccountId} = ${accountId})`
      )
    )
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

  // Deterministic current balance calculation
  let incoming = new Decimal(0);
  let outgoing = new Decimal(0);

  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const monthlyStats = {
    income: new Decimal(0),
    expenses: new Decimal(0),
    withdrawals: new Decimal(0),
    deposits: new Decimal(0),
    topUps: new Decimal(0),
    transfersIn: new Decimal(0),
    transfersOut: new Decimal(0),
  };

  for (const tx of txs) {
    const isSource = tx.sourceAccountId === accountId;
    const isDest = tx.destinationAccountId === accountId;

    if (isDest && tx.destinationAmount) {
      incoming = incoming.add(toDecimal(tx.destinationAmount));
    }
    if (isSource && tx.sourceAmount) {
      outgoing = outgoing.add(toDecimal(tx.sourceAmount));
    }

    // Monthly activity metrics
    if (tx.transactionDate.startsWith(currentMonthStr)) {
      if (tx.type === "income" && isDest && tx.destinationAmount) {
        monthlyStats.income = monthlyStats.income.add(toDecimal(tx.destinationAmount));
      } else if (tx.type === "expense" && isSource && tx.sourceAmount) {
        monthlyStats.expenses = monthlyStats.expenses.add(toDecimal(tx.sourceAmount));
      } else if (tx.type === "withdrawal" && isSource && tx.sourceAmount) {
        monthlyStats.withdrawals = monthlyStats.withdrawals.add(toDecimal(tx.sourceAmount));
      } else if (tx.type === "deposit" && isDest && tx.destinationAmount) {
        monthlyStats.deposits = monthlyStats.deposits.add(toDecimal(tx.destinationAmount));
      } else if (tx.type === "top_up" && isDest && tx.destinationAmount) {
        monthlyStats.topUps = monthlyStats.topUps.add(toDecimal(tx.destinationAmount));
      } else if (tx.type === "transfer") {
        if (isDest && tx.destinationAmount) {
          monthlyStats.transfersIn = monthlyStats.transfersIn.add(toDecimal(tx.destinationAmount));
        }
        if (isSource && tx.sourceAmount) {
          monthlyStats.transfersOut = monthlyStats.transfersOut.add(toDecimal(tx.sourceAmount));
        }
      }
    }
  }

  const currentBalance = toDecimal(acc.initialBalance).add(incoming).sub(outgoing);

  const accountWithBalance: AccountWithBalance = {
    id: acc.id,
    name: acc.name,
    type: acc.type,
    currency: acc.currency,
    initialBalance: acc.initialBalance,
    currentBalance: toFixed2(currentBalance),
    isArchived: acc.isArchived,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
    monthlyStats: {
      income: toFixed2(monthlyStats.income),
      expenses: toFixed2(monthlyStats.expenses),
      withdrawals: toFixed2(monthlyStats.withdrawals),
      deposits: toFixed2(monthlyStats.deposits),
      topUps: toFixed2(monthlyStats.topUps),
      transfersIn: toFixed2(monthlyStats.transfersIn),
      transfersOut: toFixed2(monthlyStats.transfersOut),
    },
  };

  return {
    account: accountWithBalance,
    transactions: txs,
  };
}

/**
 * Calculates Dashboard statistics
 */
export async function getDashboardData(): Promise<DashboardData> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      totalMoneyByCurrency: {},
      exchangeRates: [],
      accounts: [],
      thisMonth: { month: new Date().toISOString().slice(0, 7), byCurrency: {} },
      recentTransactions: [],
    };
  }

  // 1. Total money grouped by currency across active accounts
  const accountsList = await getAccountsWithBalances(false);
  const totalMoneyByCurrency: { [currency: string]: string } = {};

  for (const acc of accountsList) {
    const curr = acc.currency.toUpperCase();
    const current = totalMoneyByCurrency[curr]
      ? toDecimal(totalMoneyByCurrency[curr])
      : new Decimal(0);
    totalMoneyByCurrency[curr] = toFixed2(current.add(toDecimal(acc.currentBalance)));
  }

  // 2. This month summary by currency
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

  const monthlyByCurrency: {
    [currency: string]: { income: Decimal; expenses: Decimal; transfers: Decimal };
  } = {};

  const ensureCurrency = (c: string) => {
    const curr = c.toUpperCase();
    if (!monthlyByCurrency[curr]) {
      monthlyByCurrency[curr] = {
        income: new Decimal(0),
        expenses: new Decimal(0),
        transfers: new Decimal(0),
      };
    }
    return curr;
  };

  for (const tx of allTx) {
    if (!tx.transactionDate.startsWith(currentMonthStr)) continue;

    if (tx.type === "expense") {
      const curr = ensureCurrency(tx.sourceCurrency || "CNY");
      monthlyByCurrency[curr].expenses = monthlyByCurrency[curr].expenses.add(
        toDecimal(tx.sourceAmount)
      );
    } else if (tx.type === "income") {
      const curr = ensureCurrency(tx.destinationCurrency || "CNY");
      monthlyByCurrency[curr].income = monthlyByCurrency[curr].income.add(
        toDecimal(tx.destinationAmount)
      );
    } else if (tx.type === "transfer") {
      const curr = ensureCurrency(tx.sourceCurrency || "CNY");
      monthlyByCurrency[curr].transfers = monthlyByCurrency[curr].transfers.add(
        toDecimal(tx.sourceAmount)
      );
    }
  }

  const thisMonth: MonthlyFinancialSummary = {
    month: currentMonthStr,
    byCurrency: {},
  };

  for (const [curr, stats] of Object.entries(monthlyByCurrency)) {
    thisMonth.byCurrency[curr] = {
      income: toFixed2(stats.income),
      expenses: toFixed2(stats.expenses),
      transfers: toFixed2(stats.transfers),
    };
  }

  // 3. Optional approximate total conversion from exchange rates
  let convertedTotal: DashboardData["convertedTotal"] = undefined;
  const rates = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.userId, userId));

  if (rates.length > 0) {
    const cnyToMad = rates.find((r) => r.fromCurrency === "CNY" && r.toCurrency === "MAD");
    const madToCny = rates.find((r) => r.fromCurrency === "MAD" && r.toCurrency === "CNY");
    if (cnyToMad && totalMoneyByCurrency["CNY"] && totalMoneyByCurrency["MAD"]) {
      const cnyPart = toDecimal(totalMoneyByCurrency["CNY"]);
      const madPart = toDecimal(totalMoneyByCurrency["MAD"]);
      const totalInMad = madPart.add(cnyPart.mul(toDecimal(cnyToMad.rate)));
      convertedTotal = {
        targetCurrency: "MAD",
        amount: toFixed2(totalInMad),
        note: `1 CNY ≈ ${cnyToMad.rate} MAD`,
      };
    } else if (madToCny && totalMoneyByCurrency["CNY"] && totalMoneyByCurrency["MAD"]) {
      const cnyPart = toDecimal(totalMoneyByCurrency["CNY"]);
      const madPart = toDecimal(totalMoneyByCurrency["MAD"]);
      const totalInCny = cnyPart.add(madPart.mul(toDecimal(madToCny.rate)));
      convertedTotal = {
        targetCurrency: "CNY",
        amount: toFixed2(totalInCny),
        note: `1 MAD ≈ ${madToCny.rate} CNY`,
      };
    }
  }

  // 4. Recent transactions with enriched names
  const recentTransactions = allTx.slice(0, 10);

  return {
    totalMoneyByCurrency,
    convertedTotal,
    exchangeRates: rates.map((r) => ({
      id: r.id,
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: r.rate,
    })),
    accounts: accountsList,
    thisMonth,
    recentTransactions,
  };
}

/**
 * Gets category hierarchy (Parent -> Children) with usage counts for current user
 */
export async function getCategoriesTree(includeArchived = false): Promise<CategoryWithChildren[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const whereConditions = [eq(categories.userId, userId)];
  if (!includeArchived) {
    whereConditions.push(eq(categories.isArchived, false));
  }

  const allCats = await db
    .select()
    .from(categories)
    .where(and(...whereConditions))
    .orderBy(categories.name);

  const txCounts = await db
    .select({
      parentCategoryId: transactions.parentCategoryId,
      childCategoryId: transactions.childCategoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.parentCategoryId, transactions.childCategoryId);

  const usageMap = new Map<string, number>();
  for (const row of txCounts) {
    if (row.parentCategoryId) {
      usageMap.set(
        row.parentCategoryId,
        (usageMap.get(row.parentCategoryId) || 0) + row.count
      );
    }
    if (row.childCategoryId) {
      usageMap.set(
        row.childCategoryId,
        (usageMap.get(row.childCategoryId) || 0) + row.count
      );
    }
  }

  const parentMap = new Map<string, CategoryWithChildren>();
  const rootCategories: CategoryWithChildren[] = [];

  for (const cat of allCats) {
    if (!cat.parentId) {
      const parentObj: CategoryWithChildren = {
        ...cat,
        children: [],
        transactionCount: usageMap.get(cat.id) || 0,
      };
      parentMap.set(cat.id, parentObj);
      rootCategories.push(parentObj);
    }
  }

  for (const cat of allCats) {
    if (cat.parentId && parentMap.has(cat.parentId)) {
      const parent = parentMap.get(cat.parentId)!;
      parent.children.push({
        ...cat,
        transactionCount: usageMap.get(cat.id) || 0,
      });
    }
  }

  return rootCategories;
}

/**
 * Gets people with two-way balance summaries for the current user
 */
export async function getPeopleWithBalances(includeArchived = false): Promise<PersonWithBalance[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const whereConditions = [eq(people.userId, userId)];
  if (!includeArchived) {
    whereConditions.push(eq(people.isArchived, false));
  }

  const allPeople = await db
    .select()
    .from(people)
    .where(and(...whereConditions))
    .orderBy(people.name);

  if (allPeople.length === 0) return [];

  const personTxs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), sql`${transactions.personId} IS NOT NULL`))
    .orderBy(transactions.transactionDate, transactions.createdAt);

  const txCountMap = new Map<string, number>();
  const balancesByPerson = new Map<
    string,
    { [currency: string]: { theyOwe: Decimal; youOwe: Decimal } }
  >();

  for (const tx of personTxs) {
    if (!tx.personId) continue;
    txCountMap.set(tx.personId, (txCountMap.get(tx.personId) || 0) + 1);

    const personId = tx.personId;
    if (!balancesByPerson.has(personId)) {
      balancesByPerson.set(personId, {});
    }
    const personCurrencies = balancesByPerson.get(personId)!;

    const curr = (tx.sourceCurrency || tx.destinationCurrency || "CNY").toUpperCase();
    if (!personCurrencies[curr]) {
      personCurrencies[curr] = { theyOwe: new Decimal(0), youOwe: new Decimal(0) };
    }

    const amount = toDecimal(tx.sourceAmount || tx.destinationAmount || "0");
    const pType = tx.personTransferType;

    if (pType === "send_with_return" || pType === "lend" || pType === "repay_to_person") {
      if (personCurrencies[curr].youOwe.gt(0)) {
        if (amount.lte(personCurrencies[curr].youOwe)) {
          personCurrencies[curr].youOwe = personCurrencies[curr].youOwe.sub(amount);
        } else {
          const remainder = amount.sub(personCurrencies[curr].youOwe);
          personCurrencies[curr].youOwe = new Decimal(0);
          personCurrencies[curr].theyOwe = personCurrencies[curr].theyOwe.add(remainder);
        }
      } else {
        personCurrencies[curr].theyOwe = personCurrencies[curr].theyOwe.add(amount);
      }
    } else if (
      pType === "receive_with_return" ||
      pType === "borrow" ||
      pType === "repayment_from_person"
    ) {
      if (personCurrencies[curr].theyOwe.gt(0)) {
        if (amount.lte(personCurrencies[curr].theyOwe)) {
          personCurrencies[curr].theyOwe = personCurrencies[curr].theyOwe.sub(amount);
        } else {
          const remainder = amount.sub(personCurrencies[curr].theyOwe);
          personCurrencies[curr].theyOwe = new Decimal(0);
          personCurrencies[curr].youOwe = personCurrencies[curr].youOwe.add(remainder);
        }
      } else {
        personCurrencies[curr].youOwe = personCurrencies[curr].youOwe.add(amount);
      }
    }
  }

  return allPeople.map((p) => {
    const rawCurrencies = balancesByPerson.get(p.id) || {};
    const formattedBalances: PersonWithBalance["balancesByCurrency"] = {};

    for (const [curr, b] of Object.entries(rawCurrencies)) {
      const net = b.theyOwe.sub(b.youOwe);
      formattedBalances[curr] = {
        theyOweYou: toFixed2(b.theyOwe),
        youOweThem: toFixed2(b.youOwe),
        netPosition: toFixed2(net),
      };
    }

    return {
      id: p.id,
      name: p.name,
      note: p.note,
      isArchived: p.isArchived,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      balancesByCurrency: formattedBalances,
      transactionCount: txCountMap.get(p.id) || 0,
    };
  });
}

/**
 * Gets details and transaction history for a specific person for current user
 */
export async function getPersonDetails(personId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { person: null, transactions: [] };

  const peopleList = await getPeopleWithBalances(true);
  const person = peopleList.find((p) => p.id === personId);

  if (!person) {
    return { person: null, transactions: [] };
  }

  const txs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.personId, personId), eq(transactions.userId, userId)))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

  return {
    person,
    transactions: txs,
  };
}

/**
 * Gets transaction list with optional filtering for current user
 */
export async function getTransactionsList(filters?: {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  personId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { transactions: [], total: 0 };

  const conditions = [eq(transactions.userId, userId)];

  if (filters?.type) {
    conditions.push(eq(transactions.type, filters.type));
  }
  if (filters?.accountId) {
    conditions.push(
      sql`(${transactions.sourceAccountId} = ${filters.accountId} OR ${transactions.destinationAccountId} = ${filters.accountId})`
    );
  }
  if (filters?.categoryId) {
    conditions.push(
      sql`(${transactions.parentCategoryId} = ${filters.categoryId} OR ${transactions.childCategoryId} = ${filters.categoryId})`
    );
  }
  if (filters?.personId) {
    conditions.push(eq(transactions.personId, filters.personId));
  }
  if (filters?.startDate) {
    conditions.push(sql`${transactions.transactionDate} >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    conditions.push(sql`${transactions.transactionDate} <= ${filters.endDate}`);
  }

  const txs = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);

  return {
    transactions: txs,
    total: txs.length,
  };
}

/**
 * Gets exchange rates for current user
 */
export async function getExchangeRates() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  return db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.userId, userId))
    .orderBy(exchangeRates.fromCurrency);
}
