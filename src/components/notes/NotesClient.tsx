"use client";

import React, { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { fetchNotesAction, fetchNoteCategoriesAction } from "@/actions/notes";
import { lockNotesAction, touchNotesActiveAction } from "@/actions/notes-auth";
import { NoteModal } from "./NoteModal";
import { NoteViewModal } from "./NoteViewModal";
import { ManageCategoriesModal } from "./ManageCategoriesModal";
import { useRouter } from "next/navigation";
import {
  StickyNote,
  Plus,
  Search,
  X,
  Tag,
  Calendar,
  Settings,
  FolderTree,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteCategory, NoteWithCategory } from "@/lib/notes/types";

interface NotesClientProps {
  initialNotes: NoteWithCategory[];
  initialCategories: NoteCategory[];
  noteLockTimeout?: string;
}

export function NotesClient({
  initialNotes,
  initialCategories,
  noteLockTimeout = "5m",
}: NotesClientProps) {
  const [notes, setNotes] = useState<NoteWithCategory[]>(initialNotes);
  const [categories, setCategories] = useState<NoteCategory[]>(initialCategories);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteWithCategory | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteWithCategory | null>(null);

  const [isManageCatModalOpen, setIsManageCatModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Dedicated Note-Lock Timer & Leaving Notes Listener
  const lastActiveRef = useRef(Date.now());
  const lastTouchRef = useRef(Date.now());

  useEffect(() => {
    // 1. Activity listeners within Notes
    const handleActivity = () => {
      lastActiveRef.current = Date.now();
      const now = Date.now();
      if (now - lastTouchRef.current >= 4000) {
        lastTouchRef.current = now;
        touchNotesActiveAction().catch(() => {});
      }
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("mousedown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });

    // Initial touch on mount
    touchNotesActiveAction().catch(() => {});

    // 2. Inactivity check interval for "1m" and "5m"
    let intervalId: NodeJS.Timeout | null = null;
    if (noteLockTimeout === "1m" || noteLockTimeout === "5m") {
      const timeoutMs = noteLockTimeout === "1m" ? 60 * 1000 : 5 * 60 * 1000;
      intervalId = setInterval(async () => {
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed >= timeoutMs) {
          await lockNotesAction();
          window.location.reload();
        }
      }, 2500);
    }

    // 3. Visibility / Backgrounding listener for "immediately"
    const handleVisibilityChange = () => {
      if (document.hidden && noteLockTimeout === "immediately") {
        lockNotesAction().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Cleanup on unmount (e.g. user navigates away from Notes to Dashboard)
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);

      if (noteLockTimeout === "immediately") {
        lockNotesAction().catch(() => {});
      }
    };
  }, [noteLockTimeout]);

  const reloadNotes = (
    catId: string = selectedCategory,
    query: string = search,
    sort: "newest" | "oldest" = sortOrder
  ) => {
    startTransition(async () => {
      const [notesRes, catRes] = await Promise.all([
        fetchNotesAction({
          categoryId: catId,
          search: query,
          sort,
        }),
        fetchNoteCategoriesAction(),
      ]);

      if (notesRes.success && notesRes.notes) {
        setNotes(notesRes.notes);
      }
      if (catRes.success && catRes.categories) {
        setCategories(catRes.categories);
      }
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    reloadNotes(selectedCategory, val, sortOrder);
  };

  const handleCategoryFilter = (catId: string) => {
    setSelectedCategory(catId);
    reloadNotes(catId, search, sortOrder);
  };

  const handleSortChange = (sort: "newest" | "oldest") => {
    setSortOrder(sort);
    reloadNotes(selectedCategory, search, sort);
  };

  const handleOpenAddNote = () => {
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNote = (note: NoteWithCategory) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleOpenViewNote = (note: NoteWithCategory) => {
    setViewingNote(note);
    setIsViewModalOpen(true);
  };

  const handleNoteSaveSuccess = (savedNote: NoteWithCategory) => {
    // If it was viewing, update viewing note
    if (viewingNote?.id === savedNote.id) {
      setViewingNote(savedNote);
    }
    reloadNotes();
  };

  const handleNoteDeleteSuccess = (deletedId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== deletedId));
    reloadNotes();
  };

  const handleCategoriesChange = (newCats: NoteCategory[]) => {
    setCategories(newCats);
    reloadNotes();
  };

  // Count uncategorized notes
  const uncategorizedCount = useMemo(
    () => notes.filter((n) => !n.categoryId).length,
    [notes]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Notes
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Personal thoughts, ideas, decisions, and daily observations.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await lockNotesAction();
              window.location.reload();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs font-semibold tracking-wide transition-all shadow-2xs cursor-pointer"
            title="Lock Notes"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddNote}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* 1. SEARCH & SORT BAR */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search notes by title or content..."
            className="w-full pl-10 pr-9 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xs focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <select
            value={sortOrder}
            onChange={(e) => handleSortChange(e.target.value as "newest" | "oldest")}
            className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium shadow-2xs focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-hidden cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* 2. CATEGORY FILTER PILLS */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-1">
        {/* All Notes Pill */}
        <button
          type="button"
          onClick={() => handleCategoryFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5",
            selectedCategory === "all"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-2xs font-bold"
              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
          )}
        >
          <span>All Notes</span>
          <span
            className={cn(
              "px-1.5 py-0.2 text-[10px] rounded-md",
              selectedCategory === "all"
                ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800 font-bold"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            )}
          >
            {notes.length}
          </span>
        </button>

        {/* Category Pills */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleCategoryFilter(cat.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5",
              selectedCategory === cat.id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-2xs font-bold"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
            )}
          >
            <span>{cat.name}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 text-[10px] rounded-md",
                selectedCategory === cat.id
                  ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800 font-bold"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}
            >
              {cat.notesCount}
            </span>
          </button>
        ))}

        {/* Manage Categories Button */}
        <button
          type="button"
          onClick={() => setIsManageCatModalOpen(true)}
          className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all flex items-center gap-1 border border-dashed border-zinc-300 dark:border-zinc-700 ml-1"
          title="Manage Categories"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Categories</span>
        </button>
      </div>

      {/* 3. NOTES LIST GRID / CARDS */}
      {notes.length === 0 ? (
        /* Empty States */
        <div className="p-12 text-center rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <StickyNote className="w-5 h-5" />
          </div>
          {search.trim() ? (
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No matching notes found
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                No notes matched "{search}".
              </p>
            </div>
          ) : selectedCategory !== "all" ? (
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No notes in this category
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Create a note or select another category.
              </p>
              <button
                type="button"
                onClick={handleOpenAddNote}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold shadow-xs"
              >
                + New Note
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                You don't have any notes yet
              </p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Write down your thoughts, ideas, decisions, or things to remember.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleOpenAddNote}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-bold shadow-xs"
                >
                  + New Note
                </button>
                {categories.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setIsManageCatModalOpen(true)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50"
                  >
                    + Create Category
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Notes Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {notes.map((note) => {
            const formattedDate = new Date(note.createdAt).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            );

            return (
              <div
                key={note.id}
                onClick={() => handleOpenViewNote(note)}
                className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer flex flex-col justify-between space-y-3 group select-none"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  {note.categoryName ? (
                    <span className="px-2 py-0.5 rounded-md font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 truncate max-w-[140px]">
                      {note.categoryName}
                    </span>
                  ) : (
                    <span className="text-zinc-400">Uncategorized</span>
                  )}
                  <span className="text-zinc-400 shrink-0 font-medium">
                    {formattedDate}
                  </span>
                </div>

                {/* Title & Preview Content */}
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-1">
                    {note.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3 whitespace-pre-wrap font-sans">
                    {note.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Creation / Editing Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        categories={categories}
        editNote={editingNote}
        defaultCategoryId={selectedCategory}
        onSuccess={handleNoteSaveSuccess}
      />

      {/* Note View Detail Modal */}
      <NoteViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        note={viewingNote}
        onEdit={handleOpenEditNote}
        onDeleteSuccess={handleNoteDeleteSuccess}
      />

      {/* Category Manager Modal */}
      <ManageCategoriesModal
        isOpen={isManageCatModalOpen}
        onClose={() => setIsManageCatModalOpen(false)}
        categories={categories}
        onCategoriesChange={handleCategoriesChange}
      />
    </div>
  );
}
