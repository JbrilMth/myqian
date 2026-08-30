import { db } from "@/db";
import {
  accounts,
  categories,
  people,
  transactions,
  exchangeRates,
} from "@/db/schema";
import { eq, and, or, sql, desc, asc, gte, lte } from "drizzle-orm";
import { Decimal, toDecimal, toFixed2, formatCurrency } from "./decimal";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import {
  getAccountsWithBalances,
  getPeopleWithBalances,
  getCategoriesTree,
} from "./service";
import type {
  AccountWithBalance,
  CategoryWithChildren,
  PersonWithBalance,
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

// ----------------------------------------------------
// 1. WHERE IS MY MONEY?
// ----------------------------------------------------

export interface WhereIsMyMoneyData {
  byCurrency: {
    [currency: string]: {
      currency: string;
      totalAvailable: string;
      accounts: {
        id: string;
        name: string;
        type: string;
        balance: string;
        percentage: number;
      }[];
      totalOwedToMe: string;
      debtors: {
        personId: string;
        personName: string;
        amount: string;
      }[];
      totalIOwe: string;
      creditors: {
        personId: string;
        personName: string;
        amount: string;
      }[];
      netPosition: string; // Available + OwedToMe - IOwe
    };
  };
  allCurrencies: string[];
}

export async function getWhereIsMyMoneyData(): Promise<WhereIsMyMoneyData> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { byCurrency: {}, allCurrencies: [] };
  }

  const [accountsList, peopleList] = await Promise.all([
    getAccountsWithBalances(false),
    getPeopleWithBalances(false),
  ]);

  const currencyMap = new Map<
    string,
    {
      available: Decimal;
      accounts: { id: string; name: string; type: string; balance: Decimal }[];
      owedToMe: Decimal;
      debtors: { personId: string; personName: string; amount: Decimal }[];
      iOwe: Decimal;
      creditors: { personId: string; personName: string; amount: Decimal }[];
    }
  >();

  const getOrCreate = (curr: string) => {
    const c = curr.toUpperCase();
    if (!currencyMap.has(c)) {
      currencyMap.set(c, {
        available: new Decimal(0),
        accounts: [],
        owedToMe: new Decimal(0),
        debtors: [],
        iOwe: new Decimal(0),
        creditors: [],
      });
    }
    return currencyMap.get(c)!;
  };

  // 1. Accounts
  for (const acc of accountsList) {
    const entry = getOrCreate(acc.currency);
    const bal = toDecimal(acc.currentBalance);
    entry.available = entry.available.add(bal);
    entry.accounts.push({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: bal,
    });
  }

  // 2. People debts
  for (const p of peopleList) {
    for (const [curr, balInfo] of Object.entries(p.balancesByCurrency)) {
      const entry = getOrCreate(curr);
      const theyOwe = toDecimal(balInfo.theyOweYou);
      const youOwe = toDecimal(balInfo.youOweThem);

      if (theyOwe.gt(0)) {
        entry.owedToMe = entry.owedToMe.add(theyOwe);
        entry.debtors.push({
          personId: p.id,
          personName: p.name,
          amount: theyOwe,
        });
      }
      if (youOwe.gt(0)) {
        entry.iOwe = entry.iOwe.add(youOwe);
        entry.creditors.push({
          personId: p.id,
          personName: p.name,
          amount: youOwe,
        });
      }
    }
  }

  const byCurrency: WhereIsMyMoneyData["byCurrency"] = {};
  const allCurrencies = Array.from(currencyMap.keys()).sort();

  for (const [curr, entry] of currencyMap.entries()) {
    const totalAvail = entry.available;
    const net = totalAvail.add(entry.owedToMe).sub(entry.iOwe);

    const formattedAccounts = entry.accounts
      .sort((a, b) => b.balance.sub(a.balance).toNumber())
      .map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: toFixed2(acc.balance),
        percentage: totalAvail.gt(0) && acc.balance.gt(0)
          ? Math.round(acc.balance.div(totalAvail).mul(100).toNumber())
          : 0,
      }));

    byCurrency[curr] = {
      currency: curr,
      totalAvailable: toFixed2(totalAvail),
      accounts: formattedAccounts,
      totalOwedToMe: toFixed2(entry.owedToMe),
      debtors: entry.debtors
        .sort((a, b) => b.amount.sub(a.amount).toNumber())
        .map((d) => ({
          personId: d.personId,
          personName: d.personName,
          amount: toFixed2(d.amount),
        })),
      totalIOwe: toFixed2(entry.iOwe),
      creditors: entry.creditors
        .sort((a, b) => b.amount.sub(a.amount).toNumber())
        .map((c) => ({
          personId: c.personId,
          personName: c.personName,
          amount: toFixed2(c.amount),
        })),
      netPosition: toFixed2(net),
    };
  }

  return {
    byCurrency,
    allCurrencies,
  };
}

