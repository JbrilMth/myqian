"use server";

import { revalidatePath } from "next/cache";
import { validateSession } from "@/lib/auth/session";
import {
  hasNotesPasscode,
  isNotesUnlocked,
  verifyNotesPasscode,
  setupNotesPasscode,
  changeNotesPasscode,
  lockNotes,
} from "@/lib/notes/auth";

export async function getNotesSecurityStatusAction() {
  try {
    const session = await validateSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const hasPass = await hasNotesPasscode(userId);
    const unlocked = hasPass ? await isNotesUnlocked(userId) : true;

    return {
      success: true,
      hasPasscode: hasPass,
      isUnlocked: unlocked,
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
