"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  createNoteAction,
  updateNoteAction,
  createNoteCategoryAction,
} from "@/actions/notes";
import { Plus, Tag, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteCategory, NoteWithCategory } from "@/lib/notes/types";

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NoteCategory[];
  editNote?: NoteWithCategory | null;
  defaultCategoryId?: string;
  onSuccess: (note: NoteWithCategory, isNewCategory?: NoteCategory) => void;
}

export function NoteModal({
  isOpen,
  onClose,
  categories: initialCategories,
  editNote,
  defaultCategoryId,
  onSuccess,
}: NoteModalProps) {
  const [categories, setCategories] = useState<NoteCategory[]>(initialCategories);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Inline Category Creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isCreatingCatPending, startCatTransition] = useTransition();

  const prevIsOpenRef = useRef(false);
  const prevEditNoteIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Synchronize form state strictly on open or note ID change
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isNoteChanging = isOpen && editNote?.id !== prevEditNoteIdRef.current;

    if (isOpening || isNoteChanging) {
      if (editNote) {
        setTitle(editNote.title || "");
        setContent(editNote.content || "");
        setCategoryId(editNote.categoryId || "");
      } else {
        setTitle("");
        setContent("");
        setCategoryId(defaultCategoryId && defaultCategoryId !== "all" && defaultCategoryId !== "uncategorized" ? defaultCategoryId : (categories[0]?.id || ""));
      }
      setError(null);
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setCategoryError(null);
    }

    prevIsOpenRef.current = isOpen;
    prevEditNoteIdRef.current = editNote?.id;
  }, [isOpen, editNote, defaultCategoryId, categories]);

  const handleCategorySelectChange = (val: string) => {
    if (val === "__create_new__") {
      setIsCreatingCategory(true);
      setCategoryError(null);
      setNewCategoryName("");
    } else {
      setCategoryId(val);
      setIsCreatingCategory(false);
    }
  };

  const handleSaveInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryError("Please enter a category name.");
      return;
    }

    startCatTransition(async () => {
      const res = await createNoteCategoryAction(newCategoryName.trim());
      if (res.success && res.category) {
        setCategories((prev) => [...prev, res.category]);
        setCategoryId(res.category.id);
        setIsCreatingCategory(false);
        setNewCategoryName("");
        setCategoryError(null);
      } else {
        setCategoryError(res.error || "Failed to create category.");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!content.trim()) {
      setError("Note text/content is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      if (editNote) {
        const res = await updateNoteAction(editNote.id, {
          title: title.trim(),
          content: content.trim(),
          categoryId: categoryId || null,
        });
        if (res.success && res.note) {
          onSuccess(res.note);
          onClose();
        } else {
          setError(res.error || "Failed to update note.");
        }
      } else {
        const res = await createNoteAction({
          title: title.trim(),
          content: content.trim(),
          categoryId: categoryId || null,
        });
        if (res.success && res.note) {
          onSuccess(res.note);
          onClose();
        } else {
          setError(res.error || "Failed to create note.");
        }
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editNote ? "Edit Note" : "New Note"}
      description={editNote ? "Update your note and category" : "Record thoughts, ideas, decisions, or daily observations"}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Category Field */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Category
          </label>

          {!isCreatingCategory ? (
            <select
              value={categoryId}
              onChange={(e) => handleCategorySelectChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
            >
              <option value="">No Category (Uncategorized)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__create_new__">+ Create Category...</option>
            </select>
          ) : (
            /* Inline Category Creator */
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Create New Category</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>

              {categoryError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                  {categoryError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Personal, Ideas, Decisions, Daily"
                  autoFocus
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={handleSaveInlineCategory}
                  disabled={isCreatingCatPending}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs disabled:opacity-50"
                >
                  {isCreatingCatPending ? "Creating..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Title Field */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. My decision today, Project idea, Why I shouldn't forget this"
            className="w-full px-3.5 py-2.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
          />
        </div>

        {/* Content Field */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Note / Text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts, observations, notes, or details here..."
            rows={10}
            className="w-full px-3.5 py-3 text-xs leading-relaxed bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden resize-y min-h-[180px] sm:min-h-[220px]"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending ? "Saving..." : editNote ? "Save Changes" : "Save Note"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