// ----------------------------------------------------
// 2. NET WORTH
// ----------------------------------------------------

export interface NetWorthData {
  currencies: string[];
  selectedCurrency: string;
  currentNetWorth: string;
  startingNetWorth: string;
  changeAmount: string;
  changePercentage: number;
  assets: {
    accountsTotal: string;
    owedToMeTotal: string;
    totalAssets: string;
  };
  liabilities: {
    iOweTotal: string;
    totalLiabilities: string;
  };
  history: {
    date: string;
    value: number;
    label?: string;
  }[];
  timeRange: string;
}

export async function getNetWorthData(
  timeRange: string = "30d",
  selectedCurrency?: string
): Promise<NetWorthData> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      currencies: ["CNY"],
      selectedCurrency: "CNY",
      currentNetWorth: "0.00",
      startingNetWorth: "0.00",
      changeAmount: "0.00",
      changePercentage: 0,
      assets: { accountsTotal: "0.00", owedToMeTotal: "0.00", totalAssets: "0.00" },
      liabilities: { iOweTotal: "0.00", totalLiabilities: "0.00" },
      history: [],
      timeRange,
    };
  }

  const [whereData, allTx] = await Promise.all([
    getWhereIsMyMoneyData(),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(asc(transactions.transactionDate), asc(transactions.createdAt)),
  ]);

  const currencies = whereData.allCurrencies.length > 0 ? whereData.allCurrencies : ["CNY"];
  const targetCurr =
    selectedCurrency && currencies.includes(selectedCurrency.toUpperCase())
      ? selectedCurrency.toUpperCase()
      : currencies[0];

  const currentSummary = whereData.byCurrency[targetCurr] || {
    totalAvailable: "0.00",
    totalOwedToMe: "0.00",
    totalIOwe: "0.00",
    netPosition: "0.00",
  };

  // Determine date bounds
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split("T")[0];
  const endDateStr = formatYMD(now);
  let startDateStr = formatYMD(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  switch (timeRange) {
    case "7d":
      startDateStr = formatYMD(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      break;
    case "30d":
      startDateStr = formatYMD(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      break;
    case "3m":
      startDateStr = formatYMD(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
      break;
    case "6m":
      startDateStr = formatYMD(new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000));
      break;
    case "1y":
      startDateStr = formatYMD(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
      break;
    case "all":
      startDateStr = allTx.length > 0 ? allTx[0].transactionDate : startDateStr;
      break;
  }

  // Calculate Net Worth trajectory by rolling changes
  const currNetWorthDec = toDecimal(currentSummary.netPosition);

  // Group all transaction net impacts on this currency by date
  // Expense: reduces net worth
  // Income: increases net worth
  // Transfers/Withdrawals/Deposits: internal movement (0 net worth impact unless currency mismatch)
  // Person lend/borrow: lending replaces cash with asset (0 net impact), borrowing adds cash and liability (0 net impact)
  const txDeltaByDate = new Map<string, Decimal>();

  for (const tx of allTx) {
    const srcCurr = (tx.sourceCurrency || "CNY").toUpperCase();
    const destCurr = (tx.destinationCurrency || "CNY").toUpperCase();
    const date = tx.transactionDate;

    if (tx.type === "expense" && srcCurr === targetCurr) {
      const amt = toDecimal(tx.sourceAmount || "0");
      txDeltaByDate.set(date, (txDeltaByDate.get(date) || new Decimal(0)).sub(amt));
    } else if (tx.type === "income" && destCurr === targetCurr) {
      const amt = toDecimal(tx.destinationAmount || "0");
      txDeltaByDate.set(date, (txDeltaByDate.get(date) || new Decimal(0)).add(amt));
    }
  }

  // Generate daily points backwards or linearly from start to end
  const historyPoints: { date: string; value: number; label?: string }[] = [];
  const startD = new Date(startDateStr);
  const endD = new Date(endDateStr);

  // Reconstruct net worth at start date
  let totalDeltaAfterStart = new Decimal(0);
  for (const [date, delta] of txDeltaByDate.entries()) {
    if (date >= startDateStr && date <= endDateStr) {
      totalDeltaAfterStart = totalDeltaAfterStart.add(delta);
    }
  }

  let runningNetWorth = currNetWorthDec.sub(totalDeltaAfterStart);
  const startNetWorthDec = runningNetWorth;

  // Generate day-by-day sequence
  const currentD = new Date(startD);
  while (currentD <= endD) {
    const dStr = formatYMD(currentD);
    if (txDeltaByDate.has(dStr)) {
      runningNetWorth = runningNetWorth.add(txDeltaByDate.get(dStr)!);
    }
    historyPoints.push({
      date: dStr,
      value: runningNetWorth.toNumber(),
    });
    currentD.setDate(currentD.getDate() + 1);
  }

  // If there are many points (>60), downsample nicely for clean SVG rendering
  let formattedHistory = historyPoints;
  if (historyPoints.length > 60) {
    const step = Math.ceil(historyPoints.length / 45);
    formattedHistory = historyPoints.filter((_, idx) => idx % step === 0 || idx === historyPoints.length - 1);
  }

  const changeAmt = currNetWorthDec.sub(startNetWorthDec);
  const changePct = startNetWorthDec.abs().gt(0)
    ? Math.round(changeAmt.div(startNetWorthDec.abs()).mul(1000).toNumber()) / 10
    : 0;

  const totalAssets = toDecimal(currentSummary.totalAvailable).add(toDecimal(currentSummary.totalOwedToMe));

  return {
    currencies,
    selectedCurrency: targetCurr,
    currentNetWorth: toFixed2(currNetWorthDec),
    startingNetWorth: toFixed2(startNetWorthDec),
    changeAmount: toFixed2(changeAmt),
    changePercentage: changePct,
    assets: {
      accountsTotal: currentSummary.totalAvailable,
      owedToMeTotal: currentSummary.totalOwedToMe,
      totalAssets: toFixed2(totalAssets),
    },
    liabilities: {
      iOweTotal: currentSummary.totalIOwe,
      totalLiabilities: currentSummary.totalIOwe,
    },
    history: formattedHistory,
    timeRange,
  };
}

// ----------------------------------------------------
// 3. ACCOUNT BALANCE HISTORY
// ----------------------------------------------------

export interface AccountBalanceHistoryData {
  accounts: { id: string; name: string; currency: string; type: string }[];
  selectedAccountId: string;
  accountName: string;
  currency: string;
  currentBalance: string;
  startingBalance: string;
  totalInflow: string;
  totalOutflow: string;
  netChange: string;
  timeRange: string;
  history: {
    date: string;
    value: number;
    label?: string;
  }[];
  movements: any[];
}

export async function getAccountBalanceHistoryData(
  accountId?: string,
  timeRange: string = "30d"
): Promise<AccountBalanceHistoryData> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      accounts: [],
      selectedAccountId: "",
      accountName: "",
      currency: "CNY",
      currentBalance: "0.00",
      startingBalance: "0.00",
      totalInflow: "0.00",
      totalOutflow: "0.00",
      netChange: "0.00",
      timeRange,
      history: [],
      movements: [],
    };
  }

  const allAccounts = await getAccountsWithBalances(true);
  if (allAccounts.length === 0) {
    return {
      accounts: [],
      selectedAccountId: "",
      accountName: "",
      currency: "CNY",
      currentBalance: "0.00",
      startingBalance: "0.00",
      totalInflow: "0.00",
      totalOutflow: "0.00",
      netChange: "0.00",
      timeRange,
      history: [],
      movements: [],
    };
  }

  const targetAcc =
    allAccounts.find((a) => a.id === accountId) || allAccounts[0];

  // Fetch all transactions involving this account
  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`(${transactions.sourceAccountId} = ${targetAcc.id} OR ${transactions.destinationAccountId} = ${targetAcc.id})`
      )
    )
    .orderBy(asc(transactions.transactionDate), asc(transactions.createdAt));

  // Determine time bounds
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split("T")[0];
  const endDateStr = formatYMD(now);
  let startDateStr = formatYMD(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  switch (timeRange) {
    case "7d":
      startDateStr = formatYMD(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      break;
    case "30d":
      startDateStr = formatYMD(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      break;
    case "3m":
      startDateStr = formatYMD(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
      break;
    case "6m":
      startDateStr = formatYMD(new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000));
      break;
    case "1y":
      startDateStr = formatYMD(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
      break;
    case "all":
      startDateStr = txs.length > 0 ? txs[0].transactionDate : startDateStr;
      break;
  }

  // Calculate daily balance changes for this account
  const dailyDelta = new Map<string, Decimal>();
  let inflowInPeriod = new Decimal(0);
  let outflowInPeriod = new Decimal(0);
  const periodMovements: any[] = [];

  for (const tx of txs) {
    const isDest = tx.destinationAccountId === targetAcc.id;
    const isSrc = tx.sourceAccountId === targetAcc.id;
    const destAmt = toDecimal(tx.destinationAmount || "0");
    const srcAmt = toDecimal(tx.sourceAmount || "0");

    let netTx = new Decimal(0);
    if (isDest) netTx = netTx.add(destAmt);
    if (isSrc) netTx = netTx.sub(srcAmt);

    const dStr = tx.transactionDate;
    dailyDelta.set(dStr, (dailyDelta.get(dStr) || new Decimal(0)).add(netTx));

    if (dStr >= startDateStr && dStr <= endDateStr) {
      if (isDest && destAmt.gt(0)) inflowInPeriod = inflowInPeriod.add(destAmt);
      if (isSrc && srcAmt.gt(0)) outflowInPeriod = outflowInPeriod.add(srcAmt);
      periodMovements.push(tx);
    }
  }

  const currentBalDec = toDecimal(targetAcc.currentBalance);

  // Reconstruct balance at start of period
  let deltaAfterStart = new Decimal(0);
  for (const [date, delta] of dailyDelta.entries()) {
    if (date >= startDateStr && date <= endDateStr) {
      deltaAfterStart = deltaAfterStart.add(delta);
    }
  }

  let runningBal = currentBalDec.sub(deltaAfterStart);
  const startBalDec = runningBal;

  const historyPoints: { date: string; value: number; label?: string }[] = [];
  const startD = new Date(startDateStr);
  const endD = new Date(endDateStr);
  const currentD = new Date(startD);

  while (currentD <= endD) {
    const dStr = formatYMD(currentD);
    if (dailyDelta.has(dStr)) {
      runningBal = runningBal.add(dailyDelta.get(dStr)!);
    }
    historyPoints.push({
      date: dStr,
      value: runningBal.toNumber(),
    });
    currentD.setDate(currentD.getDate() + 1);
  }

  let formattedHistory = historyPoints;
  if (historyPoints.length > 60) {
    const step = Math.ceil(historyPoints.length / 45);
    formattedHistory = historyPoints.filter((_, idx) => idx % step === 0 || idx === historyPoints.length - 1);
  }

  return {
    accounts: allAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      type: a.type,
    })),
    selectedAccountId: targetAcc.id,
    accountName: targetAcc.name,
    currency: targetAcc.currency,
    currentBalance: targetAcc.currentBalance,
    startingBalance: toFixed2(startBalDec),
    totalInflow: toFixed2(inflowInPeriod),
    totalOutflow: toFixed2(outflowInPeriod),
    netChange: toFixed2(currentBalDec.sub(startBalDec)),
    timeRange,
    history: formattedHistory,
    movements: periodMovements.reverse(),
  };
}

