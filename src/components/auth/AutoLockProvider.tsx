"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  startPasskeyAuth,
  finishPasskeyAuth,
  unlockWithPassword,
  lockApp,
  updateLastActive,
} from "@/actions/auth";
import { Lock, Scan, ArrowRight, Loader2 } from "lucide-react";

interface AutoLockContextType {
  isLocked: boolean;
  lockNow: () => void;
  unlock: () => void;
}

const AutoLockContext = createContext<AutoLockContextType>({
  isLocked: false,
  lockNow: () => {},
  unlock: () => {},
});

export function useAutoLock() {
  return useContext(AutoLockContext);
}

interface AutoLockProviderProps {
  children: React.ReactNode;
  userEmail: string;
  hasPasskeys: boolean;
  autoLockTimeout: string; // 'immediately' | '1m' | '5m' | 'never'
  initialLocked?: boolean;
}

export function AutoLockProvider({
  children,
  userEmail,
  hasPasskeys,
  autoLockTimeout,
  initialLocked = false,
}: AutoLockProviderProps) {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  // Refs to avoid stale closures in listeners
  const lastActiveRef = React.useRef<number>(Date.now());
  const isLockedRef = React.useRef<boolean>(isLocked);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // Sync state if server prop changes
  useEffect(() => {
    if (initialLocked !== undefined) {
      setIsLocked(initialLocked);
      isLockedRef.current = initialLocked;
    }
  }, [initialLocked]);

  const triggerLock = useCallback(async () => {
    if (isLockedRef.current) return;
    setIsLocked(true);
    isLockedRef.current = true;
    try {
      // Synchronously set cookie in client jar for immediate refresh resilience
      document.cookie = "myqian_locked=1; path=/; max-age=2592000; SameSite=Lax";
      await lockApp();
    } catch (err) {
      console.error("Failed to set lock:", err);
    }
  }, []);

  const getTimeoutMs = useCallback(() => {
    switch (autoLockTimeout) {
      case "immediately":
        return 0;
      case "1m":
        return 60 * 1000;
      case "5m":
        return 5 * 60 * 1000;
      case "never":
      default:
        return null;
    }
  }, [autoLockTimeout]);

  // Inactivity and Visibility tracking
  useEffect(() => {
    if (isLocked) return;

    const timeoutMs = getTimeoutMs();
    let timer: NodeJS.Timeout | null = null;
    let lastCookieSync = Date.now();

    lastActiveRef.current = Date.now();

    const startOrResetTimer = (durationMs: number) => {
      if (timer) clearTimeout(timer);
      if (durationMs > 0) {
        timer = setTimeout(() => {
          triggerLock();
        }, durationMs);
      }
    };

    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();

      // Periodically sync client cookie (throttled to 10s)
      if (Date.now() - lastCookieSync > 10000) {
        lastCookieSync = Date.now();
        document.cookie = `myqian_last_active=${Date.now()}; path=/; max-age=2592000; SameSite=Lax`;
      }

      if (timeoutMs !== null && timeoutMs > 0) {
        startOrResetTimer(timeoutMs);
      }
    };

    const handleVisibilityChange = () => {
      if (isLockedRef.current) return;

      if (document.visibilityState === "hidden") {
        if (timeoutMs === 0) {
          // Immediately mode: lock when app is left/backgrounded
          triggerLock();
        } else if (timeoutMs !== null && timeoutMs > 0) {
          // Record timestamp when app was backgrounded
          lastActiveRef.current = Date.now();
          document.cookie = `myqian_last_active=${Date.now()}; path=/; max-age=2592000; SameSite=Lax`;
        }
      } else if (document.visibilityState === "visible") {
        if (timeoutMs !== null && timeoutMs > 0) {
          const elapsed = Date.now() - lastActiveRef.current;
          if (elapsed >= timeoutMs) {
            // Background time exceeded timeout
            triggerLock();
          } else {
            // Restart timer for remaining duration
            startOrResetTimer(timeoutMs - elapsed);
          }
        }
      }
    };

    // Initial timer setup for timed modes
    if (timeoutMs !== null && timeoutMs > 0) {
      startOrResetTimer(timeoutMs);
    }

    const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll", "mousemove", "click"];
    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleVisibilityChange);
    };
  }, [autoLockTimeout, getTimeoutMs, isLocked, triggerLock]);

  const handleUnlockWithPasskey = async () => {
    setError(null);
    setIsPasskeyLoading(true);

    try {
      const optRes = await startPasskeyAuth();
      if (!optRes.success || !optRes.data) {
        setError(optRes.error || "Failed to initialize Face ID.");
        setIsPasskeyLoading(false);
        return;
      }

      const { options, challengeId } = optRes.data;

      let authResponse;
      try {
        authResponse = await startAuthentication({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setError("Face ID was cancelled.");
        } else {
          setError(err.message || "Face ID verification failed.");
        }
        setIsPasskeyLoading(false);
        return;
      }

      const finishRes = await finishPasskeyAuth(challengeId, authResponse);
      if (!finishRes.success) {
        setError(finishRes.error || "Face ID authentication failed.");
        setIsPasskeyLoading(false);
        return;
      }

      // Clear client cookie and restore access
      document.cookie = "myqian_locked=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = `myqian_last_active=${Date.now()}; path=/; max-age=2592000; SameSite=Lax`;
      setIsLocked(false);
      isLockedRef.current = false;
      lastActiveRef.current = Date.now();
      setError(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnlocking(true);

    try {
      const res = await unlockWithPassword(password);
      if (!res.success) {
        setError(res.error || "Incorrect password.");
        return;
      }

      // Clear client cookie and restore access
      document.cookie = "myqian_locked=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = `myqian_last_active=${Date.now()}; path=/; max-age=2592000; SameSite=Lax`;
      setIsLocked(false);
      isLockedRef.current = false;
      lastActiveRef.current = Date.now();
      setPassword("");
      setError(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to unlock.");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <AutoLockContext.Provider
      value={{
        isLocked,
        lockNow: triggerLock,
        unlock: () => {
          document.cookie = "myqian_locked=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = `myqian_last_active=${Date.now()}; path=/; max-age=2592000; SameSite=Lax`;
          setIsLocked(false);
          isLockedRef.current = false;
          lastActiveRef.current = Date.now();
          router.refresh();
        },
      }}
    >
      {children}

      {/* Lock Screen Overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 mb-2 shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                My Qian Locked
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {userEmail}
              </p>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            {/* Face ID Unlock */}
            {hasPasskeys && (
              <button
                type="button"
                onClick={handleUnlockWithPasskey}
                disabled={isPasskeyLoading || isUnlocking}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                {isPasskeyLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4" />
                )}
                <span>{isPasskeyLoading ? "Verifying Face ID..." : "Unlock with Face ID"}</span>
              </button>
            )}

            {/* Password Unlock Fallback */}
            <form onSubmit={handleUnlockWithPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Enter Master Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={isUnlocking || isPasskeyLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-xs transition-all shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 min-h-[40px]"
              >
                {isUnlocking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>{isUnlocking ? "Unlocking..." : "Unlock with Password"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </AutoLockContext.Provider>
  );
}
