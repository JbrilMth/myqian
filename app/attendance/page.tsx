import React from "react";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import {
  getAttendanceRecords,
  getAttendanceCategories,
} from "@/lib/attendance/service";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; q?: string }>;
}) {
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  const locked = await isAppLocked();
  if (locked) {
    redirect("/login");
  }

  const userId = session.user.id;
  const resolvedParams = searchParams ? await searchParams : {};
  const categoryId = resolvedParams.category || "all";
  const search = resolvedParams.q || "";

  const [records, categories] = await Promise.all([
    getAttendanceRecords(userId, { categoryId, search }),
    getAttendanceCategories(userId),
  ]);

  return (
    <AttendanceClient
      initialRecords={records}
      initialCategories={categories}
    />
  );
}
