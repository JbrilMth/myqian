"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { loginWithPassword, startPasskeyAuth, finishPasskeyAuth } from "@/actions/auth";
import { Fingerprint, Scan, ArrowRight, Lock, Mail, Loader2 } from "lucide-react";

interface LoginClientProps {
  hasPasskeys: boolean;
}

export function LoginClient({ hasPasskeys }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await loginWithPassword(email, password);
      if (!res.success) {
        setError(res.error || "Invalid email or password.");
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

  const handlePasskeyLogin = async () => {
    setError(null);
    setIsPasskeyLoading(true);

    try {
      // 1. Get authentication options from server
      const optRes = await startPasskeyAuth();
      if (!optRes.success || !optRes.data) {
        setError(optRes.error || "Failed to initialize Face ID authentication.");
        setIsPasskeyLoading(false);
        return;
      }

      const { options, challengeId } = optRes.data;

      // 2. Trigger native WebAuthn (iPhone Face ID / Touch ID / Passkey)
      let authResponse;
      try {
        authResponse = await startAuthentication({ optionsJSON: options });
      } catch (webauthnErr: any) {
        if (webauthnErr.name === "NotAllowedError") {
          setError("Face ID / Passkey prompt was cancelled.");
        } else {
          setError(webauthnErr.message || "Face ID verification failed.");
        }
        setIsPasskeyLoading(false);
        return;
      }

      // 3. Verify authentication response on server
      const finishRes = await finishPasskeyAuth(challengeId, authResponse);
      if (!finishRes.success) {
        setError(finishRes.error || "Face ID authentication failed.");
        setIsPasskeyLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Passkey login error:", err);
      setError(err.message || "An unexpected error occurred during Face ID login.");
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-6 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-lg mb-2 shadow-xs">
          钱
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          My Qian
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Personal Finance & Ledger Management
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900 leading-relaxed">
          {error}
        </div>
      )}

      {/* Passkey / Face ID Primary Option (When configured) */}
      {hasPasskeys && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={isPasskeyLoading || isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          >
            {isPasskeyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scan className="w-4 h-4" />
            )}
            <span>{isPasskeyLoading ? "Verifying Face ID..." : "Use Face ID / Passkey"}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
            <span className="bg-zinc-50 dark:bg-zinc-950 px-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              or sign in with password
            </span>
          </div>
        </div>
      )}

      {/* Password Login Form */}
      <form onSubmit={handlePasswordLogin} className="space-y-4">
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isPasskeyLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 min-h-[42px]"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
        </button>
      </form>
    </div>
  );
}
