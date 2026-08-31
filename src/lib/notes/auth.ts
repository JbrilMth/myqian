import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateSession, isAppLocked, hashToken } from "@/lib/auth/session";

const NOTES_UNLOCKED_COOKIE = "myqian_notes_unlocked";
const NOTES_LAST_ACTIVE_COOKIE = "myqian_notes_last_active";
const FAILED_ATTEMPTS_COOKIE = "myqian_notes_failed_attempts";
const LOCKOUT_COOKIE = "myqian_notes_lockout_until";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds delay after 5 failed attempts

function generateNotesUnlockToken(userId: string): string {
  const secret = process.env.AUTH_SECRET || process.env.DATABASE_URL || "myqian_notes_secret";
  return hashToken(`${userId}:${secret}:notes_unlocked_v1`);
}

/**
 * Check if the user is authenticated and Notes is unlocked, respecting Note-Lock timer and App Lock hierarchy
 */
export async function isNotesUnlocked(userId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();

    // 1. RULE: APP LOCK ALWAYS OVERRIDES NOTE LOCK
    // If the main My Qian application is locked, Notes is guaranteed to be locked
    const appLocked = await isAppLocked();
    if (appLocked) {
      return false;
    }

    // 2. Validate Notes unlock token signature
    const token = cookieStore.get(NOTES_UNLOCKED_COOKIE)?.value;
    if (!token) return false;

    const expectedToken = generateNotesUnlockToken(userId);
    if (token !== expectedToken) return false;

    // 3. Fetch user's configured Note-Lock timeout
    const [user] = await db
      .select({ noteLockTimeout: users.noteLockTimeout })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const timeout = user?.noteLockTimeout || "5m";

    // "never" means: remain unlocked while the main app session remains active
    if (timeout === "never") {
      return true;
    }

    // Check last active timestamp for timed Note-Lock
    const lastActiveStr = cookieStore.get(NOTES_LAST_ACTIVE_COOKIE)?.value;
    if (!lastActiveStr) {
      return false;
    }

    const lastActive = parseInt(lastActiveStr, 10);
    if (isNaN(lastActive)) {
      return false;
    }

    const elapsed = Date.now() - lastActive;

    if (timeout === "immediately") {
      // If immediately, active timestamp must be within the current immediate session window (< 3s)
      return elapsed <= 3000;
    }

    if (timeout === "1m" && elapsed >= 60 * 1000) {
      return false;
    }

    if (timeout === "5m" && elapsed >= 5 * 60 * 1000) {
      return false;
    }

    return true;
  } catch (err) {
    console.error("isNotesUnlocked error:", err);
    return false;
  }
}

/**
 * Set the HTTP-only unlock cookie for Notes and initialize its activity timer
 */
export async function setNotesUnlockedCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = generateNotesUnlockToken(userId);

  cookieStore.set(NOTES_UNLOCKED_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  cookieStore.set(NOTES_LAST_ACTIVE_COOKIE, Date.now().toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  // Clear failed attempt tracking on successful unlock
  cookieStore.delete(FAILED_ATTEMPTS_COOKIE);
  cookieStore.delete(LOCKOUT_COOKIE);
}

/**
 * Updates Notes active timestamp strictly during Notes operations
 */
export async function updateNotesLastActiveCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get(NOTES_UNLOCKED_COOKIE)?.value) {
      cookieStore.set(NOTES_LAST_ACTIVE_COOKIE, Date.now().toString(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
  } catch {
    // Read-only server component contexts ignore cookie mutations safely
  }
}

/**
 * Lock Notes by clearing all Notes unlock and timer cookies
 */
export async function lockNotes(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(NOTES_UNLOCKED_COOKIE);
    cookieStore.delete(NOTES_LAST_ACTIVE_COOKIE);
  } catch {
    // Read-only server component contexts ignore cookie mutations safely
  }
}

/**
 * Check if the user has a Notes passcode configured
 */
