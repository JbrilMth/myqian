import React from "react";
import { getCalendarData } from "@/lib/finance/analysis";
import { CalendarClient } from "@/components/analysis/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const data = await getCalendarData();

  return <CalendarClient initialData={data} />;
}
