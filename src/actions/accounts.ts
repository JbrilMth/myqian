"use server";

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { safeRevalidatePath } from "@/lib/safe-revalidate";
import { toFixed2, isNonNegative } from "@/lib/finance/decimal";
import { requireAuth } from "@/lib/auth/session";

export async function createAccount(formData: {
  name: string;
  type: string;
  currency: string;
  initialBalance: string;
}) {
  try {
    const user = await requireAuth();

    if (!formData.name?.trim()) {
      return { success: false, error: "Account name is required." };
    }
    if (!formData.currency?.trim()) {
      return { success: false, error: "Currency is required." };
    }
    if (!isNonNegative(formData.initialBalance)) {
      return { success: false, error: "Initial balance cannot be negative." };
    }

    const initial = toFixed2(formData.initialBalance || "0.00");

    await db.insert(accounts).values({
      userId: user.id,
      name: formData.name.trim(),
      type: formData.type || "bank",
      currency: formData.currency.trim().toUpperCase(),
      initialBalance: initial,
      isArchived: false,
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/accounts");
    safeRevalidatePath("/transactions");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to create account:", err);
    return { success: false, error: err.message || "Failed to create account" };
  }
}

export async function updateAccount(
  id: string,
  formData: {
    name: string;
    type: string;
    initialBalance: string;
  }
) {
  try {
    const user = await requireAuth();

    if (!formData.name?.trim()) {
      return { success: false, error: "Account name is required." };
    }
    if (!isNonNegative(formData.initialBalance)) {
      return { success: false, error: "Initial balance cannot be negative." };
    }

    await db
      .update(accounts)
      .set({
        name: formData.name.trim(),
        type: formData.type,
        initialBalance: toFixed2(formData.initialBalance),
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

    safeRevalidatePath("/");
    safeRevalidatePath("/accounts");
    safeRevalidatePath(`/accounts/${id}`);
    safeRevalidatePath("/transactions");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update account:", err);
    return { success: false, error: err.message || "Failed to update account" };
  }
}

export async function toggleArchiveAccount(id: string, isArchived: boolean) {
  try {
    const user = await requireAuth();

    await db
      .update(accounts)
      .set({
        isArchived,
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

    safeRevalidatePath("/");
    safeRevalidatePath("/accounts");
    safeRevalidatePath(`/accounts/${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to toggle archive account:", err);
    return { success: false, error: err.message || "Failed to update status" };
  }
}
