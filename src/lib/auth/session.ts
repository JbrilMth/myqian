import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

const SESSION_COOKIE_NAME = "myqian_session";
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
 * Destroys the current session and clears the cookie
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
  } catch (error) {
    console.error("Destroy session error:", error);
  }
}

/**
 * Helper to require authentication on server routes/actions
 */
export async function requireAuth(): Promise<AuthUser> {
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
