import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  date,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'bank' | 'e_wallet' | 'cash' | 'international_card' | 'other'
    currency: text("currency").notNull(), // 'CNY' | 'MAD' | 'USD' | 'EUR' etc.
    initialBalance: numeric("initial_balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0.00"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_accounts_currency").on(table.currency),
    index("idx_accounts_archived").on(table.isArchived),
  ]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    parentId: uuid("parent_id"),
    type: text("type"), // 'expense' | 'income' | 'both'
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_categories_parent").on(table.parentId),
    index("idx_categories_archived").on(table.isArchived),
  ]
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    note: text("note"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_people_archived").on(table.isArchived)]
);

export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: numeric("rate", { precision: 15, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(), // 'expense' | 'income' | 'transfer' | 'withdrawal' | 'deposit' | 'top_up'
    title: text("title").notNull(),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    transactionTime: text("transaction_time"), // e.g. "12:35"

    parentCategoryId: uuid("parent_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    childCategoryId: uuid("child_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),

    // Source side
    sourceAccountId: uuid("source_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    sourceAmount: numeric("source_amount", { precision: 15, scale: 2 }),
    sourceCurrency: text("source_currency"),
    paymentChannel: text("payment_channel"), // 'wechat' | 'alipay' | 'cash' | 'direct'

    // Destination side
    destinationAccountId: uuid("destination_account_id").references(
      () => accounts.id,
      { onDelete: "restrict" }
    ),
    destinationAmount: numeric("destination_amount", { precision: 15, scale: 2 }),
    destinationCurrency: text("destination_currency"),

    // Person & Lending
    personId: uuid("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    personTransferType: text("person_transfer_type"), // 'lend' | 'send' | 'borrow' | 'repay_to_person' | 'repayment_from_person'

    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_transactions_date").on(table.transactionDate),
    index("idx_transactions_type").on(table.type),
    index("idx_transactions_source").on(table.sourceAccountId),
    index("idx_transactions_dest").on(table.destinationAccountId),
    index("idx_transactions_person").on(table.personId),
    index("idx_transactions_parent_cat").on(table.parentCategoryId),
    index("idx_transactions_child_cat").on(table.childCategoryId),
  ]
);

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  sourceTransactions: many(transactions, { relationName: "sourceAccount" }),
  destinationTransactions: many(transactions, {
    relationName: "destinationAccount",
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parentChild",
  }),
  children: many(categories, { relationName: "parentChild" }),
  parentTransactions: many(transactions, {
    relationName: "parentCategoryTransactions",
  }),
  childTransactions: many(transactions, {
    relationName: "childCategoryTransactions",
  }),
}));

export const peopleRelations = relations(people, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  sourceAccount: one(accounts, {
    fields: [transactions.sourceAccountId],
    references: [accounts.id],
    relationName: "sourceAccount",
  }),
  destinationAccount: one(accounts, {
    fields: [transactions.destinationAccountId],
    references: [accounts.id],
    relationName: "destinationAccount",
  }),
  parentCategory: one(categories, {
    fields: [transactions.parentCategoryId],
    references: [categories.id],
    relationName: "parentCategoryTransactions",
  }),
  childCategory: one(categories, {
    fields: [transactions.childCategoryId],
    references: [categories.id],
    relationName: "childCategoryTransactions",
  }),
  person: one(people, {
    fields: [transactions.personId],
    references: [people.id],
  }),
}));