// ----------------------------------------------------
// 4. MONTHLY FINANCIAL REVIEW
// ----------------------------------------------------

export interface MonthlyReviewData {
  yearMonth: string; // "YYYY-MM"
  availableMonths: string[];
  summaryByCurrency: {
    [currency: string]: {
      currency: string;
      income: string;
      expenses: string;
      net: string;
      savingsRate: number;
      txCount: number;
    };
  };
  categoryBreakdown: {
    parentId: string;
    parentName: string;
    amount: string;
    currency: string;
    percentage: number;
    children: {
      childId: string;
      childName: string;
      amount: string;
      percentage: number;
    }[];
  }[];
  monthOverMonth: {
    prevMonth: string;
    prevExpensesByCurrency: { [currency: string]: string };
    currExpensesByCurrency: { [currency: string]: string };
    expenseChanges: {
      currency: string;
      diffAmount: string;
      diffPercent: number;
      isIncrease: boolean;
    }[];
  };
  insights: {
    topPaymentMethod: { name: string; amount: string; currency: string } | null;
    biggestCategory: { name: string; amount: string; currency: string } | null;
    biggestSingleExpense: { title: string; amount: string; currency: string; date: string } | null;
    totalTransactionsCount: number;
    averageDailySpendByCurrency: { [currency: string]: string };
  };
  moneyMovements: {
    currency: string;
    income: string;
    expenses: string;
    transfersIn: string;
    transfersOut: string;
    withdrawals: string;
    deposits: string;
    topUps: string;
  }[];
}

