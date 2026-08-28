"use server";

import { db } from "@/db";
import {
  users,
  accounts,
  categories,
  people,
  transactions,
  exchangeRates,
  passkeyCredentials,
  passwordResetTokens,
} from "@/db/schema";
import { eq, isNull, and, gt } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  destroySession,
  validateSession,
  requireAuth,
  hasAnyRegisteredUser,
  setAppLockedCookie,
  clearAppLockedCookie,
  updateLastActiveCookie,
  isAppLocked,
} from "@/lib/auth/session";
import {
  createPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  createPasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "@/lib/auth/webauthn";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Claims existing financial data created before authentication was enabled
 */
export async function claimOrphanDataForUser(userId: string) {
  try {
    await db.update(accounts).set({ userId }).where(isNull(accounts.userId));
    await db.update(categories).set({ userId }).where(isNull(categories.userId));
    await db.update(people).set({ userId }).where(isNull(people.userId));
    await db.update(transactions).set({ userId }).where(isNull(transactions.userId));
    await db.update(exchangeRates).set({ userId }).where(isNull(exchangeRates.userId));
  } catch (err) {
    console.error("Error claiming orphan data:", err);
  }
}

/**
 * First-time user registration
 */
export async function register(
  emailInput: string,
  passwordInput: string,
  confirmPasswordInput: string
): Promise<ActionResult> {
  try {
    const email = emailInput?.trim().toLowerCase();
    const password = passwordInput?.trim();
    const confirmPassword = confirmPasswordInput?.trim();

    if (!email || !email.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    if (password !== confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    // Check if user already exists
    const hasUsers = await hasAnyRegisteredUser();
    if (hasUsers) {
      return {
        success: false,
        error: "An account has already been registered on this instance.",
      };
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
      })
      .returning();

    // Associate all existing financial data with this newly created user
    await claimOrphanDataForUser(newUser.id);

    // Create session and log in
    await createSession(newUser.id);

    return { success: true };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { success: false, error: err.message || "Failed to create account." };
  }
}

/**
 * Sign in with email and password
 */
export async function loginWithPassword(
  emailInput: string,
  passwordInput: string
): Promise<ActionResult> {
  try {
    const email = emailInput?.trim().toLowerCase();
    const password = passwordInput?.trim();

    if (!email || !password) {
      return { success: false, error: "Email and password are required." };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Invalid email or password." };
    }

    // Ensure any orphan data is associated
    await claimOrphanDataForUser(user.id);

    await createSession(user.id);
    await clearAppLockedCookie();
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: any) {
    console.error("Login error:", err);
    return { success: false, error: err.message || "Failed to sign in." };
  }
}

/**
 * Log out
 */
export async function logout(): Promise<ActionResult> {
  try {
    await destroySession();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to log out." };
  }
}

/**
 * Explicitly locks the application session
 */
export async function lockApp(): Promise<ActionResult> {
  try {
    await setAppLockedCookie();
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Lock app error:", err);
    return { success: false, error: err.message || "Failed to lock application." };
  }
}

/**
 * Unlocks the application session with master password
 */
export async function unlockWithPassword(passwordInput: string): Promise<ActionResult> {
  try {
    const session = await validateSession();
    if (!session) {
      return { success: false, error: "No active session found. Please sign in." };
    }

    const password = passwordInput?.trim();
    if (!password) {
      return { success: false, error: "Password is required." };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Incorrect master password." };
    }

    await clearAppLockedCookie();
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Unlock error:", err);
    return { success: false, error: err.message || "Failed to unlock application." };
  }
}

/**
 * Updates last active timestamp if app is unlocked
 */
export async function updateLastActive(): Promise<ActionResult> {
  try {
    await updateLastActiveCookie();
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Check if the instance has any passkeys configured (to show Face ID button on login)
 */
export async function getGlobalPasskeyAvailability(): Promise<boolean> {
  try {
    const count = await db.select({ id: passkeyCredentials.id }).from(passkeyCredentials).limit(1);
    return count.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check passkey status for current authenticated user
 */
export async function getUserSecurityStatus(): Promise<{
  hasPasskey: boolean;
  autoLockTimeout: string;
  email: string;
  isLocked: boolean;
}> {
  try {
    const session = await validateSession();
    if (!session) {
      return {
        hasPasskey: false,
        autoLockTimeout: "never",
        email: "",
        isLocked: false,
      };
    }
    const user = session.user;
    const userPasskeys = await db
      .select({ id: passkeyCredentials.id })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, user.id));

    const locked = await isAppLocked();

    return {
      hasPasskey: userPasskeys.length > 0,
      autoLockTimeout: user.autoLockTimeout,
      email: user.email,
      isLocked: locked,
    };
  } catch {
    return {
      hasPasskey: false,
      autoLockTimeout: "never",
      email: "",
      isLocked: false,
    };
  }
}

/**
 * Step 1: Start WebAuthn registration (Enable Face ID)
 */
export async function startPasskeyRegistration(): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const data = await createPasskeyRegistrationOptions(user);
    return { success: true, data };
  } catch (err: any) {
    console.error("Start passkey registration error:", err);
    return { success: false, error: err.message || "Failed to initiate Face ID setup." };
  }
}

/**
 * Step 2: Finish WebAuthn registration
 */
export async function finishPasskeyRegistration(
  challengeId: string,
  response: any
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const result = await verifyPasskeyRegistration(user, challengeId, response);
    if (!result.verified) {
      return { success: false, error: result.error || "Failed to verify Face ID passkey." };
    }
    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    console.error("Finish passkey registration error:", err);
    return { success: false, error: err.message || "Failed to register Face ID passkey." };
  }
}

/**
 * Remove all passkeys for the user (Disable Face ID)
 */
export async function disablePasskey(): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await db.delete(passkeyCredentials).where(eq(passkeyCredentials.userId, user.id));
    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to disable Face ID." };
  }
}

