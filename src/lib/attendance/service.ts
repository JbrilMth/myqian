import { db } from "@/db";
import { attendanceCategories, attendanceRecords } from "@/db/schema";
import { eq, and, desc, sql, ilike, or, gte, lte } from "drizzle-orm";
import type {
  AttendanceCategory,
  AttendanceRecordWithCategory,
  AttendanceFilterParams,
} from "./types";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

/**
 * Fetch all attendance categories for a specific user
 */
export async function getAttendanceCategories(
  userId: string
): Promise<AttendanceCategory[]> {
  const result = await db
    .select()
    .from(attendanceCategories)
    .where(eq(attendanceCategories.userId, userId))
    .orderBy(attendanceCategories.name);

  return result;
}

/**
 * Create a new attendance category
 */
export async function createAttendanceCategory(
  userId: string,
  name: string
): Promise<AttendanceCategory> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name cannot be empty.");
  }

  const [category] = await db
    .insert(attendanceCategories)
    .values({
      userId,
      name: trimmed,
    })
    .returning();

  return category;
}

/**
 * Delete an attendance category
 */
export async function deleteAttendanceCategory(
  userId: string,
  categoryId: string
): Promise<void> {
  await db
    .delete(attendanceCategories)
    .where(
      and(
        eq(attendanceCategories.id, categoryId),
        eq(attendanceCategories.userId, userId)
      )
    );
}

/**
 * Fetch attendance records with filtering, searching, and user ownership
 */
export async function getAttendanceRecords(
  userId: string,
  params: AttendanceFilterParams = {}
): Promise<AttendanceRecordWithCategory[]> {
  const conditions = [eq(attendanceRecords.userId, userId)];

  // Category filter
  if (params.categoryId && params.categoryId !== "all") {
    conditions.push(eq(attendanceRecords.categoryId, params.categoryId));
  }

  // Status filter
  if (params.status && params.status !== "ALL") {
    conditions.push(eq(attendanceRecords.status, params.status));
  }

  // Date filter based on startedAt
  if (params.dateFilter && params.dateFilter !== "all") {
    const now = new Date();
    if (params.dateFilter === "today") {
      const todayStart = startOfDay(now);
      conditions.push(gte(attendanceRecords.startedAt, todayStart));
    } else if (params.dateFilter === "this_week") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      conditions.push(gte(attendanceRecords.startedAt, weekStart));
    } else if (params.dateFilter === "this_month") {
      const monthStart = startOfMonth(now);
      conditions.push(gte(attendanceRecords.startedAt, monthStart));
    }
  }

  // Search filter
  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(attendanceRecords.title, term),
        ilike(attendanceCategories.name, term)
      )!
    );
  }

  const rows = await db
    .select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      categoryId: attendanceRecords.categoryId,
      title: attendanceRecords.title,
      startedAt: attendanceRecords.startedAt,
      endedAt: attendanceRecords.endedAt,
      durationSeconds: attendanceRecords.durationSeconds,
      status: attendanceRecords.status,
      createdAt: attendanceRecords.createdAt,
      updatedAt: attendanceRecords.updatedAt,
      categoryName: attendanceCategories.name,
    })
    .from(attendanceRecords)
    .leftJoin(
      attendanceCategories,
      eq(attendanceRecords.categoryId, attendanceCategories.id)
    )
    .where(and(...conditions))
    .orderBy(
      // In-progress records first, then newest startedAt desc
      sql`CASE WHEN ${attendanceRecords.status} = 'IN_PROGRESS' THEN 0 ELSE 1 END`,
      desc(attendanceRecords.startedAt)
    );

  return rows.map((r) => ({
    ...r,
    status: r.status as "IN_PROGRESS" | "COMPLETED",
  }));
}

/**
 * Start a new attendance record
 */
