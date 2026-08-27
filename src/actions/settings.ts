"use server";

import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { safeRevalidatePath } from "@/lib/safe-revalidate";
import { toDecimal, isPositive } from "@/lib/finance/decimal";

export async function upsertExchangeRate(formData: {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
}) {
  try {
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

    // Check existing
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
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
        .where(eq(exchangeRates.id, existing[0].id));
    } else {
      await db.insert(exchangeRates).values({
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
    await db.delete(exchangeRates).where(eq(exchangeRates.id, id));
    safeRevalidatePath("/settings");
    safeRevalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete exchange rate:", err);
    return { success: false, error: err.message || "Failed to delete exchange rate" };
  }
}
