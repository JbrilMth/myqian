"use server";

import { db } from "@/db";
import { accounts, categories, people, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { safeRevalidatePath } from "@/lib/safe-revalidate";
import { toFixed2, isPositive } from "@/lib/finance/decimal";
import { requireAuth } from "@/lib/auth/session";
import type { TransactionType, PaymentChannel, PersonTransferType } from "@/lib/finance/types";

export interface TransactionInput {
  type: TransactionType;
  title: string;
  transactionDate: string; // YYYY-MM-DD
  transactionTime?: string; // HH:mm
  parentCategoryId?: string | null;
  childCategoryId?: string | null;
  sourceAccountId?: string | null;
  sourceAmount?: string | null;
  paymentChannel?: PaymentChannel | null;
  destinationAccountId?: string | null;
  destinationAmount?: string | null;
  personId?: string | null;
  personTransferType?: PersonTransferType | null;
  note?: string | null;
}

export async function createTransaction(data: TransactionInput) {
  try {
    const user = await requireAuth();

    if (!data.title?.trim()) {
      return { success: false, error: "Title is required." };
    }
    if (!data.transactionDate?.trim()) {
      return { success: false, error: "Date is required." };
    }

    // Fetch relevant accounts to get currencies
    let sourceAccount = null;
    let destAccount = null;

    if (data.sourceAccountId) {
      const res = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, data.sourceAccountId), eq(accounts.userId, user.id)))
        .limit(1);
      if (res.length === 0) {
        return { success: false, error: "Source account not found." };
      }
      sourceAccount = res[0];
    }

    if (data.destinationAccountId) {
      const res = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, data.destinationAccountId), eq(accounts.userId, user.id)))
        .limit(1);
      if (res.length === 0) {
        return { success: false, error: "Destination account not found." };
      }
      destAccount = res[0];
    }

    let finalSourceAccountId: string | null = data.sourceAccountId || null;
    let finalSourceAmount: string | null = null;
    let finalSourceCurrency: string | null = sourceAccount ? sourceAccount.currency : null;

    let finalDestAccountId: string | null = data.destinationAccountId || null;
    let finalDestAmount: string | null = null;
    let finalDestCurrency: string | null = destAccount ? destAccount.currency : null;

    switch (data.type) {
      case "expense": {
        if (!sourceAccount) {
          return { success: false, error: "Source funding account is required for an expense." };
        }
        if (!isPositive(data.sourceAmount)) {
          return { success: false, error: "Expense amount must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        break;
      }
      case "income": {
        if (!destAccount) {
          return { success: false, error: "Destination account is required for income." };
        }
        if (!isPositive(data.destinationAmount)) {
          return { success: false, error: "Income amount must be greater than zero." };
        }
        finalDestAmount = toFixed2(data.destinationAmount);
        break;
      }
      case "transfer": {
        if (data.personId) {
          if (!data.personTransferType) {
            return {
              success: false,
              error: "Please specify action.",
            };
          }

          const isSendAction =
            data.personTransferType === "send_with_return" ||
            data.personTransferType === "send_without_return" ||
            data.personTransferType === "lend" ||
            data.personTransferType === "repay_to_person" ||
            data.personTransferType === "send";

          if (isSendAction) {
            if (!sourceAccount) {
              return { success: false, error: "Source account is required when sending money." };
            }
            if (!isPositive(data.sourceAmount)) {
              return { success: false, error: "Transfer amount must be greater than zero." };
            }
            finalSourceAmount = toFixed2(data.sourceAmount);
            finalDestAccountId = null;
            finalDestAmount = null;
            finalDestCurrency = finalSourceCurrency;
          } else {
            if (!destAccount) {
              return { success: false, error: "Destination account is required when receiving money." };
            }
            if (!isPositive(data.destinationAmount)) {
              return { success: false, error: "Transfer amount must be greater than zero." };
            }
            finalDestAmount = toFixed2(data.destinationAmount);
            finalSourceAccountId = null;
            finalSourceAmount = null;
            finalSourceCurrency = finalDestCurrency;
          }
        } else {
          if (!sourceAccount || !destAccount) {
            return {
              success: false,
              error: "Both source and destination accounts are required for an account-to-account transfer.",
            };
          }
          if (data.sourceAccountId === data.destinationAccountId) {
            return { success: false, error: "Source and destination accounts cannot be the same." };
          }
          if (!isPositive(data.sourceAmount)) {
            return { success: false, error: "Transfer amount must be greater than zero." };
          }
          finalSourceAmount = toFixed2(data.sourceAmount);
          finalDestAmount = data.destinationAmount
            ? toFixed2(data.destinationAmount)
            : finalSourceAmount;
        }
        break;
      }
      case "withdrawal": {
        if (!sourceAccount) {
          return { success: false, error: "Source bank/card account is required." };
        }
        if (!destAccount) {
          return { success: false, error: "Destination cash account is required." };
        }
        if (!isPositive(data.sourceAmount)) {
          return { success: false, error: "Amount deducted must be greater than zero." };
        }
        if (!isPositive(data.destinationAmount)) {
          return { success: false, error: "Cash received must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        finalDestAmount = toFixed2(data.destinationAmount);
        break;
      }
      case "deposit": {
        if (!sourceAccount) {
          return { success: false, error: "Cash account is required as source." };
        }
        if (!destAccount) {
          return { success: false, error: "Destination bank account is required." };
        }
        if (!isPositive(data.sourceAmount) || !isPositive(data.destinationAmount)) {
          return { success: false, error: "Deposit amount must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        finalDestAmount = toFixed2(data.destinationAmount);
        break;
      }
      case "top_up": {
        if (!sourceAccount) {
          return { success: false, error: "Funding account is required." };
        }
        if (!destAccount) {
          return { success: false, error: "E-wallet destination is required." };
        }
        if (data.sourceAccountId === data.destinationAccountId) {
          return { success: false, error: "Funding and destination accounts cannot be the same." };
        }
        if (!isPositive(data.sourceAmount)) {
          return { success: false, error: "Top up amount must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        finalDestAmount = finalSourceAmount;
        break;
      }
    }

    await db.insert(transactions).values({
      userId: user.id,
      type: data.type,
      title: data.title.trim(),
      transactionDate: data.transactionDate,
      transactionTime: data.transactionTime?.trim() || null,
      parentCategoryId: data.parentCategoryId || null,
      childCategoryId: data.childCategoryId || null,
      sourceAccountId: finalSourceAccountId,
      sourceAmount: finalSourceAmount,
      sourceCurrency: finalSourceCurrency,
      paymentChannel: data.paymentChannel || null,
      destinationAccountId: finalDestAccountId,
      destinationAmount: finalDestAmount,
      destinationCurrency: finalDestCurrency,
      personId: data.personId || null,
      personTransferType: data.personTransferType || null,
      note: data.note?.trim() || null,
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/accounts");
    if (finalSourceAccountId) safeRevalidatePath(`/accounts/${finalSourceAccountId}`);
    if (finalDestAccountId) safeRevalidatePath(`/accounts/${finalDestAccountId}`);
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/people");
    if (data.personId) safeRevalidatePath(`/people/${data.personId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to create transaction:", err);
    return { success: false, error: err.message || "Failed to create transaction" };
  }
}

export async function updateTransaction(id: string, data: TransactionInput) {
  try {
    const user = await requireAuth();

    if (!data.title?.trim()) {
      return { success: false, error: "Title is required." };
    }
    if (!data.transactionDate?.trim()) {
      return { success: false, error: "Date is required." };
    }

    let sourceAccount = null;
    let destAccount = null;

    if (data.sourceAccountId) {
      const res = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, data.sourceAccountId), eq(accounts.userId, user.id)))
        .limit(1);
      if (res.length > 0) sourceAccount = res[0];
    }

    if (data.destinationAccountId) {
      const res = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, data.destinationAccountId), eq(accounts.userId, user.id)))
        .limit(1);
      if (res.length > 0) destAccount = res[0];
    }

    let finalSourceAccountId: string | null = data.sourceAccountId || null;
    let finalSourceAmount: string | null = null;
    let finalSourceCurrency: string | null = sourceAccount ? sourceAccount.currency : null;

    let finalDestAccountId: string | null = data.destinationAccountId || null;
    let finalDestAmount: string | null = null;
    let finalDestCurrency: string | null = destAccount ? destAccount.currency : null;

    switch (data.type) {
      case "expense": {
        if (!sourceAccount) {
          return { success: false, error: "Source funding account is required for an expense." };
        }
        if (!isPositive(data.sourceAmount)) {
          return { success: false, error: "Expense amount must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        break;
      }
      case "income": {
        if (!destAccount) {
          return { success: false, error: "Destination account is required for income." };
        }
        if (!isPositive(data.destinationAmount)) {
          return { success: false, error: "Income amount must be greater than zero." };
        }
        finalDestAmount = toFixed2(data.destinationAmount);
        break;
      }
      case "transfer": {
        if (data.personId) {
          if (!data.personTransferType) {
            return {
              success: false,
              error: "Please specify action.",
            };
          }

          const isSendAction =
            data.personTransferType === "send_with_return" ||
            data.personTransferType === "send_without_return" ||
            data.personTransferType === "lend" ||
            data.personTransferType === "repay_to_person" ||
            data.personTransferType === "send";

          if (isSendAction) {
            if (!sourceAccount) {
              return { success: false, error: "Source account is required when sending money." };
            }
            if (!isPositive(data.sourceAmount)) {
              return { success: false, error: "Transfer amount must be greater than zero." };
            }
            finalSourceAmount = toFixed2(data.sourceAmount);
            finalDestAccountId = null;
            finalDestAmount = null;
            finalDestCurrency = finalSourceCurrency;
          } else {
            if (!destAccount) {
              return { success: false, error: "Destination account is required when receiving money." };
            }
            if (!isPositive(data.destinationAmount)) {
              return { success: false, error: "Transfer amount must be greater than zero." };
            }
            finalDestAmount = toFixed2(data.destinationAmount);
            finalSourceAccountId = null;
            finalSourceAmount = null;
            finalSourceCurrency = finalDestCurrency;
          }
        } else {
          if (!sourceAccount || !destAccount) {
            return {
              success: false,
              error: "Both source and destination accounts are required for an account-to-account transfer.",
            };
          }
          if (data.sourceAccountId === data.destinationAccountId) {
            return { success: false, error: "Source and destination accounts cannot be the same." };
          }
          if (!isPositive(data.sourceAmount)) {
            return { success: false, error: "Transfer amount must be greater than zero." };
          }
          finalSourceAmount = toFixed2(data.sourceAmount);
          finalDestAmount = data.destinationAmount
            ? toFixed2(data.destinationAmount)
            : finalSourceAmount;
        }
        break;
      }
      case "withdrawal": {
        if (!sourceAccount) {
          return { success: false, error: "Source bank/card account is required." };
        }
        if (!destAccount) {
          return { success: false, error: "Destination cash account is required." };
        }
        if (!isPositive(data.sourceAmount)) {
          return { success: false, error: "Amount deducted must be greater than zero." };
        }
        if (!isPositive(data.destinationAmount)) {
          return { success: false, error: "Cash received must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        finalDestAmount = toFixed2(data.destinationAmount);
        break;
      }
      case "deposit": {
        if (!sourceAccount) {
          return { success: false, error: "Cash account is required as source." };
        }
        if (!destAccount) {
          return { success: false, error: "Destination bank account is required." };
        }
        if (!isPositive(data.sourceAmount) || !isPositive(data.destinationAmount)) {
          return { success: false, error: "Deposit amount must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        finalDestAmount = toFixed2(data.destinationAmount);
        break;
      }
      case "top_up": {
        if (!sourceAccount) {
          return { success: false, error: "Funding account is required." };
        }
        if (!destAccount) {
          return { success: false, error: "E-wallet destination is required." };
        }
        if (data.sourceAccountId === data.destinationAccountId) {
          return { success: false, error: "Funding and destination accounts cannot be the same." };
        }
        if (!isPositive(data.sourceAmount)) {
          return { success: false, error: "Top up amount must be greater than zero." };
        }
        finalSourceAmount = toFixed2(data.sourceAmount);
        finalDestAmount = finalSourceAmount;
        break;
      }
    }

    await db
      .update(transactions)
      .set({
        type: data.type,
        title: data.title.trim(),
        transactionDate: data.transactionDate,
        transactionTime: data.transactionTime?.trim() || null,
        parentCategoryId: data.parentCategoryId || null,
        childCategoryId: data.childCategoryId || null,
        sourceAccountId: finalSourceAccountId,
        sourceAmount: finalSourceAmount,
        sourceCurrency: finalSourceCurrency,
        paymentChannel: data.paymentChannel || null,
        destinationAccountId: finalDestAccountId,
        destinationAmount: finalDestAmount,
        destinationCurrency: finalDestCurrency,
        personId: data.personId || null,
        personTransferType: data.personTransferType || null,
        note: data.note?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

    safeRevalidatePath("/");
    safeRevalidatePath("/accounts");
    if (finalSourceAccountId) safeRevalidatePath(`/accounts/${finalSourceAccountId}`);
    if (finalDestAccountId) safeRevalidatePath(`/accounts/${finalDestAccountId}`);
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/people");
    if (data.personId) safeRevalidatePath(`/people/${data.personId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update transaction:", err);
    return { success: false, error: err.message || "Failed to update transaction" };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const user = await requireAuth();

    const existing = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Transaction not found." };
    }

    const tx = existing[0];
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

    safeRevalidatePath("/");
    safeRevalidatePath("/accounts");
    if (tx.sourceAccountId) safeRevalidatePath(`/accounts/${tx.sourceAccountId}`);
    if (tx.destinationAccountId) safeRevalidatePath(`/accounts/${tx.destinationAccountId}`);
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/people");
    if (tx.personId) safeRevalidatePath(`/people/${tx.personId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete transaction:", err);
    return { success: false, error: err.message || "Failed to delete transaction" };
  }
}
