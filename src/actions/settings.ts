"use server";

import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { safeRevalidatePath } from "@/lib/safe-revalidate";
import { toDecimal, isPositive } from "@/lib/finance/decimal";
import { requireAuth } from "@/lib/auth/session";

export async function upsertExchangeRate(formData: {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
}) {
  try {
    const user = await requireAuth();

    const from = formData.fromCurrency.trim().toUpperCase();
    const to = formData.toCurrency.trim().toUpperCase();
    if (!from || !to) {
      return { success: false, error: "Currencies are required." };
    }
    if (from === to) {
      return { success: false, error: "Currencies must be different." };
    }
    if (!isPositive(formData.rate)) {
      return { success: false, error: "Exchange rate must be positive." };
    }

    const rateVal = toDecimal(formData.rate).toFixed(6);

    // Check existing for this user
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.userId, user.id),
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(exchangeRates)
        .set({
          rate: rateVal,
          updatedAt: new Date(),
        })
        .where(and(eq(exchangeRates.id, existing[0].id), eq(exchangeRates.userId, user.id)));
    } else {
      await db.insert(exchangeRates).values({
        userId: user.id,
        fromCurrency: from,
        toCurrency: to,
        rate: rateVal,
      });
    }

    safeRevalidatePath("/settings");
    safeRevalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update exchange rate:", err);
    return { success: false, error: err.message || "Failed to update exchange rate" };
  }
}

export async function deleteExchangeRate(id: string) {
  try {
    const user = await requireAuth();

    await db
      .delete(exchangeRates)
      .where(and(eq(exchangeRates.id, id), eq(exchangeRates.userId, user.id)));

    safeRevalidatePath("/settings");
    safeRevalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete exchange rate:", err);
    return { success: false, error: err.message || "Failed to delete exchange rate" };
  }
}
