"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { changePassword } from "@/actions/auth";
import { Lock, Loader2 } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (!res.success) {
        setError(res.error || "Failed to update password.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      }, 1200);
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
      title="Change Password"
      description="Update your account master password."
      maxWidth="sm"
    >
      {success ? (
        <div className="p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900 text-center">
          Password updated successfully!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
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
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{isSubmitting ? "Updating..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