export async function startAttendanceRecord(
  userId: string,
  data: {
    title: string;
    categoryId?: string | null;
  }
): Promise<AttendanceRecordWithCategory> {
  const trimmedTitle = data.title.trim();
  if (!trimmedTitle) {
    throw new Error("Title cannot be empty.");
  }

  const now = new Date();

  const [inserted] = await db
    .insert(attendanceRecords)
    .values({
      userId,
      title: trimmedTitle,
      categoryId: data.categoryId || null,
      startedAt: now,
      endedAt: null,
      durationSeconds: null,
      status: "IN_PROGRESS",
    })
    .returning();

  let categoryName: string | null = null;
  if (inserted.categoryId) {
    const [cat] = await db
      .select({ name: attendanceCategories.name })
      .from(attendanceCategories)
      .where(
        and(
          eq(attendanceCategories.id, inserted.categoryId),
          eq(attendanceCategories.userId, userId)
        )
      )
      .limit(1);
    categoryName = cat?.name || null;
  }

  return {
    ...inserted,
    status: inserted.status as "IN_PROGRESS" | "COMPLETED",
    categoryName,
  };
}

/**
 * End an in-progress attendance record and calculate duration
 */
export async function endAttendanceRecord(
  userId: string,
  recordId: string
): Promise<AttendanceRecordWithCategory> {
  const [existing] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.id, recordId),
        eq(attendanceRecords.userId, userId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error("Attendance record not found.");
  }

  if (existing.status === "COMPLETED" && existing.endedAt) {
    let catName: string | null = null;
    if (existing.categoryId) {
      const [c] = await db
        .select({ name: attendanceCategories.name })
        .from(attendanceCategories)
        .where(eq(attendanceCategories.id, existing.categoryId))
        .limit(1);
      catName = c?.name || null;
    }
    return {
      ...existing,
      status: "COMPLETED",
      categoryName: catName,
    };
  }

  const endedAt = new Date();
  const startTime = new Date(existing.startedAt).getTime();
  const endTime = endedAt.getTime();
  const durationSeconds = Math.max(0, Math.round((endTime - startTime) / 1000));

  const [updated] = await db
    .update(attendanceRecords)
    .set({
      endedAt,
      durationSeconds,
      status: "COMPLETED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(attendanceRecords.id, recordId),
        eq(attendanceRecords.userId, userId)
      )
    )
    .returning();

  let categoryName: string | null = null;
  if (updated.categoryId) {
    const [cat] = await db
      .select({ name: attendanceCategories.name })
      .from(attendanceCategories)
      .where(eq(attendanceCategories.id, updated.categoryId))
      .limit(1);
    categoryName = cat?.name || null;
  }

  return {
    ...updated,
    status: "COMPLETED",
    categoryName,
  };
}

/**
 * Update title and category of an attendance record
 */
export async function updateAttendanceRecord(
  userId: string,
  recordId: string,
  data: {
    title: string;
    categoryId?: string | null;
  }
): Promise<AttendanceRecordWithCategory> {
  const trimmedTitle = data.title.trim();
  if (!trimmedTitle) {
    throw new Error("Title cannot be empty.");
  }

  const [updated] = await db
    .update(attendanceRecords)
    .set({
      title: trimmedTitle,
      categoryId: data.categoryId || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(attendanceRecords.id, recordId),
        eq(attendanceRecords.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Attendance record not found.");
  }

  let categoryName: string | null = null;
  if (updated.categoryId) {
    const [cat] = await db
      .select({ name: attendanceCategories.name })
      .from(attendanceCategories)
      .where(eq(attendanceCategories.id, updated.categoryId))
      .limit(1);
    categoryName = cat?.name || null;
  }

  return {
    ...updated,
    status: updated.status as "IN_PROGRESS" | "COMPLETED",
    categoryName,
  };
}

/**
 * Delete an attendance record
 */
export async function deleteAttendanceRecord(
  userId: string,
  recordId: string
): Promise<void> {
  await db
    .delete(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.id, recordId),
        eq(attendanceRecords.userId, userId)
      )
    );
}
