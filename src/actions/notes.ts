"use server";

import { revalidatePath } from "next/cache";
import {
  getNotes,
  getNoteCategories,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  createNoteCategory,
  updateNoteCategory,
  deleteNoteCategory,
} from "@/lib/notes/service";
import type { NoteFilterOptions } from "@/lib/notes/types";

export async function fetchNotesAction(filters: NoteFilterOptions = {}) {
  try {
    const notes = await getNotes(filters);
    return { success: true, notes };
  } catch (err: any) {
    console.error("fetchNotesAction error:", err);
    return { success: false, error: err.message || "Failed to load notes." };
  }
}

export async function fetchNoteCategoriesAction() {
  try {
    const categories = await getNoteCategories();
    return { success: true, categories };
  } catch (err: any) {
    console.error("fetchNoteCategoriesAction error:", err);
    return { success: false, error: err.message || "Failed to load note categories." };
  }
}

export async function createNoteAction(data: {
  title: string;
  content: string;
  categoryId?: string | null;
}) {
  try {
    const note = await createNote(data);
    revalidatePath("/notes");
    return { success: true, note };
  } catch (err: any) {
    console.error("createNoteAction error:", err);
    return { success: false, error: err.message || "Failed to create note." };
  }
}

export async function updateNoteAction(
  id: string,
  data: {
    title: string;
    content: string;
    categoryId?: string | null;
  }
) {
  try {
    const note = await updateNote(id, data);
    revalidatePath("/notes");
    return { success: true, note };
  } catch (err: any) {
    console.error("updateNoteAction error:", err);
    return { success: false, error: err.message || "Failed to update note." };
  }
}

export async function deleteNoteAction(id: string) {
  try {
    await deleteNote(id);
    revalidatePath("/notes");
    return { success: true };
  } catch (err: any) {
    console.error("deleteNoteAction error:", err);
    return { success: false, error: err.message || "Failed to delete note." };
  }
}

export async function createNoteCategoryAction(name: string) {
  try {
    const category = await createNoteCategory(name);
    revalidatePath("/notes");
    return { success: true, category };
  } catch (err: any) {
    console.error("createNoteCategoryAction error:", err);
    return { success: false, error: err.message || "Failed to create note category." };
  }
}

export async function updateNoteCategoryAction(id: string, name: string) {
  try {
    const category = await updateNoteCategory(id, name);
    revalidatePath("/notes");
    return { success: true, category };
  } catch (err: any) {
    console.error("updateNoteCategoryAction error:", err);
    return { success: false, error: err.message || "Failed to update note category." };
  }
}

export async function deleteNoteCategoryAction(
  id: string,
  fallbackCategoryId?: string | null
) {
  try {
    await deleteNoteCategory(id, fallbackCategoryId);
    revalidatePath("/notes");
    return { success: true };
  } catch (err: any) {
    console.error("deleteNoteCategoryAction error:", err);
    return { success: false, error: err.message || "Failed to delete note category." };
  }
}
