"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { createPerson, updatePerson } from "@/actions/people";
import type { PersonWithBalance } from "@/lib/finance/types";

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: PersonWithBalance | null;
  onSuccess?: () => void;
}

export function PersonModal({
  isOpen,
  onClose,
  person,
  onSuccess,
}: PersonModalProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevIsOpenRef = React.useRef(false);
  const prevPersonIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const personId = person?.id || null;
    const isDifferentPerson = person && personId !== prevPersonIdRef.current;

    if (isOpening || isDifferentPerson) {
      if (person) {
        setName(person.name);
        setNote(person.note || "");
      } else {
        setName("");
        setNote("");
      }
      setError(null);
    }

    prevIsOpenRef.current = isOpen;
    prevPersonIdRef.current = person?.id || null;
  }, [person, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (person) {
        const res = await updatePerson(person.id, { name, note });
        if (!res.success) {
          setError(res.error || "Failed to update person.");
          return;
        }
      } else {
        const res = await createPerson({ name, note });
        if (!res.success) {
          setError(res.error || "Failed to create person.");
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
      title={person ? "Edit Person" : "Add Person"}
      description="Track financial relationships, money lent, money borrowed, and repayments."
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
            Person's Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ahmed, Sarah, John"
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Note / Relationship (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Colleague, Flatmate, Friend"
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
          />
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
              : person
              ? "Save Changes"
              : "Add Person"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