export async function getMonthlyReviewData(
  targetYearMonth?: string
): Promise<MonthlyReviewData> {
  const userId = await getCurrentUserId();
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const ym = targetYearMonth || currentMonthStr;

  if (!userId) {
    return {
      yearMonth: ym,
      availableMonths: [currentMonthStr],
      summaryByCurrency: {},
      categoryBreakdown: [],
      monthOverMonth: {
        prevMonth: "",
        prevExpensesByCurrency: {},
        currExpensesByCurrency: {},
        expenseChanges: [],
      },
      insights: {
        topPaymentMethod: null,
        biggestCategory: null,
        biggestSingleExpense: null,
        totalTransactionsCount: 0,
        averageDailySpendByCurrency: {},
      },
      moneyMovements: [],
    };
  }

  // Calculate previous month string
  const [year, month] = ym.split("-").map(Number);
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const [allTx, categoriesList] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt)),
    getCategoriesTree(true),
  ]);

  // Extract all distinct months available in transactions
  const monthSet = new Set<string>();
  monthSet.add(currentMonthStr);
  for (const tx of allTx) {
    if (tx.transactionDate && tx.transactionDate.length >= 7) {
      monthSet.add(tx.transactionDate.slice(0, 7));
    }
  }
  const availableMonths = Array.from(monthSet).sort().reverse();

  // Category maps
  const catMap = new Map<string, string>();
  for (const parent of categoriesList) {
    catMap.set(parent.id, parent.name);
    for (const child of parent.children) {
      catMap.set(child.id, child.name);
    }
  }

  // Aggregate current month metrics
  const currCurrencyMap = new Map<
    string,
    { income: Decimal; expenses: Decimal; count: number }
  >();
  const prevCurrencyMap = new Map<string, { expenses: Decimal }>();

  const categorySpendMap = new Map<
    string,
    { parentName: string; amount: Decimal; currency: string; children: Map<string, { childName: string; amount: Decimal }> }
  >();

  const paymentChannelMap = new Map<string, { amount: Decimal; currency: string }>();

  let biggestExpenseTx: { title: string; amount: Decimal; currency: string; date: string } | null = null;
  let totalTxCount = 0;

  const movementMap = new Map<
    string,
    {
      income: Decimal;
      expenses: Decimal;
      transfersIn: Decimal;
      transfersOut: Decimal;
      withdrawals: Decimal;
      deposits: Decimal;
      topUps: Decimal;
    }
  >();

  const getOrCreateMovement = (curr: string) => {
    const c = curr.toUpperCase();
    if (!movementMap.has(c)) {
      movementMap.set(c, {
        income: new Decimal(0),
        expenses: new Decimal(0),
        transfersIn: new Decimal(0),
        transfersOut: new Decimal(0),
        withdrawals: new Decimal(0),
        deposits: new Decimal(0),
        topUps: new Decimal(0),
      });
    }
    return movementMap.get(c)!;
  };

  for (const tx of allTx) {
    const txYm = tx.transactionDate?.slice(0, 7);

    // Track previous month expenses
    if (txYm === prevYm && tx.type === "expense") {
      const curr = (tx.sourceCurrency || "CNY").toUpperCase();
      if (!prevCurrencyMap.has(curr)) {
        prevCurrencyMap.set(curr, { expenses: new Decimal(0) });
      }
      prevCurrencyMap.get(curr)!.expenses = prevCurrencyMap.get(curr)!.expenses.add(toDecimal(tx.sourceAmount));
    }

    if (txYm !== ym) continue;

    totalTxCount += 1;
    const srcCurr = (tx.sourceCurrency || "CNY").toUpperCase();
    const destCurr = (tx.destinationCurrency || "CNY").toUpperCase();
    const srcAmt = toDecimal(tx.sourceAmount || "0");
    const destAmt = toDecimal(tx.destinationAmount || tx.sourceAmount || "0");

    const mStats = getOrCreateMovement(srcCurr);

    if (tx.type === "expense") {
      if (!currCurrencyMap.has(srcCurr)) {
        currCurrencyMap.set(srcCurr, { income: new Decimal(0), expenses: new Decimal(0), count: 0 });
      }
      const entry = currCurrencyMap.get(srcCurr)!;
      entry.expenses = entry.expenses.add(srcAmt);
      entry.count += 1;
      mStats.expenses = mStats.expenses.add(srcAmt);

      // Track category spending
      const pId = tx.parentCategoryId || "uncategorized";
      const pName = tx.parentCategoryId ? catMap.get(tx.parentCategoryId) || "Other" : "Uncategorized";

      if (!categorySpendMap.has(pId)) {
        categorySpendMap.set(pId, {
          parentName: pName,
          amount: new Decimal(0),
          currency: srcCurr,
          children: new Map(),
        });
      }
      const catEntry = categorySpendMap.get(pId)!;
      catEntry.amount = catEntry.amount.add(srcAmt);

      if (tx.childCategoryId) {
        const cId = tx.childCategoryId;
        const cName = catMap.get(cId) || "Subcategory";
        if (!catEntry.children.has(cId)) {
          catEntry.children.set(cId, { childName: cName, amount: new Decimal(0) });
        }
        catEntry.children.get(cId)!.amount = catEntry.children.get(cId)!.amount.add(srcAmt);
      }

      // Track Payment Channels
      const channel = tx.paymentChannel || "Direct";
      const channelKey = `${channel}__${srcCurr}`;
      if (!paymentChannelMap.has(channelKey)) {
        paymentChannelMap.set(channelKey, { amount: new Decimal(0), currency: srcCurr });
      }
      paymentChannelMap.get(channelKey)!.amount = paymentChannelMap.get(channelKey)!.amount.add(srcAmt);

      // Track Biggest single expense
      if (!biggestExpenseTx || srcAmt.gt(biggestExpenseTx.amount)) {
        biggestExpenseTx = {
          title: tx.title,
          amount: srcAmt,
          currency: srcCurr,
          date: tx.transactionDate,
        };
      }
    } else if (tx.type === "income") {
      if (!currCurrencyMap.has(destCurr)) {
        currCurrencyMap.set(destCurr, { income: new Decimal(0), expenses: new Decimal(0), count: 0 });
      }
      const entry = currCurrencyMap.get(destCurr)!;
      entry.income = entry.income.add(destAmt);
      entry.count += 1;
      const dStats = getOrCreateMovement(destCurr);
      dStats.income = dStats.income.add(destAmt);
    } else if (tx.type === "transfer") {
      mStats.transfersOut = mStats.transfersOut.add(srcAmt);
      const dStats = getOrCreateMovement(destCurr);
      dStats.transfersIn = dStats.transfersIn.add(destAmt);
    } else if (tx.type === "withdrawal") {
      mStats.withdrawals = mStats.withdrawals.add(srcAmt);
    } else if (tx.type === "deposit") {
      mStats.deposits = mStats.deposits.add(destAmt);
    } else if (tx.type === "top_up") {
      mStats.topUps = mStats.topUps.add(destAmt);
    }
  }

  // Format summaries
  const summaryByCurrency: MonthlyReviewData["summaryByCurrency"] = {};
  const avgDailySpend: { [currency: string]: string } = {};

  const daysInMonth = new Date(year, month, 0).getDate();

  for (const [curr, stats] of currCurrencyMap.entries()) {
    const net = stats.income.sub(stats.expenses);
    const savingsRate = stats.income.gt(0) && net.gt(0)
      ? Math.round(net.div(stats.income).mul(100).toNumber())
      : 0;

    summaryByCurrency[curr] = {
      currency: curr,
      income: toFixed2(stats.income),
      expenses: toFixed2(stats.expenses),
      net: toFixed2(net),
      savingsRate,
      txCount: stats.count,
    };

    avgDailySpend[curr] = toFixed2(stats.expenses.div(daysInMonth));
  }

  // Format Category breakdown
  let totalExpensePrimary = new Decimal(0);
  for (const stats of currCurrencyMap.values()) {
    totalExpensePrimary = totalExpensePrimary.add(stats.expenses);
  }

  const categoryBreakdown: MonthlyReviewData["categoryBreakdown"] = [];
  for (const [pId, pData] of categorySpendMap.entries()) {
    const pPercentage = totalExpensePrimary.gt(0)
      ? Math.round(pData.amount.div(totalExpensePrimary).mul(100).toNumber())
      : 0;

    const childArr = Array.from(pData.children.entries()).map(([cId, cData]) => ({
      childId: cId,
      childName: cData.childName,
      amount: toFixed2(cData.amount),
      percentage: pData.amount.gt(0)
        ? Math.round(cData.amount.div(pData.amount).mul(100).toNumber())
        : 0,
    })).sort((a, b) => Number(b.amount) - Number(a.amount));

    categoryBreakdown.push({
      parentId: pId,
      parentName: pData.parentName,
      amount: toFixed2(pData.amount),
      currency: pData.currency,
      percentage: pPercentage,
      children: childArr,
    });
  }
  categoryBreakdown.sort((a, b) => Number(b.amount) - Number(a.amount));

  // Month-over-Month Expense Changes
  const expenseChanges: MonthlyReviewData["monthOverMonth"]["expenseChanges"] = [];
  const prevExpObj: { [c: string]: string } = {};
  const currExpObj: { [c: string]: string } = {};

  const allCurrenciesList = Array.from(
    new Set([...Array.from(currCurrencyMap.keys()), ...Array.from(prevCurrencyMap.keys())])
  );

  for (const curr of allCurrenciesList) {
    const cExp = currCurrencyMap.get(curr)?.expenses || new Decimal(0);
    const pExp = prevCurrencyMap.get(curr)?.expenses || new Decimal(0);

    currExpObj[curr] = toFixed2(cExp);
    prevExpObj[curr] = toFixed2(pExp);

    const diff = cExp.sub(pExp);
    const diffPct = pExp.gt(0)
      ? Math.round(diff.div(pExp).mul(1000).toNumber()) / 10
      : 0;

    expenseChanges.push({
      currency: curr,
      diffAmount: toFixed2(diff.abs()),
      diffPercent: Math.abs(diffPct),
      isIncrease: diff.gt(0),
    });
  }

  // Top Payment Method
  let topPayment: { name: string; amount: string; currency: string } | null = null;
  let maxChannelAmt = new Decimal(0);
  for (const [key, data] of paymentChannelMap.entries()) {
    if (data.amount.gt(maxChannelAmt)) {
      maxChannelAmt = data.amount;
      const [name] = key.split("__");
      topPayment = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        amount: toFixed2(data.amount),
        currency: data.currency,
      };
    }
  }

  // Biggest Category
  const biggestCat = categoryBreakdown.length > 0
    ? {
        name: categoryBreakdown[0].parentName,
        amount: categoryBreakdown[0].amount,
        currency: categoryBreakdown[0].currency,
      }
    : null;

  // Formatted Money movements
  const moneyMovements: MonthlyReviewData["moneyMovements"] = [];
  for (const [curr, stats] of movementMap.entries()) {
    moneyMovements.push({
      currency: curr,
      income: toFixed2(stats.income),
      expenses: toFixed2(stats.expenses),
      transfersIn: toFixed2(stats.transfersIn),
      transfersOut: toFixed2(stats.transfersOut),
      withdrawals: toFixed2(stats.withdrawals),
      deposits: toFixed2(stats.deposits),
      topUps: toFixed2(stats.topUps),
    });
  }

  return {
    yearMonth: ym,
    availableMonths,
    summaryByCurrency,
    categoryBreakdown,
    monthOverMonth: {
      prevMonth: prevYm,
      prevExpensesByCurrency: prevExpObj,
      currExpensesByCurrency: currExpObj,
      expenseChanges,
    },
    insights: {
      topPaymentMethod: topPayment,
      biggestCategory: biggestCat,
      biggestSingleExpense: biggestExpenseTx
        ? {
            title: biggestExpenseTx.title,
            amount: toFixed2(biggestExpenseTx.amount),
            currency: biggestExpenseTx.currency,
            date: biggestExpenseTx.date,
          }
        : null,
      totalTransactionsCount: totalTxCount,
      averageDailySpendByCurrency: avgDailySpend,
    },
    moneyMovements,
  };
}

