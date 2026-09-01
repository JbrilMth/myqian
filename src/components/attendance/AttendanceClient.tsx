"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  fetchAttendanceRecordsAction,
  endAttendanceAction,
  deleteAttendanceAction,
} from "@/actions/attendance";
import { AttendanceRecordModal } from "./AttendanceRecordModal";
import { EditAttendanceModal } from "./EditAttendanceModal";
import { ManageAttendanceCategoriesModal } from "./ManageAttendanceCategoriesModal";
import {
  formatDuration,
  formatShortDuration,
  formatTimeStr,
  formatDateLabel,
} from "@/lib/attendance/format";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ClockCheck,
  Plus,
  Search,
  X,
  Tag,
  Calendar,
  Settings,
  FolderTree,
  Play,
  Square,
  Trash2,
  Edit2,
  MoreVertical,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AttendanceCategory,
  AttendanceRecordWithCategory,
} from "@/lib/attendance/types";
import { format, isToday } from "date-fns";

interface AttendanceClientProps {
  initialRecords: AttendanceRecordWithCategory[];
  initialCategories: AttendanceCategory[];
}

export function AttendanceClient({
  initialRecords,
  initialCategories,
}: AttendanceClientProps) {
  const [records, setRecords] =
    useState<AttendanceRecordWithCategory[]>(initialRecords);
  const [categories, setCategories] =
    useState<AttendanceCategory[]>(initialCategories);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<
    "all" | "today" | "this_week" | "this_month"
  >("all");

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isManageCatModalOpen, setIsManageCatModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<AttendanceRecordWithCategory | null>(null);

  // Active operations tracking
  const [endingId, setEndingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const reloadRecords = (
    catId: string = selectedCategory,
    dateF: "all" | "today" | "this_week" | "this_month" = selectedDateFilter,
    query: string = search
  ) => {
    startTransition(async () => {
      const res = await fetchAttendanceRecordsAction({
        categoryId: catId,
        dateFilter: dateF,
        search: query,
      });
      if (res.success && res.data) {
        setRecords(res.data);
      }
    });
  };

  const handleEndRecord = (recordId: string) => {
    setEndingId(recordId);
    startTransition(async () => {
      const res = await endAttendanceAction(recordId);
      if (res.success && res.data) {
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? res.data! : r))
        );
      }
      setEndingId(null);
    });
  };

  const handleDeleteRecord = (recordId: string, title: string) => {
    if (
      !confirm(
        `Delete attendance record "${title}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(recordId);
    setOpenActionMenuId(null);
    startTransition(async () => {
      const res = await deleteAttendanceAction(recordId);
      if (res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      }
      setDeletingId(null);
    });
  };

  // Separate records into In Progress and Completed
  const inProgressRecords = useMemo(
    () => records.filter((r) => r.status === "IN_PROGRESS"),
    [records]
  );

  const completedRecords = useMemo(
    () => records.filter((r) => r.status === "COMPLETED"),
    [records]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <ClockCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Attendance
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Record activity start and completion timestamps with exact duration calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManageCatModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Manage Attendance Categories"
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Categories</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Record</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                reloadRecords(selectedCategory, selectedDateFilter, e.target.value);
              }}
              placeholder="Search records or categories..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  reloadRecords(selectedCategory, selectedDateFilter, "");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                reloadRecords(e.target.value, selectedDateFilter, search);
              }}
              className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={selectedDateFilter}
              onChange={(e) => {
                const val = e.target.value as any;
                setSelectedDateFilter(val);
                reloadRecords(selectedCategory, val, search);
              }}
              className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. IN PROGRESS SECTION */}
      {inProgressRecords.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                In Progress ({inProgressRecords.length})
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400">
              Timestamp active in database
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inProgressRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-emerald-500/30 dark:border-emerald-500/30 shadow-xs flex flex-col justify-between gap-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {record.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {record.categoryName ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md flex items-center gap-1">
                          <Tag className="w-3 h-3 text-zinc-400" />
                          {record.categoryName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">
                          (No Category)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenActionMenuId(
                          openActionMenuId === record.id ? null : record.id
                        )
                      }
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openActionMenuId === record.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-20">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord(record);
                            setOpenActionMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteRecord(record.id, record.title)
                          }
                          className="w-full px-3 py-1.5 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Started:{" "}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatTimeStr(record.startedAt)}
                    </span>
                    {!isToday(new Date(record.startedAt)) && (
                      <span className="text-[10px] text-zinc-400 ml-1">
                        ({format(new Date(record.startedAt), "MMM d")})
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEndRecord(record.id)}
                    disabled={endingId === record.id}
                    className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {endingId === record.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Square className="w-3 h-3 fill-current" />
                    )}
                    <span>END</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. COMPLETED RECORDS / HISTORY SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Attendance History ({completedRecords.length})
          </h2>
          {isPending && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </span>
          )}
        </div>

        {completedRecords.length === 0 ? (
          inProgressRecords.length === 0 ? (
            <EmptyState
              icon={<ClockCheck className="w-5 h-5" />}
              title="No Attendance Records"
              description="Start recording your work, study sessions, or activities with exact timestamps."
              action={
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start First Record</span>
                </button>
              }
            />
          ) : (
            <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
              <p className="text-xs text-zinc-400">
                You have active records in progress above. Click "END" when you finish an activity to record its duration here.
              </p>
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xs divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
            {completedRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group"
              >
                {/* Record Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {record.title}
                    </span>
                    {record.categoryName && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                        {record.categoryName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>{formatDateLabel(record.startedAt)}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {formatTimeStr(record.startedAt)} →{" "}
                      {record.endedAt ? formatTimeStr(record.endedAt) : "--:--"}
                    </span>
                  </div>
                </div>

                {/* Duration & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-xs font-bold rounded-lg">
                    {formatDuration(record.durationSeconds)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingRecord(record)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Edit Record"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteRecord(record.id, record.title)
                      }
                      disabled={deletingId === record.id}
                      className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete Record"
                    >
                      {deletingId === record.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODALS */}
      <AttendanceRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        categories={categories}
        defaultCategoryId={selectedCategory}
        onSuccess={(newRecord, newCategory) => {
          if (newCategory) {
            setCategories((prev) => [...prev, newCategory]);
          }
          setRecords((prev) => [newRecord, ...prev]);
        }}
      />

      <EditAttendanceModal
        isOpen={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        categories={categories}
        onSuccess={(updated) => {
          setRecords((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r))
          );
        }}
      />

      <ManageAttendanceCategoriesModal
        isOpen={isManageCatModalOpen}
        onClose={() => setIsManageCatModalOpen(false)}
        categories={categories}
        onCategoriesChange={(cats) => {
          setCategories(cats);
          reloadRecords();
        }}
      />
    </div>
  );
}
