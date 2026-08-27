"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/actions/auth";
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export function RegisterClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
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
      const res = await register(email, password, confirmPassword);
      if (!res.success) {
        setError(res.error || "Failed to create account.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-lg mb-2 shadow-xs">
          钱
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Create your account
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Initial setup for your private My Qian vault
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900 leading-relaxed">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
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
          <span>{isSubmitting ? "Creating Account..." : "Create Account"}</span>
        </button>
      </form>

      <div className="p-3 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl text-[11px] text-zinc-500 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          After creating your account, you will be able to enable Face ID / Passkey in Settings for instant biometric login.
        </span>
      </div>
    </div>
  );
}
