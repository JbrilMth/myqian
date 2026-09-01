"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  startAttendanceAction,
  createAttendanceCategoryAction,
} from "@/actions/attendance";
import { Play, Plus, Tag, AlertCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AttendanceCategory,
  AttendanceRecordWithCategory,
} from "@/lib/attendance/types";

interface AttendanceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AttendanceCategory[];
  defaultCategoryId?: string;
  onSuccess: (
    record: AttendanceRecordWithCategory,
    isNewCategory?: AttendanceCategory
  ) => void;
}

export function AttendanceRecordModal({
  isOpen,
  onClose,
  categories: initialCategories,
  defaultCategoryId,
  onSuccess,
}: AttendanceRecordModalProps) {
  const [categories, setCategories] =
    useState<AttendanceCategory[]>(initialCategories);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Inline Category Creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isCreatingCatPending, startCatTransition] = useTransition();

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    if (isOpening) {
      setTitle("");
      setCategoryId(
        defaultCategoryId && defaultCategoryId !== "all"
          ? defaultCategoryId
          : categories[0]?.id || ""
      );
      setError(null);
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setCategoryError(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, defaultCategoryId, categories]);

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
      const res = await createAttendanceCategoryAction(newCategoryName.trim());
      if (res.success && res.data) {
        setCategories((prev) => [...prev, res.data]);
        setCategoryId(res.data.id);
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
      setError("Please enter a title for this activity.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const res = await startAttendanceAction({
        title: title.trim(),
        categoryId: categoryId || null,
      });

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || "Failed to start attendance record.");
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Attendance Record"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Activity Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Office Work, Study Session, Gym Workout"
            className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
            autoFocus
          />
        </div>

        {/* Category Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Category
            </label>
            {!isCreatingCategory && (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCategory(true);
                  setCategoryError(null);
                  setNewCategoryName("");
                }}
                className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Category</span>
              </button>
            )}
          </div>

          {!isCreatingCategory ? (
            <select
              value={categoryId}
              onChange={(e) => handleCategorySelectChange(e.target.value)}
              className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
            >
              <option value="">(No Category)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              <option value="__create_new__">+ Create Category...</option>
            </select>
          ) : (
            <div className="p-3 bg-zinc-100/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Create New Category</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Work, Study, Gym"
                  className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveInlineCategory(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveInlineCategory}
                  disabled={isCreatingCatPending || !newCategoryName.trim()}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {isCreatingCatPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-2.5 py-1.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              {categoryError && (
                <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                  {categoryError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Start Notice */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Clicking <strong>Start</strong> records the authoritative start timestamp in your database and sets this record to In Progress.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="px-5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Start Activity</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
