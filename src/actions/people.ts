"use server";

import { db } from "@/db";
import { people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeRevalidatePath } from "@/lib/safe-revalidate";

export async function createPerson(formData: { name: string; note?: string }) {
  try {
    if (!formData.name?.trim()) {
      return { success: false, error: "Person name is required." };
    }

    await db.insert(people).values({
      name: formData.name.trim(),
      note: formData.note?.trim() || null,
      isArchived: false,
    });

    safeRevalidatePath("/people");
    safeRevalidatePath("/transactions");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to create person:", err);
    return { success: false, error: err.message || "Failed to create person" };
  }
}

export async function updatePerson(
  id: string,
  formData: { name: string; note?: string }
) {
  try {
    if (!formData.name?.trim()) {
      return { success: false, error: "Person name is required." };
    }

    await db
      .update(people)
      .set({
        name: formData.name.trim(),
        note: formData.note?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(people.id, id));

    safeRevalidatePath("/people");
    safeRevalidatePath(`/people/${id}`);
    safeRevalidatePath("/transactions");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update person:", err);
    return { success: false, error: err.message || "Failed to update person" };
  }
}

export async function toggleArchivePerson(id: string, isArchived: boolean) {
  try {
    await db
      .update(people)
      .set({
        isArchived,
        updatedAt: new Date(),
      })
      .where(eq(people.id, id));

    safeRevalidatePath("/people");
    safeRevalidatePath(`/people/${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to toggle archive person:", err);
    return { success: false, error: err.message || "Failed to update status" };
  }
}
