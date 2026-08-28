import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

const SESSION_COOKIE_NAME = "myqian_session";
const LOCK_COOKIE_NAME = "myqian_locked";
const LAST_ACTIVE_COOKIE_NAME = "myqian_last_active";
const SESSION_DURATION_DAYS = 30;

export interface AuthUser {
  id: string;
  email: string;
  autoLockTimeout: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generates a cryptographically secure random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a token for secure database storage
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a database session and sets the HTTP-only secure cookie
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const sessionId = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  // Clear any existing lock state and record activity timestamp
  cookieStore.delete(LOCK_COOKIE_NAME);
  cookieStore.set(LAST_ACTIVE_COOKIE_NAME, Date.now().toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });

  return token;
}

/**
 * Validates the current session from request cookies
 */
export async function validateSession(): Promise<{ user: AuthUser } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const sessionId = hashToken(token);

    const result = await db
      .select({
        user: {
          id: users.id,
          email: users.email,
          autoLockTimeout: users.autoLockTimeout,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        session: {
          id: sessions.id,
          expiresAt: sessions.expiresAt,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return { user: result[0].user };
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

/**
 * Sets the application lock cookie on the server
 */
export async function setAppLockedCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(LOCK_COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });
  } catch (error) {
    console.error("Set lock cookie error:", error);
  }
}

/**
 * Clears the application lock cookie on the server and updates last active timestamp
 */
export async function clearAppLockedCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(LOCK_COOKIE_NAME);
    cookieStore.set(LAST_ACTIVE_COOKIE_NAME, Date.now().toString(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });
  } catch (error) {
    console.error("Clear lock cookie error:", error);
  }
}

/**
 * Updates last active timestamp if app is not locked
 */
export async function updateLastActiveCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get(LOCK_COOKIE_NAME)?.value !== "1") {
      cookieStore.set(LAST_ACTIVE_COOKIE_NAME, Date.now().toString(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      });
    }
  } catch (error) {
    console.error("Update last active error:", error);
  }
}

/**
 * Verifies server-side whether the application is currently locked
 */
export async function isAppLocked(): Promise<boolean> {
  try {
    const cookieStore = await cookies();

    // 1. Explicit lock cookie check (set when locked immediately or on timeout)
    if (cookieStore.get(LOCK_COOKIE_NAME)?.value === "1") {
      return true;
    }

    // 2. Validate session and check inactivity timeout
    const session = await validateSession();
    if (!session) return false;

    const timeout = session.user.autoLockTimeout;
    if (!timeout || timeout === "never" || timeout === "immediately") {
      // For "never" and "immediately", locking is event-driven:
      // "immediately" triggers when the user leaves/backgrounds the app, which explicitly sets myqian_locked=1.
      // Active browsing in the foreground should never be locked by elapsed server time.
      return false;
    }

    // 3. For timed modes ("1m", "5m"), check if elapsed time since last activity exceeds the timeout
    const lastActiveStr = cookieStore.get(LAST_ACTIVE_COOKIE_NAME)?.value;
    if (!lastActiveStr) return false;

    const lastActive = parseInt(lastActiveStr, 10);
    if (isNaN(lastActive)) return false;

    const elapsed = Date.now() - lastActive;
    if (timeout === "1m" && elapsed >= 60 * 1000) {
      return true;
    }
    if (timeout === "5m" && elapsed >= 5 * 60 * 1000) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("isAppLocked error:", error);
    return false;
  }
}

/**
 * Destroys the current session and clears all session & lock cookies
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const sessionId = hashToken(token);
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(LOCK_COOKIE_NAME);
    cookieStore.delete(LAST_ACTIVE_COOKIE_NAME);
  } catch (error) {
    console.error("Destroy session error:", error);
  }
}

/**
 * Helper to require authentication and unlocked state on server routes/actions
 */
export async function requireAuth(): Promise<AuthUser> {
  const locked = await isAppLocked();
  if (locked) {
    throw new Error("Application is locked. Please authenticate.");
  }

  const session = await validateSession();
  if (!session) {
    throw new Error("Unauthorized: Please sign in.");
  }
  return session.user;
}

/**
 * Checks if any user exists in the system (for initial registration routing)
 */
export async function hasAnyRegisteredUser(): Promise<boolean> {
  const count = await db.select({ id: users.id }).from(users).limit(1);
  return count.length > 0;
}