/**
 * Step 1: Start WebAuthn authentication (Sign in with Face ID)
 */
export async function startPasskeyAuth(): Promise<ActionResult> {
  try {
    const data = await createPasskeyAuthenticationOptions();
    return { success: true, data };
  } catch (err: any) {
    console.error("Start passkey auth error:", err);
    return { success: false, error: err.message || "Failed to initiate Face ID login." };
  }
}

/**
 * Step 2: Finish WebAuthn authentication
 */
export async function finishPasskeyAuth(
  challengeId: string,
  response: any
): Promise<ActionResult> {
  try {
    const result = await verifyPasskeyAuthentication(challengeId, response);
    if (!result.verified || !result.userId) {
      return { success: false, error: result.error || "Face ID authentication failed." };
    }

    await claimOrphanDataForUser(result.userId);
    await createSession(result.userId);
    await clearAppLockedCookie();
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: any) {
    console.error("Finish passkey auth error:", err);
    return { success: false, error: err.message || "Face ID authentication failed." };
  }
}

/**
 * Change password in Settings
 */
export async function changePassword(
  currentPasswordInput: string,
  newPasswordInput: string,
  confirmNewPasswordInput: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const currentPassword = currentPasswordInput?.trim();
    const newPassword = newPasswordInput?.trim();
    const confirmNewPassword = confirmNewPasswordInput?.trim();

    if (!currentPassword || !newPassword) {
      return { success: false, error: "All password fields are required." };
    }

    if (newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters." };
    }

    if (newPassword !== confirmNewPassword) {
      return { success: false, error: "New passwords do not match." };
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return { success: false, error: "User not found." };
    }

    const isMatch = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Current password is incorrect." };
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update password." };
  }
}

/**
 * Update Auto-Lock Timeout preference
 */
export async function updateAutoLockTimeout(
  timeout: "immediately" | "1m" | "5m" | "never"
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await db
      .update(users)
      .set({ autoLockTimeout: timeout, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await updateLastActiveCookie();
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update auto-lock." };
  }
}

/**
 * Password Reset Request
 */
export async function requestPasswordReset(emailInput: string): Promise<ActionResult> {
  try {
    const email = emailInput?.trim().toLowerCase();
    if (!email) {
      return { success: false, error: "Please enter your email." };
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Note: Do not leak whether user exists; always return success
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // In local / single-user environment without SMTP configured, return token in data for instant recovery
      return {
        success: true,
        data: {
          resetToken,
          message: "Password reset link generated.",
        },
      };
    }

    return { success: true, data: { message: "If an account exists, instructions have been sent." } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to process request." };
  }
}

/**
 * Complete Password Reset with Token
 */
export async function completePasswordReset(
  tokenInput: string,
  newPasswordInput: string,
  confirmNewPasswordInput: string
): Promise<ActionResult> {
  try {
    const token = tokenInput?.trim();
    const newPassword = newPasswordInput?.trim();
    const confirmNewPassword = confirmNewPasswordInput?.trim();

    if (!token || !newPassword) {
      return { success: false, error: "Token and new password are required." };
    }

    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    if (newPassword !== confirmNewPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetRecord) {
      return { success: false, error: "Invalid or expired password reset link." };
    }

    const newHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.userId));

    // Invalidate reset token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetRecord.id));

    // Create session
    await createSession(resetRecord.userId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reset password." };
  }
}
