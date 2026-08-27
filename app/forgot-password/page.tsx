"use client";

import React, { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await requestPasswordReset(email);
      if (!res.success) {
        setError(res.error || "Failed to process request.");
        return;
      }
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm mx-auto p-6 space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Reset Password
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter your email to receive recovery instructions.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {resetToken ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Password Reset Link Ready</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Click below to proceed directly to set your new password:
            </p>
            <Link
              href={`/reset-password?token=${resetToken}`}
              className="inline-flex items-center justify-center w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              Set New Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
              <span>{isSubmitting ? "Processing..." : "Send Reset Link"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
