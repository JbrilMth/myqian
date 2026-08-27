"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completePasswordReset } from "@/actions/auth";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await completePasswordReset(token, password, confirmPassword);
      if (!res.success) {
        setError(res.error || "Failed to reset password.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Password Reset Complete
        </h2>
        <p className="text-xs text-zinc-500">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-6 space-y-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Set New Password
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Enter your new password below.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 min-h-[42px]"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span>{isSubmitting ? "Updating..." : "Update Password"}</span>
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-xs text-zinc-500">Loading...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
