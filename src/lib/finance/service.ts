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
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
  DashboardData,
  MonthlyFinancialSummary,
  TransactionType,
} from "./types";

/**
 * Calculates current balances for all accounts deterministically:
 * Balance = initial_balance + sum(destination_amount) - sum(source_amount)
 */
export async function getAccountsWithBalances(includeArchived = false): Promise<AccountWithBalance[]> {
  const allAccounts = await db
    .select()
    .from(accounts)
    .where(includeArchived ? undefined : eq(accounts.isArchived, false))
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
    .from(transactions);

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
      initialBalance: toFixed2(acc.initialBalance),
      currentBalance: toFixed2(current),
      isArchived: acc.isArchived,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    };
  });
}

/**
 * Gets a single account with balance and detailed monthly statistics
 */
export async function getAccountDetails(accountId: string): Promise<{
  account: AccountWithBalance | null;
  transactions: any[];
}> {
  const accountList = await getAccountsWithBalances(true);
  const account = accountList.find((a) => a.id === accountId) || null;

  if (!account) {
    return { account: null, transactions: [] };
  }

  // Fetch all transactions for this account
  const accountTx = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      title: transactions.title,
      transactionDate: transactions.transactionDate,
      transactionTime: transactions.transactionTime,
      sourceAccountId: transactions.sourceAccountId,
      sourceAmount: transactions.sourceAmount,
      sourceCurrency: transactions.sourceCurrency,
      destinationAccountId: transactions.destinationAccountId,
      destinationAmount: transactions.destinationAmount,
      destinationCurrency: transactions.destinationCurrency,
      paymentChannel: transactions.paymentChannel,
      personId: transactions.personId,
      personTransferType: transactions.personTransferType,
      parentCategoryId: transactions.parentCategoryId,
      childCategoryId: transactions.childCategoryId,
      note: transactions.note,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .where(
      sql`${transactions.sourceAccountId} = ${accountId} OR ${transactions.destinationAccountId} = ${accountId}`
    )
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

  // Calculate this month's stats for this account
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let income = new Decimal(0);
  let expenses = new Decimal(0);
  let withdrawals = new Decimal(0);
  let deposits = new Decimal(0);
  let topUps = new Decimal(0);
  let transfersIn = new Decimal(0);
  let transfersOut = new Decimal(0);

  for (const tx of accountTx) {
    if (!tx.transactionDate.startsWith(currentMonthPrefix)) continue;

    if (tx.type === "income" && tx.destinationAccountId === accountId) {
      income = income.add(toDecimal(tx.destinationAmount));
    } else if (tx.type === "expense" && tx.sourceAccountId === accountId) {
      expenses = expenses.add(toDecimal(tx.sourceAmount));
    } else if (tx.type === "withdrawal" && tx.sourceAccountId === accountId) {
      withdrawals = withdrawals.add(toDecimal(tx.sourceAmount));
    } else if (tx.type === "deposit" && tx.destinationAccountId === accountId) {
      deposits = deposits.add(toDecimal(tx.destinationAmount));
    } else if (tx.type === "top_up") {
      if (tx.sourceAccountId === accountId) {
        topUps = topUps.add(toDecimal(tx.sourceAmount));
      } else if (tx.destinationAccountId === accountId) {
        topUps = topUps.add(toDecimal(tx.destinationAmount));
      }
    } else if (tx.type === "transfer") {
      if (tx.destinationAccountId === accountId) {
        transfersIn = transfersIn.add(toDecimal(tx.destinationAmount));
      } else if (tx.sourceAccountId === accountId) {
        transfersOut = transfersOut.add(toDecimal(tx.sourceAmount));
      }
    }
  }

  account.monthlyStats = {
    income: toFixed2(income),
    expenses: toFixed2(expenses),
    withdrawals: toFixed2(withdrawals),
    deposits: toFixed2(deposits),
    topUps: toFixed2(topUps),
    transfersIn: toFixed2(transfersIn),
    transfersOut: toFixed2(transfersOut),
  };

  return { account, transactions: accountTx };
}

/**
 * Calculates complete dashboard financial data
 */
