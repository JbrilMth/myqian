import React from "react";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import { hasNotesPasscode, isNotesUnlocked } from "@/lib/notes/auth";
import { getNotes, getNoteCategories } from "@/lib/notes/service";
import { NotesClient } from "@/components/notes/NotesClient";
import { NotesLockScreen } from "@/components/notes/NotesLockScreen";
import { NotesSetupScreen } from "@/components/notes/NotesSetupScreen";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; q?: string }>;
}) {
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const hasPasscode = await hasNotesPasscode(userId);

  // 1. If user hasn't created a 6-digit Notes Passcode yet -> Show Setup Screen
  if (!hasPasscode) {
    return <NotesSetupScreen />;
  }

  // 2. If user has a passcode, verify if Notes is unlocked for this session
  const isUnlocked = await isNotesUnlocked(userId);
  if (!isUnlocked) {
    return <NotesLockScreen />;
  }

  // 3. User is authorized and Notes is unlocked -> Load private Notes data
  const resolvedParams = searchParams ? await searchParams : {};
  const categoryId = resolvedParams.category || "all";
  const search = resolvedParams.q || "";

  const [notes, categories] = await Promise.all([
    getNotes({ categoryId, search, sort: "newest" }),
    getNoteCategories(),
  ]);

  return <NotesClient initialNotes={notes} initialCategories={categories} />;
}
