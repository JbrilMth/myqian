"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { createCategory, updateCategory } from "@/actions/categories";
import type { CategoryWithChildren } from "@/lib/finance/types";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentCategories: CategoryWithChildren[];
  editCategory?: { id: string; name: string; parentId: string | null } | null;
  defaultParentId?: string | null;
  onSuccess?: () => void;
}

export function CategoryModal({
  isOpen,
  onClose,
  parentCategories,
  editCategory,
  defaultParentId,
  onSuccess,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevIsOpenRef = React.useRef(false);
  const prevCatIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const catId = editCategory?.id || null;
    const isDifferentCat = editCategory && catId !== prevCatIdRef.current;

    if (isOpening || isDifferentCat) {
      if (editCategory) {
        setName(editCategory.name);
        setParentId(editCategory.parentId);
      } else {
        setName("");
        setParentId(defaultParentId || null);
      }
      setError(null);
    }

    prevIsOpenRef.current = isOpen;
    prevCatIdRef.current = editCategory?.id || null;
  }, [editCategory, defaultParentId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (editCategory) {
        const res = await updateCategory(editCategory.id, {
          name,
          parentId,
        });
        if (!res.success) {
          setError(res.error || "Failed to update category.");
          return;
        }
      } else {
        const res = await createCategory({
          name,
          parentId,
        });
        if (!res.success) {
          setError(res.error || "Failed to create category.");
          return;
        }
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editCategory
          ? "Edit Category"
          : parentId
          ? "Create Child Category"
          : "Create Parent Category"
      }
      description="Organize your spending and income with clean parent and subcategories."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Category Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={parentId ? "e.g. Restaurant, Metro, Fuel" : "e.g. Food, Transportation, Work"}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Parent Category (Optional)
          </label>
          <select
            value={parentId || ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
          >
            <option value="">None (Top-level Parent Category)</option>
            {parentCategories
              .filter((p) => !editCategory || p.id !== editCategory.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : editCategory
              ? "Save Changes"
              : "Create Category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
