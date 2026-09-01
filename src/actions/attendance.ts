"use server";

import { revalidatePath } from "next/cache";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import {
  getAttendanceCategories,
  createAttendanceCategory,
  deleteAttendanceCategory,
  getAttendanceRecords,
  startAttendanceRecord,
  endAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
} from "@/lib/attendance/service";
import type { AttendanceFilterParams } from "@/lib/attendance/types";

async function getAuthUserId(): Promise<string> {
  const locked = await isAppLocked();
  if (locked) {
    throw new Error("Application is locked.");
  }

  const session = await validateSession();
  if (!session) {
    throw new Error("Unauthorized.");
  }

  return session.user.id;
}

export async function fetchAttendanceRecordsAction(
  params: AttendanceFilterParams = {}
) {
  try {
    const userId = await getAuthUserId();
    const records = await getAttendanceRecords(userId, params);
    return { success: true, data: records };
  } catch (err: any) {
    console.error("fetchAttendanceRecordsAction error:", err);
    return { success: false, error: err.message || "Failed to fetch records." };
  }
}

export async function startAttendanceAction(data: {
  title: string;
  categoryId?: string | null;
}) {
  try {
    const userId = await getAuthUserId();
    const record = await startAttendanceRecord(userId, data);
    revalidatePath("/attendance");
    return { success: true, data: record };
  } catch (err: any) {
    console.error("startAttendanceAction error:", err);
    return { success: false, error: err.message || "Failed to start record." };
  }
}

export async function endAttendanceAction(recordId: string) {
  try {
    const userId = await getAuthUserId();
    const record = await endAttendanceRecord(userId, recordId);
    revalidatePath("/attendance");
    return { success: true, data: record };
  } catch (err: any) {
    console.error("endAttendanceAction error:", err);
    return { success: false, error: err.message || "Failed to end record." };
  }
}

export async function updateAttendanceAction(
  recordId: string,
  data: {
    title: string;
    categoryId?: string | null;
  }
) {
  try {
    const userId = await getAuthUserId();
    const record = await updateAttendanceRecord(userId, recordId, data);
    revalidatePath("/attendance");
    return { success: true, data: record };
  } catch (err: any) {
    console.error("updateAttendanceAction error:", err);
    return { success: false, error: err.message || "Failed to update record." };
  }
}

export async function deleteAttendanceAction(recordId: string) {
  try {
    const userId = await getAuthUserId();
    await deleteAttendanceRecord(userId, recordId);
    revalidatePath("/attendance");
    return { success: true };
  } catch (err: any) {
    console.error("deleteAttendanceAction error:", err);
    return { success: false, error: err.message || "Failed to delete record." };
  }
}

export async function fetchAttendanceCategoriesAction() {
  try {
    const userId = await getAuthUserId();
    const categories = await getAttendanceCategories(userId);
    return { success: true, data: categories };
  } catch (err: any) {
    console.error("fetchAttendanceCategoriesAction error:", err);
    return { success: false, error: err.message || "Failed to fetch categories." };
  }
}

export async function createAttendanceCategoryAction(name: string) {
  try {
    const userId = await getAuthUserId();
    const category = await createAttendanceCategory(userId, name);
    revalidatePath("/attendance");
    return { success: true, data: category };
  } catch (err: any) {
    console.error("createAttendanceCategoryAction error:", err);
    return { success: false, error: err.message || "Failed to create category." };
  }
}

export async function deleteAttendanceCategoryAction(categoryId: string) {
  try {
    const userId = await getAuthUserId();
    await deleteAttendanceCategory(userId, categoryId);
    revalidatePath("/attendance");
    return { success: true };
  } catch (err: any) {
    console.error("deleteAttendanceCategoryAction error:", err);
    return { success: false, error: err.message || "Failed to delete category." };
  }
}
