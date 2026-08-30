"use client";

import React, { useState, useTransition } from "react";
import { setupNotesPasscodeAction } from "@/actions/notes-auth";
import { NotesPasscodePinInput } from "./NotesPasscodePinInput";
import { ShieldCheck, AlertCircle, ArrowRight, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotesSetupScreenProps {
  onCompleted?: () => void;
}

export function NotesSetupScreen({ onCompleted }: NotesSetupScreenProps) {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSetup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (passcode.length !== 6) {
      setError("Passcode must be exactly 6 digits.");
      return;
    }
    if (confirmPasscode.length !== 6) {
      setError("Please confirm your 6-digit passcode.");
      return;
    }
    if (passcode !== confirmPasscode) {
      setError("Passcodes do not match. Please re-enter.");
      setConfirmPasscode("");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await setupNotesPasscodeAction(passcode, confirmPasscode);
      if (res.success) {
        if (onCompleted) {
          onCompleted();
        } else {
          router.refresh();
        }
      } else {
        setError(res.error || "Failed to set up passcode.");
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[65vh] p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-6 text-center">
        {/* Shield Icon */}
        <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>

        {/* Header */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Protect Your Notes
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Create a dedicated 6-digit numeric passcode to protect your private notes.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center justify-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSetup} className="space-y-5 text-left">
          {/* 1. Enter Passcode */}
          <div className="space-y-2 text-center">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Create 6-Digit Passcode
            </label>
            <NotesPasscodePinInput
              value={passcode}
              onChange={(val) => {
                setPasscode(val);
                if (error) setError(null);
              }}
              disabled={isPending}
              autoFocus
            />
          </div>

          {/* 2. Confirm Passcode */}
          <div className="space-y-2 text-center pt-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Confirm Passcode
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

          {/* Action Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={
                isPending ||
                passcode.length !== 6 ||
                confirmPasscode.length !== 6
              }
              className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-bold transition-all shadow-xs disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isPending ? "Setting up..." : "Create Passcode & Open Notes"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
