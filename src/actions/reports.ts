"use server";

import {
  getReportTransactions,
  type ReportFilterOptions,
  type ReportDataResult,
} from "@/lib/finance/reports";

export async function fetchReportDataAction(
  filters: ReportFilterOptions
): Promise<{ success: boolean; data?: ReportDataResult; error?: string }> {
  try {
    const data = await getReportTransactions(filters);
    return { success: true, data };
  } catch (err: any) {
    console.error("fetchReportDataAction error:", err);
    return { success: false, error: err.message || "Failed to fetch report data." };
  }
}
