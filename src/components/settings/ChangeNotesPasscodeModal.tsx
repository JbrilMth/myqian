"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  changeNotesPasscodeAction,
  setupNotesPasscodeAction,
} from "@/actions/notes-auth";
import { NotesPasscodePinInput } from "@/components/notes/NotesPasscodePinInput";
import { ShieldCheck, AlertCircle, CheckCircle2, Lock } from "lucide-react";

interface ChangeNotesPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingPasscode: boolean;
  onSuccess?: () => void;
}

export function ChangeNotesPasscodeModal({
  isOpen,
  onClose,
  hasExistingPasscode,
  onSuccess,
}: ChangeNotesPasscodeModalProps) {
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setCurrentPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasExistingPasscode && currentPasscode.length !== 6) {
      setError("Please enter your current 6-digit passcode.");
      return;
    }
    if (newPasscode.length !== 6) {
      setError("New passcode must be exactly 6 digits.");
      return;
    }
    if (confirmPasscode.length !== 6) {
      setError("Please confirm your new 6-digit passcode.");
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setError("New passcodes do not match. Please re-enter.");
      setConfirmPasscode("");
      return;
    }

    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      if (hasExistingPasscode) {
        const res = await changeNotesPasscodeAction(
          currentPasscode,
          newPasscode,
          confirmPasscode
        );
        if (res.success) {
          setSuccessMsg("Notes Passcode updated successfully.");
          if (onSuccess) onSuccess();
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setError(res.error || "Failed to update passcode.");
        }
      } else {
        const res = await setupNotesPasscodeAction(newPasscode, confirmPasscode);
        if (res.success) {
          setSuccessMsg("Notes Passcode created successfully.");
          if (onSuccess) onSuccess();
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setError(res.error || "Failed to create passcode.");
        }
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hasExistingPasscode ? "Change Notes Passcode" : "Set Notes Passcode"}
      description="Update your dedicated 6-digit Notes security passcode"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Current Passcode (only if already configured) */}
        {hasExistingPasscode && (
          <div className="space-y-1.5 text-center">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Current Passcode
            </label>
            <NotesPasscodePinInput
              value={currentPasscode}
              onChange={(val) => {
                setCurrentPasscode(val);
                if (error) setError(null);
              }}
              disabled={isPending}
              autoFocus
            />
          </div>
        )}

        {/* New Passcode */}
        <div className="space-y-1.5 text-center pt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {hasExistingPasscode ? "New 6-Digit Passcode" : "Create 6-Digit Passcode"}
          </label>
          <NotesPasscodePinInput
            value={newPasscode}
            onChange={(val) => {
              setNewPasscode(val);
              if (error) setError(null);
            }}
            disabled={isPending}
            autoFocus={!hasExistingPasscode}
          />
        </div>

        {/* Confirm New Passcode */}
        <div className="space-y-1.5 text-center pt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Confirm New Passcode
          </label>
          <NotesPasscodePinInput
            value={confirmPasscode}
            onChange={(val) => {
              setConfirmPasscode(val);
              if (error) setError(null);
            }}
            disabled={isPending}
            autoFocus={false}
          />
        </div>

        {/* Actions */}
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
            disabled={
              isPending ||
              newPasscode.length !== 6 ||
              confirmPasscode.length !== 6 ||
              (hasExistingPasscode && currentPasscode.length !== 6)
            }
            className="px-5 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {isPending ? "Updating..." : "Save Passcode"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
