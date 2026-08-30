"use client";

import React, { useState, useTransition } from "react";
import { unlockNotesAction } from "@/actions/notes-auth";
import { NotesPasscodePinInput } from "./NotesPasscodePinInput";
import { Lock, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotesLockScreenProps {
  onUnlocked?: () => void;
}

export function NotesLockScreen({ onUnlocked }: NotesLockScreenProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUnlock = (code: string = passcode) => {
    if (code.length !== 6) {
      setError("Please enter your complete 6-digit passcode.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await unlockNotesAction(code);
      if (res.success) {
        if (onUnlocked) {
          onUnlocked();
        } else {
          router.refresh();
        }
      } else {
        setError(res.error || "Incorrect passcode. Try again.");
        setPasscode("");
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm p-6 sm:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-6 text-center">
        {/* Lock Icon */}
        <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        {/* Header */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Notes Locked
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Enter your 6-digit passcode to access your private notes.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center justify-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* 6-Digit PIN Input */}
        <div className="py-2">
          <NotesPasscodePinInput
            value={passcode}
            onChange={(val) => {
              setPasscode(val);
              if (error) setError(null);
            }}
            onComplete={(val) => handleUnlock(val)}
            disabled={isPending}
            error={Boolean(error)}
            autoFocus
          />
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => handleUnlock()}
          disabled={isPending || passcode.length !== 6}
          className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-bold transition-all shadow-xs disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{isPending ? "Verifying..." : "Unlock Notes"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
