import { db } from "@/db";
import { noteCategories, notes } from "@/db/schema";
import { eq, and, desc, asc, isNull, sql } from "drizzle-orm";
import { validateSession, isAppLocked } from "@/lib/auth/session";
import { hasNotesPasscode, isNotesUnlocked } from "./auth";
import type {
  NoteCategory,
  NoteWithCategory,
  NoteFilterOptions,
} from "./types";

/**
 * Helper to get current authenticated user ID if session is active, unlocked, and Notes is unlocked
 */
async function getCurrentUserId(): Promise<string | null> {
  const locked = await isAppLocked();
  if (locked) return null;

  const session = await validateSession();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const hasPass = await hasNotesPasscode(userId);
  if (hasPass) {
    const unlocked = await isNotesUnlocked(userId);
    if (!unlocked) {
      return null;
    }
  }

  return userId;
}

/**
 * Fetch all note categories for the authenticated user with note count
 */
export async function getNoteCategories(): Promise<NoteCategory[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const categories = await db
    .select()
    .from(noteCategories)
    .where(eq(noteCategories.userId, userId))
    .orderBy(asc(noteCategories.name));

  if (categories.length === 0) return [];

  // Count notes in each category
  const noteCounts = await db
    .select({
      categoryId: notes.categoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(notes)
    .where(eq(notes.userId, userId))
    .groupBy(notes.categoryId);

  const countMap = new Map<string, number>();
  for (const row of noteCounts) {
    if (row.categoryId) {
      countMap.set(row.categoryId, Number(row.count) || 0);
    }
  }

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    notesCount: countMap.get(cat.id) || 0,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));
}

/**
 * Fetch notes for the authenticated user with filtering, search, and sorting
 */
export async function getNotes(
  filters: NoteFilterOptions = {}
): Promise<NoteWithCategory[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const conditions = [eq(notes.userId, userId)];

  // Category filter
  if (filters.categoryId && filters.categoryId !== "all") {
    if (filters.categoryId === "uncategorized") {
      conditions.push(isNull(notes.categoryId));
    } else {
      conditions.push(eq(notes.categoryId, filters.categoryId));
    }
  }

  // Text search (case-insensitive across title and content)
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    conditions.push(
      sql`(LOWER(${notes.title}) LIKE ${term} OR LOWER(${notes.content}) LIKE ${term})`
    );
  }

  const sortOrder =
    filters.sort === "oldest"
      ? [asc(notes.createdAt)]
      : [desc(notes.createdAt)];

  const results = await db
    .select({
      id: notes.id,
      categoryId: notes.categoryId,
      categoryName: noteCategories.name,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .leftJoin(noteCategories, eq(notes.categoryId, noteCategories.id))
    .where(and(...conditions))
    .orderBy(...sortOrder);

  return results.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    title: r.title,
    content: r.content,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Fetch a single note by ID
 */
export async function getNoteById(id: string): Promise<NoteWithCategory | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const [note] = await db
    .select({
      id: notes.id,
      categoryId: notes.categoryId,
      categoryName: noteCategories.name,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .leftJoin(noteCategories, eq(notes.categoryId, noteCategories.id))
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .limit(1);

  if (!note) return null;

  return {
    id: note.id,
    categoryId: note.categoryId,
    categoryName: note.categoryName,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Create a new note
 */
export async function createNote(data: {
  title: string;
  content: string;
  categoryId?: string | null;
}): Promise<NoteWithCategory> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const trimmedTitle = data.title.trim();
  const trimmedContent = data.content.trim();

  if (!trimmedTitle) throw new Error("Title is required");
  if (!trimmedContent) throw new Error("Note content is required");

  const [newNote] = await db
    .insert(notes)
    .values({
      userId,
      title: trimmedTitle,
      content: trimmedContent,
      categoryId: data.categoryId || null,
    })
    .returning();

  let categoryName: string | null = null;
  if (newNote.categoryId) {
    const [cat] = await db
      .select({ name: noteCategories.name })
      .from(noteCategories)
      .where(eq(noteCategories.id, newNote.categoryId))
      .limit(1);
    categoryName = cat?.name || null;
  }

  return {
    id: newNote.id,
    categoryId: newNote.categoryId,
    categoryName,
    title: newNote.title,
    content: newNote.content,
    createdAt: newNote.createdAt,
    updatedAt: newNote.updatedAt,
  };
}

/**
 * Update an existing note
 */
export async function updateNote(
  id: string,
  data: {
    title: string;
    content: string;
    categoryId?: string | null;
  }
): Promise<NoteWithCategory> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const trimmedTitle = data.title.trim();
  const trimmedContent = data.content.trim();

  if (!trimmedTitle) throw new Error("Title is required");
  if (!trimmedContent) throw new Error("Note content is required");

  const [updated] = await db
    .update(notes)
    .set({
      title: trimmedTitle,
      content: trimmedContent,
      categoryId: data.categoryId || null,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();

  if (!updated) throw new Error("Note not found or unauthorized");

  let categoryName: string | null = null;
  if (updated.categoryId) {
    const [cat] = await db
      .select({ name: noteCategories.name })
      .from(noteCategories)
      .where(eq(noteCategories.id, updated.categoryId))
      .limit(1);
    categoryName = cat?.name || null;
  }

  return {
    id: updated.id,
    categoryId: updated.categoryId,
    categoryName,
    title: updated.title,
    content: updated.content,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();

  return deleted.length > 0;
}

/**
 * Create a new note category
 */
export async function createNoteCategory(name: string): Promise<NoteCategory> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Category name is required");

  const [cat] = await db
    .insert(noteCategories)
    .values({
      userId,
      name: trimmedName,
    })
    .returning();

  return {
    id: cat.id,
    name: cat.name,
    notesCount: 0,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
}

/**
 * Update/rename an existing note category
 */
export async function updateNoteCategory(
  id: string,
  name: string
): Promise<NoteCategory> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Category name is required");

  const [updated] = await db
    .update(noteCategories)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(and(eq(noteCategories.id, id), eq(noteCategories.userId, userId)))
    .returning();

  if (!updated) throw new Error("Category not found or unauthorized");

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.categoryId, id)));

  return {
    id: updated.id,
    name: updated.name,
    notesCount: Number(countRow?.count) || 0,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete a note category with safe note reassignment
 */
export async function deleteNoteCategory(
  id: string,
  fallbackCategoryId?: string | null
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Reassign any existing notes belonging to this category
  await db
    .update(notes)
    .set({
      categoryId: fallbackCategoryId || null,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.categoryId, id), eq(notes.userId, userId)));

  // Delete the category safely
  const deleted = await db
    .delete(noteCategories)
    .where(and(eq(noteCategories.id, id), eq(noteCategories.userId, userId)))
    .returning();

  return deleted.length > 0;
}