// ----------------------------------------------------
// 5. CALENDAR VIEW
// ----------------------------------------------------

export interface CalendarDaySummary {
  date: string; // "YYYY-MM-DD"
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  totalIncomeByCurrency: { [curr: string]: string };
  totalExpenseByCurrency: { [curr: string]: string };
  transactionCount: number;
  hasTransactions: boolean;
  hasExpense: boolean;
  hasIncome: boolean;
}

export interface CalendarData {
  yearMonth: string; // "YYYY-MM"
  monthTitle: string; // "August 2026"
  days: CalendarDaySummary[];
  transactionsByDate: { [date: string]: any[] };
  monthlyTotals: {
    [currency: string]: { income: string; expenses: string; count: number };
  };
}

export async function getCalendarData(
  targetYearMonth?: string
): Promise<CalendarData> {
  const userId = await getCurrentUserId();
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const ym = targetYearMonth || currentMonthStr;

  const [year, month] = ym.split("-").map(Number);
  const monthDate = new Date(year, month - 1, 1);
  const monthTitle = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  if (!userId) {
    return {
      yearMonth: ym,
      monthTitle,
      days: [],
      transactionsByDate: {},
      monthlyTotals: {},
    };
  }

  // Calculate date range bounds for the target month
  const firstDayStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(totalDaysInMonth).padStart(2, "0")}`;

  // Fetch all transactions in the target month
  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.transactionDate} >= ${firstDayStr}`,
        sql`${transactions.transactionDate} <= ${lastDayStr}`
      )
    )
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

  const txByDate: { [date: string]: any[] } = {};
  const dailyIncome: { [date: string]: { [curr: string]: Decimal } } = {};
  const dailyExpense: { [date: string]: { [curr: string]: Decimal } } = {};
  const monthlyTotals: { [curr: string]: { income: Decimal; expenses: Decimal; count: number } } = {};

  for (const tx of txs) {
    const d = tx.transactionDate;
    if (!txByDate[d]) txByDate[d] = [];
    txByDate[d].push(tx);

    const srcCurr = (tx.sourceCurrency || "CNY").toUpperCase();
    const destCurr = (tx.destinationCurrency || "CNY").toUpperCase();
    const srcAmt = toDecimal(tx.sourceAmount || "0");
    const destAmt = toDecimal(tx.destinationAmount || tx.sourceAmount || "0");

    if (tx.type === "expense") {
      if (!dailyExpense[d]) dailyExpense[d] = {};
      dailyExpense[d][srcCurr] = (dailyExpense[d][srcCurr] || new Decimal(0)).add(srcAmt);

      if (!monthlyTotals[srcCurr]) monthlyTotals[srcCurr] = { income: new Decimal(0), expenses: new Decimal(0), count: 0 };
      monthlyTotals[srcCurr].expenses = monthlyTotals[srcCurr].expenses.add(srcAmt);
      monthlyTotals[srcCurr].count += 1;
    } else if (tx.type === "income") {
      if (!dailyIncome[d]) dailyIncome[d] = {};
      dailyIncome[d][destCurr] = (dailyIncome[d][destCurr] || new Decimal(0)).add(destAmt);

      if (!monthlyTotals[destCurr]) monthlyTotals[destCurr] = { income: new Decimal(0), expenses: new Decimal(0), count: 0 };
      monthlyTotals[destCurr].income = monthlyTotals[destCurr].income.add(destAmt);
      monthlyTotals[destCurr].count += 1;
    } else {
      const c = srcCurr || destCurr;
      if (!monthlyTotals[c]) monthlyTotals[c] = { income: new Decimal(0), expenses: new Decimal(0), count: 0 };
      monthlyTotals[c].count += 1;
    }
  }

  // Construct standard calendar grid (starting from Monday)
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const totalDays = lastDay.getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  // Day of week for 1st of month: 0=Sun, 1=Mon ... 6=Sat
  let startDayOfWeek = firstDay.getDay(); // 0 is Sun
  const padDaysBefore = (startDayOfWeek + 6) % 7; // 0 for Mon, 6 for Sun

  const days: CalendarDaySummary[] = [];

  // Padded days from previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();

  for (let i = padDaysBefore - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const dStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    days.push({
      date: dStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      totalIncomeByCurrency: {},
      totalExpenseByCurrency: {},
      transactionCount: 0,
      hasTransactions: false,
      hasExpense: false,
      hasIncome: false,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const txList = txByDate[dStr] || [];

    const incMap: { [c: string]: string } = {};
    if (dailyIncome[dStr]) {
      for (const [c, val] of Object.entries(dailyIncome[dStr])) {
        incMap[c] = toFixed2(val);
      }
    }

    const expMap: { [c: string]: string } = {};
    if (dailyExpense[dStr]) {
      for (const [c, val] of Object.entries(dailyExpense[dStr])) {
        expMap[c] = toFixed2(val);
      }
    }

    days.push({
      date: dStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
      totalIncomeByCurrency: incMap,
      totalExpenseByCurrency: expMap,
      transactionCount: txList.length,
      hasTransactions: txList.length > 0,
      hasExpense: Object.keys(expMap).length > 0,
      hasIncome: Object.keys(incMap).length > 0,
    });
  }

  // Remaining padding days for complete grid (multiples of 7)
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const dStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        date: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        totalIncomeByCurrency: {},
        totalExpenseByCurrency: {},
        transactionCount: 0,
        hasTransactions: false,
        hasExpense: false,
        hasIncome: false,
      });
    }
  }

  const formattedMonthlyTotals: CalendarData["monthlyTotals"] = {};
  for (const [c, s] of Object.entries(monthlyTotals)) {
    formattedMonthlyTotals[c] = {
      income: toFixed2(s.income),
      expenses: toFixed2(s.expenses),
      count: s.count,
    };
  }

  return {
    yearMonth: ym,
    monthTitle,
    days,
    transactionsByDate: txByDate,
    monthlyTotals: formattedMonthlyTotals,
  };
}