export async function hasNotesPasscode(userId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({ notesPasscodeHash: users.notesPasscodeHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return Boolean(user?.notesPasscodeHash);
  } catch (err) {
    console.error("hasNotesPasscode error:", err);
    return false;
  }
}

/**
 * Check brute-force lockout status
 */
async function checkBruteForceLockout(): Promise<{ isLocked: boolean; waitSeconds: number }> {
  const cookieStore = await cookies();
  const lockoutUntilStr = cookieStore.get(LOCKOUT_COOKIE)?.value;

  if (lockoutUntilStr) {
    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    const now = Date.now();
    if (lockoutUntil > now) {
      return {
        isLocked: true,
        waitSeconds: Math.ceil((lockoutUntil - now) / 1000),
      };
    }
  }

  return { isLocked: false, waitSeconds: 0 };
}

/**
 * Record a failed passcode attempt
 */
async function recordFailedAttempt(): Promise<void> {
  const cookieStore = await cookies();
  const attemptsStr = cookieStore.get(FAILED_ATTEMPTS_COOKIE)?.value || "0";
  const attempts = parseInt(attemptsStr, 10) + 1;

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    cookieStore.set(LOCKOUT_COOKIE, lockoutUntil.toString(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60,
    });
    cookieStore.delete(FAILED_ATTEMPTS_COOKIE);
  } else {
    cookieStore.set(FAILED_ATTEMPTS_COOKIE, attempts.toString(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 300,
    });
  }
}

/**
 * Verify a 6-digit Notes Passcode
 */
export async function verifyNotesPasscode(
  userId: string,
  passcode: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Validate format
  if (!/^\d{6}$/.test(passcode)) {
    return { success: false, error: "Passcode must be exactly 6 numeric digits." };
  }

  // 2. Check brute force lockout
  const lockout = await checkBruteForceLockout();
  if (lockout.isLocked) {
    return {
      success: false,
      error: `Too many failed attempts. Please wait ${lockout.waitSeconds} seconds.`,
    };
  }

  // 3. Fetch stored hash
  const [user] = await db
    .select({ notesPasscodeHash: users.notesPasscodeHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.notesPasscodeHash) {
    return { success: false, error: "Notes Passcode is not set up." };
  }

  // 4. Compare hash with bcrypt
  const isValid = await bcrypt.compare(passcode, user.notesPasscodeHash);
  if (!isValid) {
    await recordFailedAttempt();
    return { success: false, error: "Incorrect passcode. Try again." };
  }

  // 5. Unlock notes and start timer
  await setNotesUnlockedCookie(userId);
  return { success: true };
}

/**
 * First-time setup of 6-digit Notes Passcode
 */
export async function setupNotesPasscode(
  userId: string,
  passcode: string
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{6}$/.test(passcode)) {
    return { success: false, error: "Passcode must be exactly 6 numeric digits." };
  }

  // Hash with bcrypt (12 salt rounds)
  const hash = await bcrypt.hash(passcode, 12);

  await db
    .update(users)
    .set({
      notesPasscodeHash: hash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Automatically unlock Notes for the current session and start timer
  await setNotesUnlockedCookie(userId);
  return { success: true };
}

/**
 * Change 6-digit Notes Passcode
 */
export async function changeNotesPasscode(
  userId: string,
  currentPasscode: string,
  newPasscode: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Verify current passcode
  const [user] = await db
    .select({ notesPasscodeHash: users.notesPasscodeHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.notesPasscodeHash) {
    const isCurrentValid = await bcrypt.compare(currentPasscode, user.notesPasscodeHash);
    if (!isCurrentValid) {
      return { success: false, error: "Current passcode is incorrect." };
    }
  }

  // 2. Validate new passcode
  if (!/^\d{6}$/.test(newPasscode)) {
    return { success: false, error: "New passcode must be exactly 6 numeric digits." };
  }

  // 3. Hash and update
  const newHash = await bcrypt.hash(newPasscode, 12);
  await db
    .update(users)
    .set({
      notesPasscodeHash: newHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await setNotesUnlockedCookie(userId);
  return { success: true };
}

/**
 * Update Note-Lock timeout preference
 */
export async function updateNoteLockTimeout(
  userId: string,
  timeout: "immediately" | "1m" | "5m" | "never"
): Promise<void> {
  await db
    .update(users)
    .set({
      noteLockTimeout: timeout,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await updateNotesLastActiveCookie();
}

/**
 * Server-side guard ensuring Notes access is authorized
 */
export async function requireNotesAccess(): Promise<{ userId: string }> {
  const locked = await isAppLocked();
  if (locked) {
    throw new Error("Application is locked.");
  }

  const session = await validateSession();
  if (!session) {
    throw new Error("Unauthorized.");
  }

  const userId = session.user.id;
  const hasPass = await hasNotesPasscode(userId);

  // If user has set up a passcode, Notes must be unlocked
  if (hasPass) {
    const unlocked = await isNotesUnlocked(userId);
    if (!unlocked) {
      throw new Error("NOTES_LOCKED");
    }
  }

  // Update activity timestamp during authorized Notes operations
  await updateNotesLastActiveCookie();

  return { userId };
}
