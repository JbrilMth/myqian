"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createCategory } from "@/actions/categories";
import type { CategoryWithChildren } from "@/lib/finance/types";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  Folder,
  CornerDownRight,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  parentCategoryId: string;
  childCategoryId: string;
  categories: CategoryWithChildren[];
  onChange: (parentCategoryId: string, childCategoryId: string) => void;
  onCategoriesChange?: (updatedCategories: CategoryWithChildren[]) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function CategorySelector({
  parentCategoryId,
  childCategoryId,
  categories,
  onChange,
  onCategoriesChange,
  label = "Category",
  disabled = false,
  required = false,
  placeholder = "Select category...",
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Quick add state
  const [isAddingParent, setIsAddingParent] = useState(false);
  const [addingParentName, setAddingParentName] = useState("");
  const [addingChildUnderParentId, setAddingChildUnderParentId] = useState<string | null>(null);
  const [addingChildName, setAddingChildName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addParentInputRef = useRef<HTMLInputElement>(null);
  const addChildInputRef = useRef<HTMLInputElement>(null);

  // Selected parent and child lookups
  const selectedParent = useMemo(
    () => categories.find((c) => c.id === parentCategoryId),
    [categories, parentCategoryId]
  );

  const selectedChild = useMemo(() => {
    if (!selectedParent) {
      // Look in all parents just in case
      for (const p of categories) {
        const found = p.children?.find((c) => c.id === childCategoryId);
        if (found) return found;
      }
      return null;
    }
    return selectedParent.children?.find((c) => c.id === childCategoryId) || null;
  }, [selectedParent, categories, childCategoryId]);

  // Display text
  const displayValue = useMemo(() => {
    if (selectedParent && selectedChild) {
      return `${selectedParent.name} > ${selectedChild.name}`;
    }
    if (selectedParent) {
      return selectedParent.name;
    }
    if (selectedChild) {
      return selectedChild.name;
    }
    return "";
  }, [selectedParent, selectedChild]);

  // Auto expand selected parent when opening
  useEffect(() => {
    if (isOpen) {
      if (parentCategoryId) {
        setExpandedParents((prev) => new Set(prev).add(parentCategoryId));
      }
      setIsAddingParent(false);
      setAddingChildUnderParentId(null);
      setCreateError(null);
      setSearchQuery("");
    }
  }, [isOpen, parentCategoryId]);

  // Close on outside click (desktop)
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus inputs when quick-add is activated
  useEffect(() => {
    if (isAddingParent) {
      setTimeout(() => addParentInputRef.current?.focus(), 50);
    }
  }, [isAddingParent]);

  useEffect(() => {
    if (addingChildUnderParentId) {
      setTimeout(() => addChildInputRef.current?.focus(), 50);
    }
  }, [addingChildUnderParentId]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();

    return categories
      .map((parent) => {
        const parentMatches = parent.name.toLowerCase().includes(q);
        const matchingChildren = parent.children?.filter((c) =>
          c.name.toLowerCase().includes(q)
        ) || [];

        if (parentMatches || matchingChildren.length > 0) {
          return {
            ...parent,
            children: parentMatches ? parent.children : matchingChildren,
          };
        }
        return null;
      })
      .filter((p): p is CategoryWithChildren => p !== null);
  }, [categories, searchQuery]);

  const toggleParentExpand = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const handleSelectParentOnly = (parent: CategoryWithChildren) => {
    onChange(parent.id, "");
    setIsOpen(false);
  };

  const handleSelectChild = (parent: CategoryWithChildren, childId: string) => {
    onChange(parent.id, childId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
  };

  // Quick Create Parent Category
  const handleCreateParent = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!addingParentName.trim() || isCreating) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await createCategory({
        name: addingParentName.trim(),
        parentId: null,
      });

      if (!res.success || !res.category) {
        setCreateError(res.error || "Failed to create parent category.");
        setIsCreating(false);
        return;
      }

      const newParent: CategoryWithChildren = {
        id: res.category.id,
        name: res.category.name,
        parentId: null,
        type: res.category.type,
        isArchived: res.category.isArchived,
        createdAt: new Date(res.category.createdAt),
        updatedAt: new Date(res.category.updatedAt),
        children: [],
        transactionCount: 0,
      };

      const updatedCategories = [...categories, newParent].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      onCategoriesChange?.(updatedCategories);
      onChange(newParent.id, "");
      setIsAddingParent(false);
      setAddingParentName("");
      setIsOpen(false);
    } catch (err: any) {
      setCreateError(err.message || "An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  // Quick Create Child Category under selected parent
  const handleCreateChild = async (parentId: string, e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!addingChildName.trim() || isCreating) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await createCategory({
        name: addingChildName.trim(),
        parentId: parentId,
      });

      if (!res.success || !res.category) {
        setCreateError(res.error || "Failed to create child category.");
        setIsCreating(false);
        return;
      }

      const newChild = {
        id: res.category.id,
        name: res.category.name,
        parentId: parentId,
        type: res.category.type,
        isArchived: res.category.isArchived,
        createdAt: new Date(res.category.createdAt),
        updatedAt: new Date(res.category.updatedAt),
        transactionCount: 0,
      };

      const updatedCategories = categories.map((p) => {
        if (p.id === parentId) {
          const updatedChildren = [...(p.children || []), newChild].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          return {
            ...p,
            children: updatedChildren,
          };
        }
        return p;
      });

      onCategoriesChange?.(updatedCategories);
      onChange(parentId, newChild.id);
      setAddingChildUnderParentId(null);
      setAddingChildName("");
      setIsOpen(false);
    } catch (err: any) {
      setCreateError(err.message || "An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-left transition-colors min-h-[42px]",
          "hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-hidden focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-zinc-400 dark:border-zinc-500 ring-2 ring-zinc-200 dark:ring-zinc-800"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          {displayValue ? (
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {selectedParent && selectedChild ? (
                <>
                  <span>{selectedParent.name}</span>
                  <span className="text-zinc-400 mx-1.5 font-normal">&gt;</span>
                  <span>{selectedChild.name}</span>
                </>
              ) : (
                displayValue
              )}
            </span>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {displayValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors"
              title="Clear category"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-zinc-400 transition-transform duration-150",
              isOpen && "rotate-180 text-zinc-700 dark:text-zinc-200"
            )}
          />
        </div>
      </button>

      {/* DROPDOWN / BOTTOM SHEET */}
      {isOpen && (
        <>
          {/* Mobile Backdrop (< SM) */}
          <div
            className="sm:hidden fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          {/* Selector Container (Bottom Sheet on Mobile, Popover on Desktop) */}
          <div
            className={cn(
              "z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col",
              // Mobile (< SM): Bottom Sheet fixed at screen bottom
              "fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] sm:max-h-none sm:rounded-xl sm:static sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-1 sm:w-full sm:max-w-md",
              "animate-in slide-in-from-bottom-4 sm:slide-in-from-top-2 duration-150"
            )}
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* Header / Search Bar */}
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Select Category
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />
              </div>
            </div>

            {/* Error banner if any */}
            {createError && (
              <div className="p-2.5 mx-3 mt-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-[11px] text-red-700 dark:text-red-300 flex items-center justify-between">
                <span>{createError}</span>
                <button
                  type="button"
                  onClick={() => setCreateError(null)}
                  className="p-0.5 text-red-500 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Scrollable Categories List */}
            <div className="p-2 overflow-y-auto max-h-72 sm:max-h-80 space-y-1 overscroll-contain flex-1">
              {/* Option for No Category */}
              <button
                type="button"
                onClick={() => {
                  onChange("", "");
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left",
                  !parentCategoryId && !childCategoryId
                    ? "bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                )}
              >
                <span>No Category (—)</span>
                {!parentCategoryId && !childCategoryId && (
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                )}
              </button>

              {filteredCategories.length === 0 && (
                <div className="py-4 text-center text-xs text-zinc-400 italic">
                  {searchQuery ? `No category found matching "${searchQuery}"` : "No categories yet."}
                </div>
              )}

              {/* Parents & Children Hierarchy */}
              {filteredCategories.map((parent) => {
                const isSelectedParent = parent.id === parentCategoryId;
                const isExpanded = expandedParents.has(parent.id) || searchQuery.trim().length > 0;
                const children = parent.children || [];
                const isAddingChild = addingChildUnderParentId === parent.id;

                return (
                  <div
                    key={parent.id}
                    className={cn(
                      "rounded-lg border transition-all overflow-hidden",
                      isSelectedParent
                        ? "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"
                        : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                    )}
                  >
                    {/* Parent Row */}
                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg group hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => handleSelectParentOnly(parent)}
                        className="flex-1 flex items-center gap-2 text-left truncate py-0.5"
                      >
                        <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span
                          className={cn(
                            "text-xs font-semibold truncate",
                            isSelectedParent && !childCategoryId
                              ? "text-zinc-950 dark:text-zinc-100"
                              : "text-zinc-800 dark:text-zinc-200"
                          )}
                        >
                          {parent.name}
                        </span>
                        {isSelectedParent && !childCategoryId && (
                          <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0 ml-1" />
                        )}
                      </button>

                      {/* Expand / Collapse toggle */}
                      <button
                        type="button"
                        onClick={(e) => toggleParentExpand(parent.id, e)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700 shrink-0"
                        title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                      >
                        <ChevronRight
                          className={cn(
                            "w-3.5 h-3.5 transition-transform duration-150",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>
                    </div>

                    {/* Children List & Quick Add Child */}
                    {isExpanded && (
                      <div className="pl-4 pr-1.5 py-1 space-y-0.5 border-t border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/60">
                        {children.map((child) => {
                          const isSelectedChild =
                            isSelectedParent && child.id === childCategoryId;

                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => handleSelectChild(parent, child.id)}
                              className={cn(
                                "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                                isSelectedChild
                                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              )}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <CornerDownRight
                                  className={cn(
                                    "w-3 h-3 shrink-0",
                                    isSelectedChild
                                      ? "text-zinc-300 dark:text-zinc-600"
                                      : "text-zinc-400"
                                  )}
                                />
                                <span className="truncate">{child.name}</span>
                              </div>
                              {isSelectedChild && (
                                <Check className="w-3 h-3 shrink-0 ml-1" />
                              )}
                            </button>
                          );
                        })}

                        {/* Inline Form for Adding Child under Parent */}
                        {isAddingChild ? (
                          <div
                            className="p-2 mt-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-2"
                          >
                            <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                              New child under <span className="font-bold">{parent.name}</span>
                            </div>
                            <input
                              ref={addChildInputRef}
                              type="text"
                              required
                              value={addingChildName}
                              onChange={(e) => setAddingChildName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCreateChild(parent.id, e);
                                }
                              }}
                              placeholder="e.g. Restaurant, Coffee, Metro"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                            />
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingChildUnderParentId(null);
                                  setAddingChildName("");
                                }}
                                disabled={isCreating}
                                className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleCreateChild(parent.id, e)}
                                disabled={isCreating || !addingChildName.trim()}
                                className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-md transition-colors disabled:opacity-50"
                              >
                                {isCreating ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <span>Create</span>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddingChildUnderParentId(parent.id);
                              setAddingChildName("");
                              setCreateError(null);
                            }}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-md transition-colors text-left"
                          >
                            <Plus className="w-3 h-3 text-zinc-400" />
                            <span>Add Child Category</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom: Quick Add Parent Category */}
            <div className="p-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850 shrink-0">
              {isAddingParent ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Add Parent Category
                  </div>
                  <input
                    ref={addParentInputRef}
                    type="text"
                    required
                    value={addingParentName}
                    onChange={(e) => setAddingParentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateParent(e);
                      }
                    }}
                    placeholder="e.g. Food, Transportation, Housing"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                  />
                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingParent(false);
                        setAddingParentName("");
                      }}
                      disabled={isCreating}
                      className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCreateParent(e)}
                      disabled={isCreating || !addingParentName.trim()}
                      className="inline-flex items-center gap-1 px-3.5 py-1 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-md transition-colors disabled:opacity-50"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <span>Create Parent</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingParent(true);
                    setAddingParentName("");
                    setCreateError(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100/70 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Add Parent Category</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
