"use server";

import {
  getWhereIsMyMoneyData,
  getNetWorthData,
  getAccountBalanceHistoryData,
  getMonthlyReviewData,
  getCalendarData,
  searchEverything,
} from "@/lib/finance/analysis";

export async function fetchWhereIsMyMoneyAction() {
  try {
    const data = await getWhereIsMyMoneyData();
    return { success: true, data };
  } catch (err: any) {
    console.error("fetchWhereIsMyMoneyAction error:", err);
    return { success: false, error: err.message || "Failed to load data." };
  }
}

export async function fetchNetWorthAction(timeRange: string, currency?: string) {
  try {
    const data = await getNetWorthData(timeRange, currency);
    return { success: true, data };
  } catch (err: any) {
    console.error("fetchNetWorthAction error:", err);
    return { success: false, error: err.message || "Failed to load net worth." };
  }
}

export async function fetchAccountBalanceHistoryAction(accountId?: string, timeRange?: string) {
  try {
    const data = await getAccountBalanceHistoryData(accountId, timeRange);
    return { success: true, data };
  } catch (err: any) {
    console.error("fetchAccountBalanceHistoryAction error:", err);
    return { success: false, error: err.message || "Failed to load account history." };
  }
}

export async function fetchMonthlyReviewAction(yearMonth?: string) {
  try {
    const data = await getMonthlyReviewData(yearMonth);
    return { success: true, data };
  } catch (err: any) {
    console.error("fetchMonthlyReviewAction error:", err);
    return { success: false, error: err.message || "Failed to load monthly review." };
  }
}

export async function fetchCalendarAction(yearMonth?: string) {
  try {
    const data = await getCalendarData(yearMonth);
    return { success: true, data };
  } catch (err: any) {
    console.error("fetchCalendarAction error:", err);
    return { success: false, error: err.message || "Failed to load calendar." };
  }
}

export async function searchEverythingAction(query: string) {
  try {
    const data = await searchEverything(query);
    return { success: true, data };
  } catch (err: any) {
    console.error("searchEverythingAction error:", err);
    return { success: false, error: err.message || "Failed to search." };
  }
}
