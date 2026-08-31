"use server";

import { revalidatePath } from "next/cache";
import { validateSession } from "@/lib/auth/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  hasNotesPasscode,
  isNotesUnlocked,
  verifyNotesPasscode,
  setupNotesPasscode,
  changeNotesPasscode,
  lockNotes,
  updateNoteLockTimeout,
  updateNotesLastActiveCookie,
} from "@/lib/notes/auth";

export async function getNotesSecurityStatusAction() {
  try {
    const session = await validateSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const [hasPass, [dbUser]] = await Promise.all([
      hasNotesPasscode(userId),
      db
        .select({ noteLockTimeout: users.noteLockTimeout })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    ]);

    const unlocked = hasPass ? await isNotesUnlocked(userId) : true;

    return {
      success: true,
      hasPasscode: hasPass,
      isUnlocked: unlocked,
      noteLockTimeout: dbUser?.noteLockTimeout || "5m",
    };
  } catch (err: any) {
    console.error("getNotesSecurityStatusAction error:", err);
    return { success: false, error: err.message || "Failed to check Notes security." };
  }
}

export async function unlockNotesAction(passcode: string) {
  try {
    const session = await validateSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const res = await verifyNotesPasscode(session.user.id, passcode);
    if (res.success) {
      revalidatePath("/notes");
    }
    return res;
  } catch (err: any) {
    console.error("unlockNotesAction error:", err);
    return { success: false, error: err.message || "Failed to unlock Notes." };
  }
}

export async function setupNotesPasscodeAction(
  passcode: string,
  confirmPasscode: string
) {
  try {
    const session = await validateSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (passcode !== confirmPasscode) {
      return { success: false, error: "Passcodes do not match." };
    }

    const res = await setupNotesPasscode(session.user.id, passcode);
    if (res.success) {
      revalidatePath("/notes");
      revalidatePath("/settings");
    }
    return res;
  } catch (err: any) {
    console.error("setupNotesPasscodeAction error:", err);
    return { success: false, error: err.message || "Failed to setup passcode." };
  }
}

export async function changeNotesPasscodeAction(
  currentPasscode: string,
  newPasscode: string,
  confirmNewPasscode: string
) {
  try {
    const session = await validateSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (newPasscode !== confirmNewPasscode) {
      return { success: false, error: "New passcodes do not match." };
    }

    const res = await changeNotesPasscode(
      session.user.id,
      currentPasscode,
      newPasscode
    );
    if (res.success) {
      revalidatePath("/notes");
      revalidatePath("/settings");
    }
    return res;
  } catch (err: any) {
    console.error("changeNotesPasscodeAction error:", err);
    return { success: false, error: err.message || "Failed to change passcode." };
  }
}

export async function updateNoteLockTimeoutAction(
  timeout: "immediately" | "1m" | "5m" | "never"
) {
  try {
    const session = await validateSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await updateNoteLockTimeout(session.user.id, timeout);
    revalidatePath("/settings");
    revalidatePath("/notes");
    return { success: true };
  } catch (err: any) {
    console.error("updateNoteLockTimeoutAction error:", err);
    return { success: false, error: err.message || "Failed to update Note-Lock." };
  }
}

export async function lockNotesAction() {
  try {
    await lockNotes();
    revalidatePath("/notes");
    return { success: true };
  } catch (err: any) {
    console.error("lockNotesAction error:", err);
    return { success: false, error: err.message || "Failed to lock Notes." };
  }
}

export async function touchNotesActiveAction() {
  try {
    await updateNotesLastActiveCookie();
    return { success: true };
  } catch {
    return { success: false };
  }
}
