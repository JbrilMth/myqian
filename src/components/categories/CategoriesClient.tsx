"use client";

import React, { useState } from "react";
import { CategoryModal } from "./CategoryModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteOrArchiveCategory } from "@/actions/categories";
import type { CategoryWithChildren } from "@/lib/finance/types";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  CornerDownRight,
  Folder,
} from "lucide-react";

interface CategoriesClientProps {
  initialCategories: CategoryWithChildren[];
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    parentId: string | null;
  } | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddParent = () => {
    setEditingCategory(null);
    setDefaultParentId(null);
    setIsModalOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingCategory(null);
    setDefaultParentId(parentId);
    setIsModalOpen(true);
  };

  const handleEdit = (cat: { id: string; name: string; parentId: string | null }) => {
    setEditingCategory(cat);
    setDefaultParentId(cat.parentId);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? If transactions exist with this category, it will be safely archived to protect financial records.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await deleteOrArchiveCategory(id);
      if (res.message) {
        alert(res.message);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Categories
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Database-driven parent & child categories for granular spending and income analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddParent}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Category</span>
        </button>
      </div>

      {initialCategories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="w-5 h-5" />}
          title="No categories yet"
          description="Create your first parent category (e.g. Food, Transportation, Work, Personal) and subcategories to categorize transactions."
          action={
            <button
              type="button"
              onClick={handleAddParent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Parent Category
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialCategories.map((parent) => (
            <div
              key={parent.id}
              className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3"
            >
              {/* Parent Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {parent.name}
                    </h3>
                    <span className="text-[10px] text-zinc-400">
                      {parent.children.length} subcategories • {parent.transactionCount} transactions
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddChild(parent.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Add subcategory"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleEdit({
                        id: parent.id,
                        name: parent.name,
                        parentId: null,
                      })
                    }
                    className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(parent.id, parent.name)}
                    disabled={deletingId === parent.id}
                    className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete / Archive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Children List */}
              {parent.children.length === 0 ? (
                <div className="py-3 text-center text-xs text-zinc-400 italic">
                  No subcategories. Click + to add one.
                </div>
              ) : (
                <div className="space-y-1 pl-2">
                  {parent.children.map((child) => (
                    <div
                      key={child.id}
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CornerDownRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {child.name}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          ({child.transactionCount})
                        </span>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit({
                              id: child.id,
                              name: child.name,
                              parentId: parent.id,
                            })
                          }
                          className="p-1 text-zinc-400 hover:text-zinc-700"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(child.id, child.name)}
                          disabled={deletingId === child.id}
                          className="p-1 text-zinc-400 hover:text-red-600"
                          title="Delete / Archive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        parentCategories={initialCategories}
        editCategory={editingCategory}
        defaultParentId={defaultParentId}
      />
    </div>
  );
}
