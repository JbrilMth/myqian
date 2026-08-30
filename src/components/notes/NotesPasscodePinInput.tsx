"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NotesPasscodePinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

export function NotesPasscodePinInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  error = false,
}: NotesPasscodePinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = (value || "").padEnd(6, "").slice(0, 6).split("");

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, val: string) => {
    // Only accept numeric digits
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      // Clear current digit
      const currentDigits = value.split("");
      currentDigits[index] = "";
      const newValue = currentDigits.join("");
      onChange(newValue);
      return;
    }

    const digit = cleaned.slice(-1);
    const currentDigits = (value || "").padEnd(6, " ").split("");
    currentDigits[index] = digit;
    const newValue = currentDigits.join("").trimEnd();
    onChange(newValue);

    // Auto advance to next box
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto complete trigger
    if (newValue.length === 6 && !newValue.includes(" ") && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] || digits[index] === "") {
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
          const currentDigits = (value || "").split("");
          currentDigits[index - 1] = "";
          onChange(currentDigits.join(""));
        }
      } else {
        const currentDigits = (value || "").split("");
        currentDigits[index] = "";
        onChange(currentDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
        if (onComplete) onComplete(pasted);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const hasValue = Boolean(digits[index] && digits[index] !== " ");
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={hasValue ? digits[index] : ""}
            disabled={disabled}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={cn(
              "w-10 h-12 sm:w-11 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border transition-all outline-hidden select-none",
              error
                ? "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 focus:ring-2 focus:ring-red-400"
                : hasValue
                ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            )}
          />
        );
      })}
    </div>
  );
}