export async function getDashboardData(): Promise<DashboardData> {
  const accountsList = await getAccountsWithBalances(false);

  // 1. Total money grouped by currency
  const totalMoneyByCurrency: { [currency: string]: string } = {};
  for (const acc of accountsList) {
    const curr = acc.currency.toUpperCase();
    const currentTotal = toDecimal(totalMoneyByCurrency[curr] || "0");
    totalMoneyByCurrency[curr] = toFixed2(currentTotal.add(toDecimal(acc.currentBalance)));
  }

  // 2. This month calculations
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const allTx = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      title: transactions.title,
      transactionDate: transactions.transactionDate,
      transactionTime: transactions.transactionTime,
      sourceAccountId: transactions.sourceAccountId,
      sourceAmount: transactions.sourceAmount,
      sourceCurrency: transactions.sourceCurrency,
      destinationAccountId: transactions.destinationAccountId,
      destinationAmount: transactions.destinationAmount,
      destinationCurrency: transactions.destinationCurrency,
      paymentChannel: transactions.paymentChannel,
      personId: transactions.personId,
      personTransferType: transactions.personTransferType,
      parentCategoryId: transactions.parentCategoryId,
      childCategoryId: transactions.childCategoryId,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
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
  const rates = await db.select().from(exchangeRates);
  if (rates.length > 0) {
    // Check if there is rate to CNY or MAD
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
 * Gets category hierarchy (Parent -> Children) with usage counts
 */
export async function getCategoriesTree(includeArchived = false): Promise<CategoryWithChildren[]> {
  const allCats = await db
    .select()
    .from(categories)
    .where(includeArchived ? undefined : eq(categories.isArchived, false))
    .orderBy(categories.name);

  const txCounts = await db
    .select({
      parentCategoryId: transactions.parentCategoryId,
      childCategoryId: transactions.childCategoryId,
    })
    .from(transactions);

  const countMap = new Map<string, number>();
  for (const t of txCounts) {
    if (t.parentCategoryId) {
      countMap.set(t.parentCategoryId, (countMap.get(t.parentCategoryId) || 0) + 1);
    }
    if (t.childCategoryId) {
      countMap.set(t.childCategoryId, (countMap.get(t.childCategoryId) || 0) + 1);
    }
  }

  const parents = allCats.filter((c) => !c.parentId);
  const children = allCats.filter((c) => c.parentId !== null);

  return parents.map((parent) => {
    const myChildren = children.filter((child) => child.parentId === parent.id);
    return {
      id: parent.id,
      name: parent.name,
      parentId: null,
      type: parent.type,
      isArchived: parent.isArchived,
      createdAt: parent.createdAt,
      updatedAt: parent.updatedAt,
      children: myChildren.map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        type: c.type,
        isArchived: c.isArchived,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        transactionCount: countMap.get(c.id) || 0,
      })),
      transactionCount: countMap.get(parent.id) || 0,
    };
  });
}

/**
 * Gets people with detailed debt and repayment ledger breakdown
 */
export async function getPeopleWithBalances(includeArchived = false): Promise<PersonWithBalance[]> {
  const allPeople = await db
    .select()
    .from(people)
    .where(includeArchived ? undefined : eq(people.isArchived, false))
    .orderBy(people.name);

  if (allPeople.length === 0) {
    return [];
  }

  const personTx = await db
    .select()
    .from(transactions)
    .where(sql`${transactions.personId} IS NOT NULL`)
    .orderBy(transactions.transactionDate, transactions.createdAt);

  const peopleMap = new Map<
    string,
    {
      count: number;
      currencies: Map<string, { theyOweYou: Decimal; youOweThem: Decimal }>;
    }
  >();

  for (const p of allPeople) {
    peopleMap.set(p.id, { count: 0, currencies: new Map() });
  }

  for (const tx of personTx) {
    if (!tx.personId) continue;
    const entry = peopleMap.get(tx.personId);
    if (!entry) continue;

    entry.count++;
    const currency = (tx.sourceCurrency || tx.destinationCurrency || "CNY").toUpperCase();
    if (!entry.currencies.has(currency)) {
      entry.currencies.set(currency, {
        theyOweYou: new Decimal(0),
        youOweThem: new Decimal(0),
      });
    }
    const debt = entry.currencies.get(currency)!;
    const amount = toDecimal(tx.sourceAmount || tx.destinationAmount || "0");

    // Money from me -> them (with return)
    if (
      tx.personTransferType === "send_with_return" ||
      tx.personTransferType === "lend" ||
      tx.personTransferType === "repay_to_person"
    ) {
      if (debt.youOweThem.gt(0)) {
        if (amount.lte(debt.youOweThem)) {
          debt.youOweThem = debt.youOweThem.sub(amount);
        } else {
          const remaining = amount.sub(debt.youOweThem);
          debt.youOweThem = new Decimal(0);
          debt.theyOweYou = debt.theyOweYou.add(remaining);
        }
      } else {
        debt.theyOweYou = debt.theyOweYou.add(amount);
      }
    }
    // Money from them -> me (with return)
    else if (
      tx.personTransferType === "receive_with_return" ||
      tx.personTransferType === "borrow" ||
      tx.personTransferType === "repayment_from_person"
    ) {
      if (debt.theyOweYou.gt(0)) {
        if (amount.lte(debt.theyOweYou)) {
          debt.theyOweYou = debt.theyOweYou.sub(amount);
        } else {
          const remaining = amount.sub(debt.theyOweYou);
          debt.theyOweYou = new Decimal(0);
          debt.youOweThem = debt.youOweThem.add(remaining);
        }
      } else {
        debt.youOweThem = debt.youOweThem.add(amount);
      }
    }
    // "send_without_return" and "receive_without_return" do not alter debts
  }

  return allPeople.map((p) => {
    const data = peopleMap.get(p.id)!;
    const balancesByCurrency: PersonWithBalance["balancesByCurrency"] = {};

    for (const [curr, d] of data.currencies.entries()) {
      const net = d.theyOweYou.sub(d.youOweThem);
      balancesByCurrency[curr] = {
        theyOweYou: toFixed2(d.theyOweYou),
        youOweThem: toFixed2(d.youOweThem),
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
      balancesByCurrency,
      transactionCount: data.count,
    };
  });
}
