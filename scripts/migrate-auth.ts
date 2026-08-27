import dotenv from "dotenv";
dotenv.config();
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function runAuthMigration() {
  console.log("Starting Auth & User Isolation Migration...");

  // 1. Create users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      auto_lock_timeout TEXT NOT NULL DEFAULT 'never',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  console.log("✓ users table verified");

  // 2. Create passkey_credentials table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_key TEXT NOT NULL,
      counter NUMERIC NOT NULL DEFAULT 0,
      device_type TEXT,
      backed_up BOOLEAN NOT NULL DEFAULT false,
      transports TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      last_used_at TIMESTAMP WITH TIME ZONE
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkey_credentials(user_id);
  `);
  console.log("✓ passkey_credentials table verified");

  // 3. Create sessions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);
  console.log("✓ sessions table verified");

  // 4. Create webauthn_challenges table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id TEXT PRIMARY KEY,
      challenge TEXT NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);
  console.log("✓ webauthn_challenges table verified");

  // 5. Create password_reset_tokens table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  console.log("✓ password_reset_tokens table verified");

  // 6. Add user_id column to existing financial tables
  await db.execute(sql`
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
  `);
  console.log("✓ accounts user_id verified");

  await db.execute(sql`
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
  `);
  console.log("✓ categories user_id verified");

  await db.execute(sql`
    ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_people_user ON people(user_id);
  `);
  console.log("✓ people user_id verified");

  await db.execute(sql`
    ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_user ON exchange_rates(user_id);
  `);
  console.log("✓ exchange_rates user_id verified");

  await db.execute(sql`
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  `);
  console.log("✓ transactions user_id verified");

  console.log("Migration completed successfully with zero data loss!");
  process.exit(0);
}

runAuthMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
