export interface AttendanceCategory {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceStatus = "IN_PROGRESS" | "COMPLETED";

export interface AttendanceRecord {
  id: string;
  userId: string;
  categoryId: string | null;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  status: AttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecordWithCategory extends AttendanceRecord {
  categoryName: string | null;
}

export interface AttendanceFilterParams {
  categoryId?: string;
  status?: "ALL" | "IN_PROGRESS" | "COMPLETED";
  dateFilter?: "all" | "today" | "this_week" | "this_month";
  search?: string;
}
