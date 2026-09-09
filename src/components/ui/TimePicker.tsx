"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, X } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:mm" (e.g. "09:30", "13:45", "23:55") or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);

export function TimePicker({
  value,
  onChange,
  placeholder = "--:--",
  disabled = false,
  className = "",
  id,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);

  // Parse current hour and minute (00-23 and 00-59)
  const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value || "");
  const selectedHour = isValidTime ? value.split(":")[0] : "";
  const selectedMinute = isValidTime ? value.split(":")[1] : "";

  // Auto-scroll selected hour & minute to top/center when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (selectedHour && hourColRef.current) {
          const el = hourColRef.current.querySelector(
            `[data-hour="${selectedHour}"]`
          ) as HTMLElement | null;
          if (el) {
            hourColRef.current.scrollTop = el.offsetTop - 8;
          }
        }
        if (selectedMinute && minColRef.current) {
          const el = minColRef.current.querySelector(
            `[data-minute="${selectedMinute}"]`
          ) as HTMLElement | null;
          if (el) {
            minColRef.current.scrollTop = el.offsetTop - 8;
          }
        }
      }, 30);
    }
  }, [isOpen, selectedHour, selectedMinute]);

  // Click outside and Escape key to close popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    const m = selectedMinute || "00";
    onChange(`${h}:${m}`);
  };

  const handleSelectMinute = (m: string) => {
    let h = selectedHour;
    if (!h) {
      const now = new Date();
      h = String(now.getHours()).padStart(2, "0");
    }
    onChange(`${h}:${m}`);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Clickable Time Input Box */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-colors focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span
          className={
            value
              ? "text-zinc-900 dark:text-zinc-100 font-medium"
              : "text-zinc-400 dark:text-zinc-500"
          }
        >
          {value || placeholder}
        </span>

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              title="Clear time"
              className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
        </div>
      </button>

      {/* 24-Hour Custom Popover: 2 Columns (00-23, 00-59) */}
      {isOpen && !disabled && (
        <div className="absolute bottom-full mb-1.5 left-0 sm:left-auto sm:right-0 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-2xl z-50 flex overflow-hidden w-44 animate-in fade-in zoom-in-95 duration-75">
          {/* HOUR COLUMN (00 - 23) */}
          <div
            ref={hourColRef}
            className="flex-1 h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
          >
            {HOURS_24.map((hour) => {
              const isSelected = selectedHour === hour;
              return (
                <button
                  key={hour}
                  type="button"
                  data-hour={hour}
                  onClick={() => handleSelectHour(hour)}
                  className={`w-full py-2 text-center text-xs font-medium transition-colors select-none ${
                    isSelected
                      ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold border-y border-zinc-400/40 dark:border-zinc-500/40"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                  }`}
                >
                  {hour}
                </button>
              );
            })}
          </div>

          {/* VERTICAL DIVIDER */}
          <div className="w-[1px] bg-zinc-200 dark:bg-zinc-800" />

          {/* MINUTE COLUMN (00 - 59) */}
          <div
            ref={minColRef}
            className="flex-1 h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
          >
            {MINUTES_60.map((minute) => {
              const isSelected = selectedMinute === minute;
              return (
                <button
                  key={minute}
                  type="button"
                  data-minute={minute}
                  onClick={() => handleSelectMinute(minute)}
                  className={`w-full py-2 text-center text-xs font-medium transition-colors select-none ${
                    isSelected
                      ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold border-y border-zinc-400/40 dark:border-zinc-500/40"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                  }`}
                >
                  {minute}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
