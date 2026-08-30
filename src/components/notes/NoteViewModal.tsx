"use client";

import React, { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { deleteNoteAction } from "@/actions/notes";
import {
  Tag,
  Calendar,
  Edit3,
  Trash2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteWithCategory } from "@/lib/notes/types";

interface NoteViewModalProps {
  note: NoteWithCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: NoteWithCategory) => void;
  onDeleteSuccess: (deletedId: string) => void;
}

export function NoteViewModal({
  note,
  isOpen,
  onClose,
  onEdit,
  onDeleteSuccess,
}: NoteViewModalProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  if (!note) return null;

  const formattedDate = new Date(note.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteNoteAction(note.id);
      if (res.success) {
        onDeleteSuccess(note.id);
        setIsConfirmingDelete(false);
        onClose();
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={note.title}
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs">
        {/* Meta Bar: Category, Date, Last Updated */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            {note.categoryName ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700">
                {note.categoryName}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 border border-zinc-200/60 dark:border-zinc-800">
                Uncategorized
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Note Body (Preserved Line Breaks & Paragraphs) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/80 max-h-[55vh] overflow-y-auto overscroll-contain">
          <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans select-text">
            {note.content}
          </div>
        </div>

        {/* Delete Confirmation Box */}
        {isConfirmingDelete && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete this note?</span>
            </div>
            <p className="text-[11px] text-red-600 dark:text-red-400">
              This action cannot be undone. The note will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isConfirmingDelete && (
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(note);
                }}
                className="px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Note</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
