import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  date,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ----------------------------------------------------
// USERS & AUTHENTICATION TABLES
// ----------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  autoLockTimeout: text("auto_lock_timeout").notNull().default("never"), // 'immediately' | '1m' | '5m' | 'never'
  noteLockTimeout: text("note_lock_timeout").notNull().default("5m"), // 'immediately' | '1m' | '5m' | 'never'
  notesPasscodeHash: text("notes_passcode_hash"), // 6-digit Notes Passcode hash (null if not yet set up)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const passkeyCredentials = pgTable(
  "passkey_credentials",
  {
    id: text("id").primaryKey(), // base64url credential ID
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    publicKey: text("public_key").notNull(), // base64url encoded public key
    counter: numeric("counter").notNull().default("0"),
    deviceType: text("device_type"), // 'singleDevice' | 'multiDevice'
    backedUp: boolean("backed_up").notNull().default(false),
    transports: text("transports"), // JSON string e.g. ["internal", "hybrid"]
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("idx_passkeys_user").on(table.userId)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // session token hash
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_sessions_user").on(table.userId)]
);

export const webauthnChallenges = pgTable(
  "webauthn_challenges",
  {
    id: text("id").primaryKey(), // challenge session identifier
    challenge: text("challenge").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("idx_challenges_user").on(table.userId)]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(), // token identifier
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_reset_tokens_user").on(table.userId)]
);

// ----------------------------------------------------
// FINANCIAL TABLES (WITH USER ISOLATION)
// ----------------------------------------------------

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
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
    index("idx_accounts_user").on(table.userId),
    index("idx_accounts_currency").on(table.currency),
    index("idx_accounts_archived").on(table.isArchived),
  ]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
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
    index("idx_categories_user").on(table.userId),
    index("idx_categories_parent").on(table.parentId),
    index("idx_categories_archived").on(table.isArchived),
  ]
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
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
  (table) => [
    index("idx_people_user").on(table.userId),
    index("idx_people_archived").on(table.isArchived),
  ]
);

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: numeric("rate", { precision: 15, scale: 6 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_exchange_rates_user").on(table.userId)]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
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
    personTransferType: text("person_transfer_type"), // 'send_with_return' | 'send_without_return' | 'receive_with_return' | 'receive_without_return' | 'lend' | 'send' | 'borrow' | 'repay_to_person' | 'repayment_from_person'

    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_transactions_user").on(table.userId),
    index("idx_transactions_date").on(table.transactionDate),
    index("idx_transactions_type").on(table.type),
    index("idx_transactions_source").on(table.sourceAccountId),
    index("idx_transactions_dest").on(table.destinationAccountId),
    index("idx_transactions_person").on(table.personId),
    index("idx_transactions_parent_cat").on(table.parentCategoryId),
    index("idx_transactions_child_cat").on(table.childCategoryId),
  ]
);

// ----------------------------------------------------
// RELATIONS
// ----------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  passkeys: many(passkeyCredentials),
  sessions: many(sessions),
  accounts: many(accounts),
  categories: many(categories),
  people: many(people),
  transactions: many(transactions),
  exchangeRates: many(exchangeRates),
}));

export const passkeyCredentialsRelations = relations(
  passkeyCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [passkeyCredentials.userId],
      references: [users.id],
    }),
  })
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  sourceTransactions: many(transactions, { relationName: "sourceAccount" }),
  destinationTransactions: many(transactions, {
    relationName: "destinationAccount",
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
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

export const peopleRelations = relations(people, ({ one, many }) => ({
  user: one(users, {
    fields: [people.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  user: one(users, {
    fields: [exchangeRates.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
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

// ----------------------------------------------------
// NOTES & NOTE CATEGORIES TABLES (SEPARATED FROM FINANCIAL DATA)
// ----------------------------------------------------

export const noteCategories = pgTable(
  "note_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_note_categories_user").on(table.userId),
  ]
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id").references(() => noteCategories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_notes_user").on(table.userId),
    index("idx_notes_category").on(table.categoryId),
    index("idx_notes_created_at").on(table.createdAt),
  ]
);

export const noteCategoriesRelations = relations(noteCategories, ({ one, many }) => ({
  user: one(users, {
    fields: [noteCategories.userId],
    references: [users.id],
  }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  category: one(noteCategories, {
    fields: [notes.categoryId],
    references: [noteCategories.id],
  }),
}));

// ----------------------------------------------------
// ATTENDANCE TABLES (ISOLATED SYSTEM)
// ----------------------------------------------------

export const attendanceCategories = pgTable(
  "attendance_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_att_cat_user").on(table.userId),
  ]
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id").references(() => attendanceCategories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    status: text("status").notNull().default("IN_PROGRESS"), // 'IN_PROGRESS' | 'COMPLETED'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_att_rec_user").on(table.userId),
    index("idx_att_rec_user_status").on(table.userId, table.status),
    index("idx_att_rec_started_at").on(table.startedAt),
  ]
);

export const attendanceCategoriesRelations = relations(
  attendanceCategories,
  ({ one, many }) => ({
    user: one(users, {
      fields: [attendanceCategories.userId],
      references: [users.id],
    }),
    records: many(attendanceRecords),
  })
);

export const attendanceRecordsRelations = relations(
  attendanceRecords,
  ({ one }) => ({
    user: one(users, {
      fields: [attendanceRecords.userId],
      references: [users.id],
    }),
    category: one(attendanceCategories, {
      fields: [attendanceRecords.categoryId],
      references: [attendanceCategories.id],
    }),
  })
);

