export type TransactionType =
  | "expense"
  | "income"
  | "transfer"
  | "withdrawal"
  | "deposit"
  | "top_up";

export type PaymentChannel = "wechat" | "alipay" | "cash" | "direct";

export type PersonTransferType =
  | "send_with_return" // Money from me -> them (expecting return / they owe me or reduces what I owe)
  | "send_without_return" // Money from me -> them (gift/transfer without return)
  | "receive_with_return" // Money from them -> me (expecting return / I owe them or reduces what they owe)
  | "receive_without_return" // Money from them -> me (gift/received without return)
  // Legacy aliases for backwards compatibility
  | "lend"
  | "send"
  | "borrow"
  | "repay_to_person"
  | "repayment_from_person"
  | "receive";

export type AccountType =
  | "bank"
  | "e_wallet"
  | "cash"
  | "international_card"
  | "other";

export interface AccountWithBalance {
  id: string;
  name: string;
  type: string;
  currency: string;
  initialBalance: string;
  currentBalance: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Account specific monthly statistics
  monthlyStats?: {
    income: string;
    expenses: string;
    withdrawals: string;
    deposits: string;
    topUps: string;
    transfersIn: string;
    transfersOut: string;
  };
}

export interface CategoryWithChildren {
  id: string;
  name: string;
  parentId: string | null;
  type: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: {
    id: string;
    name: string;
    parentId: string | null;
    type: string | null;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
    transactionCount: number;
  }[];
  transactionCount: number;
}

export interface PersonWithBalance {
  id: string;
  name: string;
  note: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Balances grouped by currency (e.g. CNY, MAD)
  balancesByCurrency: {
    [currency: string]: {
      theyOweYou: string;
      youOweThem: string;
      netPosition: string; // theyOweYou - youOweThem
    };
  };
  transactionCount: number;
}

export interface MonthlyFinancialSummary {
  month: string; // "YYYY-MM"
  byCurrency: {
    [currency: string]: {
      income: string;
      expenses: string;
      transfers: string;
    };
  };
}

export interface DashboardData {
  totalMoneyByCurrency: {
    [currency: string]: string; // e.g. { "CNY": "13450.00", "MAD": "13000.00" }
  };
  convertedTotal?: {
    targetCurrency: string;
    amount: string;
    note: string;
  };
  exchangeRates: {
    id: string;
    fromCurrency: string;
    toCurrency: string;
    rate: string;
  }[];
  accounts: AccountWithBalance[];
  thisMonth: MonthlyFinancialSummary;
  recentTransactions: any[];
}
