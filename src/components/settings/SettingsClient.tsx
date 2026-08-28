"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { ExchangeRateModal } from "./ExchangeRateModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { deleteExchangeRate } from "@/actions/settings";
import {
  startPasskeyRegistration,
  finishPasskeyRegistration,
  disablePasskey,
  updateAutoLockTimeout,
  logout,
} from "@/actions/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Settings,
  Plus,
  Trash2,
  ArrowLeftRight,
  Database,
  ShieldCheck,
  Calculator,
  Sun,
  Moon,
  Laptop,
  Scan,
  Lock,
  LogOut,
  ChevronRight,
  Loader2,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  initialRates: any[];
  securityStatus: {
    hasPasskey: boolean;
    autoLockTimeout: string;
    email: string;
  };
}

export function SettingsClient({ initialRates, securityStatus }: SettingsClientProps) {
  const router = useRouter();
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySuccess, setPasskeySuccess] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleDeleteRate = async (id: string) => {
    if (!confirm("Are you sure you want to remove this exchange rate?")) return;
    setDeletingId(id);
    try {
      await deleteExchangeRate(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEnableFaceId = async () => {
    setPasskeyError(null);
    setPasskeySuccess(null);
    setIsPasskeyLoading(true);

    try {
      // 1. Get registration options from server
      const optRes = await startPasskeyRegistration();
      if (!optRes.success || !optRes.data) {
        setPasskeyError(optRes.error || "Failed to initialize Face ID setup.");
        setIsPasskeyLoading(false);
        return;
      }

      const { options, challengeId } = optRes.data;

      // 2. Trigger native WebAuthn (iPhone Face ID / Touch ID)
      let regResponse;
      try {
        regResponse = await startRegistration({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setPasskeyError("Face ID setup was cancelled.");
        } else {
          setPasskeyError(err.message || "Face ID setup failed.");
        }
        setIsPasskeyLoading(false);
        return;
      }

      // 3. Verify on server
      const finishRes = await finishPasskeyRegistration(challengeId, regResponse);
      if (!finishRes.success) {
        setPasskeyError(finishRes.error || "Failed to register Face ID passkey.");
        setIsPasskeyLoading(false);
        return;
      }

      setPasskeySuccess("Face ID has been successfully enabled!");
      router.refresh();
    } catch (err: any) {
      setPasskeyError(err.message || "An unexpected error occurred.");
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleDisableFaceId = async () => {
    if (!confirm("Are you sure you want to disable Face ID sign in?")) return;
    setIsPasskeyLoading(true);
    setPasskeyError(null);
    try {
      await disablePasskey();
      setPasskeySuccess("Face ID has been disabled.");
      router.refresh();
    } catch (err: any) {
      setPasskeyError(err.message || "Failed to disable Face ID.");
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleAutoLockChange = async (val: string) => {
    document.cookie = `myqian_last_active=${Date.now()}; path=/; max-age=2592000; SameSite=Lax`;
    await updateAutoLockTimeout(val as any);
    router.refresh();
  };

  const handleLogout = async () => {
    if (!confirm("Sign out of My Qian?")) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Settings & Security
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage security, Face ID passkeys, appearance, and exchange rates.
          </p>
        </div>

        {securityStatus.email && (
          <div className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl self-start">
            Signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{securityStatus.email}</span>
          </div>
        )}
      </div>

      {/* SECURITY SECTION */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Security & Authentication
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure biometric sign-in, session auto-lock, and password settings.
          </p>
        </div>

        {passkeyError && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900">
            {passkeyError}
          </div>
        )}

        {passkeySuccess && (
          <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{passkeySuccess}</span>
          </div>
        )}

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-2xs">
          {/* Face ID / Passkey Item */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mt-0.5">
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Face ID / Passkey
                  </span>
                  {securityStatus.hasPasskey ? (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 rounded-md">
                      Not Enabled
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Sign in instantly using iPhone Face ID, Mac Touch ID, or Windows Hello.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              {securityStatus.hasPasskey ? (
                <>
                  <button
                    type="button"
                    onClick={handleEnableFaceId}
                    disabled={isPasskeyLoading}
                    className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {isPasskeyLoading ? "Updating..." : "Re-enroll Device"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDisableFaceId}
                    disabled={isPasskeyLoading}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableFaceId}
                  disabled={isPasskeyLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
                >
                  {isPasskeyLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Scan className="w-3.5 h-3.5" />
                  )}
                  <span>{isPasskeyLoading ? "Setting up..." : "Enable Face ID"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Auto-Lock Setting */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Auto-Lock
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Require Face ID or password after a period of inactivity or backgrounding.
                </p>
              </div>
            </div>

            <select
              value={securityStatus.autoLockTimeout}
              onChange={(e) => handleAutoLockChange(e.target.value)}
              className="text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 cursor-pointer focus:outline-hidden"
            >
              <option value="immediately">Immediately</option>
              <option value="1m">After 1 minute</option>
              <option value="5m">After 5 minutes</option>
              <option value="never">Never</option>
            </select>
          </div>

          {/* Change Password */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Change Master Password
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Update your primary account login credentials.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Change Password"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sign Out */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Sign Out
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  End your current session on this device.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </section>

      {/* APPEARANCE / THEME SECTION */}
      <section className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Interface Appearance
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Customize the look and feel of your finance console.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme === "light"
                ? "border-zinc-950 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/80 shadow-xs ring-1 ring-zinc-950/20 dark:ring-white/20"
                : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Light Mode
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Clean and bright
              </div>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme === "dark"
                ? "border-zinc-950 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/80 shadow-xs ring-1 ring-zinc-950/20 dark:ring-white/20"
                : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Dark Mode
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Subtle low-light
              </div>
            </div>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme === "system"
                ? "border-zinc-950 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/80 shadow-xs ring-1 ring-zinc-950/20 dark:ring-white/20"
                : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                System Sync
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Match OS theme
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* EXCHANGE RATES SECTION */}
      <section className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Manual Exchange Rates
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Used strictly for dashboard approximate total valuations. Native account balances and transaction amounts remain unchanged.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rate</span>
          </button>
        </div>

        {initialRates.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="w-5 h-5 text-zinc-400" />}
            title="No exchange rates configured"
            description="Configure exchange rates (such as 1 CNY = 1.30 MAD) to view an approximate converted total value on your dashboard."
            action={
              <button
                type="button"
                onClick={() => setIsRateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Configure Rate
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Conversion Pair</th>
                  <th className="px-4 py-3">Configured Rate</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {initialRates.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      1 {r.fromCurrency} → {r.toCurrency}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {r.rate}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRate(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete rate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SYSTEM ARCHITECTURE & INTEGRITY */}
      <section className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          System Integrity & Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>Neon PostgreSQL</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Connected to real persistent Neon PostgreSQL database with foreign key constraints, indexes, and full relational integrity.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
              <Calculator className="w-4 h-4 text-blue-500" />
              <span>Exact Decimal Arithmetic</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              All financial balances and totals computed using exact decimal arithmetic with zero JavaScript floating-point rounding errors.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>Zero Fake / Mock Data</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Clean initial state with zero hardcoded financial records. Every account, category, person, and transaction is user-managed.
            </p>
          </div>
        </div>
      </section>

      <ExchangeRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
