"use client";

import React, { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  createNoteCategoryAction,
  updateNoteCategoryAction,
  deleteNoteCategoryAction,
} from "@/actions/notes";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteCategory } from "@/lib/notes/types";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NoteCategory[];
  onCategoriesChange: (categories: NoteCategory[]) => void;
}

export function ManageCategoriesModal({
  isOpen,
  onClose,
  categories,
  onCategoriesChange,
}: ManageCategoriesModalProps) {
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setError(null);
    startTransition(async () => {
      const res = await createNoteCategoryAction(newCatName.trim());
      if (res.success && res.category) {
        onCategoriesChange([...categories, res.category]);
        setNewCatName("");
      } else {
        setError(res.error || "Failed to create category.");
      }
    });
  };

  const handleStartEdit = (cat: NoteCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setDeletingId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;

    setError(null);
    startTransition(async () => {
      const res = await updateNoteCategoryAction(id, editingName.trim());
      if (res.success && res.category) {
        onCategoriesChange(
          categories.map((c) => (c.id === id ? res.category! : c))
        );
        setEditingId(null);
        setEditingName("");
      } else {
        setError(res.error || "Failed to update category.");
      }
    });
  };

  const handleDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await deleteNoteCategoryAction(id, null); // safely sets notes to Uncategorized
      if (res.success) {
        onCategoriesChange(categories.filter((c) => c.id !== id));
        setDeletingId(null);
      } else {
        setError(res.error || "Failed to delete category.");
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Note Categories"
      description="Create, rename, or remove categories to organize your notes"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Add New Category Input */}
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New Category Name (e.g. Personal, Ideas)..."
            className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden"
          />
          <button
            type="submit"
            disabled={isPending || !newCatName.trim()}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold text-xs shadow-2xs transition-all disabled:opacity-40 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Categories List */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 max-h-[50vh] overflow-y-auto overscroll-contain">
          {categories.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-6">
              No categories created yet. Add one above.
            </p>
          ) : (
            categories.map((cat) => {
              const isEditing = editingId === cat.id;
              const isDeleting = deletingId === cat.id;

              if (isDeleting) {
                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Delete category "{cat.name}"?</span>
                    </div>
                    <p className="text-[11px] text-red-600 dark:text-red-400">
                      Notes in this category will be marked as "Uncategorized". No notes will be lost.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-2.5 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-red-100/50 text-[11px] font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        disabled={isPending}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              }

              if (isEditing) {
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      ({cat.notesCount} {cat.notesCount === 1 ? "note" : "notes"})
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(cat.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
