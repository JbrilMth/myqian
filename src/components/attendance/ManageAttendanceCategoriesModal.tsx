"use client";

import React, { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  createAttendanceCategoryAction,
  deleteAttendanceCategoryAction,
} from "@/actions/attendance";
import { Tag, Plus, Trash2, Loader2, AlertCircle, Check } from "lucide-react";
import type { AttendanceCategory } from "@/lib/attendance/types";

interface ManageAttendanceCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AttendanceCategory[];
  onCategoriesChange: (categories: AttendanceCategory[]) => void;
}

export function ManageAttendanceCategoriesModal({
  isOpen,
  onClose,
  categories,
  onCategoriesChange,
}: ManageAttendanceCategoriesModalProps) {
  const [newCatName, setNewCatName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    startTransition(async () => {
      setError(null);
      const res = await createAttendanceCategoryAction(newCatName.trim());
      if (res.success && res.data) {
        onCategoriesChange([...categories, res.data]);
        setNewCatName("");
      } else {
        setError(res.error || "Failed to create category.");
      }
    });
  };

  const handleDelete = (catId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the category "${name}"? Records under this category will become uncategorized.`
      )
    ) {
      return;
    }

    setDeletingId(catId);
    startTransition(async () => {
      setError(null);
      const res = await deleteAttendanceCategoryAction(catId);
      if (res.success) {
        onCategoriesChange(categories.filter((c) => c.id !== catId));
      } else {
        setError(res.error || "Failed to delete category.");
      }
      setDeletingId(null);
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Categories"
      maxWidth="md"
    >
      <div className="space-y-4 pt-2">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Create new category form */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name..."
            className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
          <button
            type="submit"
            disabled={isPending || !newCatName.trim()}
            className="px-3.5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Add</span>
          </button>
        </form>

        {/* Categories List */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 max-h-60 overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-6">
              No categories yet. Create your first category above.
            </p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="py-2.5 flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {cat.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deletingId === cat.id}
                  className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Delete Category"
                >
                  {deletingId === cat.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