// ----------------------------------------------------
// 6. SEARCH EVERYTHING
// ----------------------------------------------------

export interface SearchResults {
  query: string;
  transactions: any[];
  people: any[];
  categories: any[];
  accounts: any[];
  totalMatches: number;
}

export async function searchEverything(query: string): Promise<SearchResults> {
  const userId = await getCurrentUserId();
  const trimmed = query.trim();

  if (!userId || !trimmed) {
    return {
      query: trimmed,
      transactions: [],
      people: [],
      categories: [],
      accounts: [],
      totalMatches: 0,
    };
  }

  const term = `%${trimmed.toLowerCase()}%`;

  // Parallel database search across all entities
  const [matchingTxs, matchingPeople, matchingCategories, matchingAccounts] =
    await Promise.all([
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            sql`(LOWER(${transactions.title}) LIKE ${term} OR LOWER(COALESCE(${transactions.note}, '')) LIKE ${term})`
          )
        )
        .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
        .limit(50),

      db
        .select()
        .from(people)
        .where(
          and(
            eq(people.userId, userId),
            sql`(LOWER(${people.name}) LIKE ${term} OR LOWER(COALESCE(${people.note}, '')) LIKE ${term})`
          )
        )
        .limit(20),

      db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            sql`LOWER(${categories.name}) LIKE ${term}`
          )
        )
        .limit(20),

      db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, userId),
            sql`(LOWER(${accounts.name}) LIKE ${term} OR LOWER(${accounts.currency}) LIKE ${term})`
          )
        )
        .limit(20),
    ]);

  const totalMatches =
    matchingTxs.length +
    matchingPeople.length +
    matchingCategories.length +
    matchingAccounts.length;

  return {
    query: trimmed,
    transactions: matchingTxs,
    people: matchingPeople,
    categories: matchingCategories,
    accounts: matchingAccounts,
    totalMatches,
  };
}
