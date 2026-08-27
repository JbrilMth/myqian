"use server";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { safeRevalidatePath } from "@/lib/safe-revalidate";

export async function createCategory(formData: {
  name: string;
  parentId?: string | null;
  type?: string | null;
}) {
  try {
    if (!formData.name?.trim()) {
      return { success: false, error: "Category name is required." };
    }

    await db.insert(categories).values({
      name: formData.name.trim(),
      parentId: formData.parentId || null,
      type: formData.type || "both",
      isArchived: false,
    });

    safeRevalidatePath("/categories");
    safeRevalidatePath("/transactions");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to create category:", err);
    return { success: false, error: err.message || "Failed to create category" };
  }
}

export async function updateCategory(
  id: string,
  formData: {
    name: string;
    parentId?: string | null;
  }
) {
  try {
    if (!formData.name?.trim()) {
      return { success: false, error: "Category name is required." };
    }

    await db
      .update(categories)
      .set({
        name: formData.name.trim(),
        parentId: formData.parentId || null,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));

    safeRevalidatePath("/categories");
    safeRevalidatePath("/transactions");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update category:", err);
    return { success: false, error: err.message || "Failed to update category" };
  }
}

export async function deleteOrArchiveCategory(id: string) {
  try {
    // Check if category is used in transactions
    const used = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        or(
          eq(transactions.parentCategoryId, id),
          eq(transactions.childCategoryId, id)
        )
      )
      .limit(1);

    if (used.length > 0) {
      // Archive instead of hard delete to protect historical integrity
      await db
        .update(categories)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(categories.id, id));

      safeRevalidatePath("/categories");
      safeRevalidatePath("/transactions");
      return {
        success: true,
        message: "Category is referenced in transactions and has been archived.",
      };
    } else {
      // Also check if any child categories exist
      const children = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, id));

      if (children.length > 0) {
        // Archive parent and children
        await db
          .update(categories)
          .set({ isArchived: true, updatedAt: new Date() })
          .where(
            or(eq(categories.id, id), eq(categories.parentId, id))
          );
        safeRevalidatePath("/categories");
        safeRevalidatePath("/transactions");
        return {
          success: true,
          message: "Category and subcategories have been archived.",
        };
      }

      await db.delete(categories).where(eq(categories.id, id));
      safeRevalidatePath("/categories");
      safeRevalidatePath("/transactions");
      return { success: true, message: "Category deleted." };
    }
  } catch (err: any) {
    console.error("Failed to delete category:", err);
    return { success: false, error: err.message || "Failed to delete category" };
  }
}

