"use client";

import { useEffect, useRef, useState } from "react";

const INACTIVITY_WARNING_MS = 14 * 60 * 1000;
const INACTIVITY_LOGOUT_MS = 15 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const SESSION_START_KEY = "cyber_sentinels_session_started_at";
const isDevelopment = process.env.NODE_ENV === "development";

type ExpiryReason = "inactivity" | "absolute_timeout";

export function SessionGuard() {
  const [warningVisible, setWarningVisible] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiring = useRef(false);

  useEffect(() => {
    function clearTimers() {
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (absoluteTimer.current) clearTimeout(absoluteTimer.current);
    }

    function clearSessionStart() {
      window.localStorage.removeItem(SESSION_START_KEY);
    }

    async function expireSession(reason: ExpiryReason) {
      if (expiring.current) return;

      expiring.current = true;

      if (isDevelopment) {
        console.log("SessionGuard timeout logout", reason);
      }

      try {
        await fetch("/api/auth/session-expired", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ reason }),
        });
      } catch {
        // Session expiry logging is best-effort. Logout still proceeds.
      }

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        // Fall through to login; server-side pages still enforce Supabase auth.
      }

      clearSessionStart();
      window.location.assign("/login?expired=1");
    }

    function clearOnLogout(event: MouseEvent | SubmitEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const logoutLink = target.closest('a[href="/api/auth/logout"]');
      const logoutForm = target.closest('form[action="/api/auth/logout"]');

      if (logoutLink || logoutForm) {
        clearSessionStart();
      }
    }

    function scheduleInactivityTimers() {
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);

      setWarningVisible(false);
      warningTimer.current = setTimeout(() => {
        setWarningVisible(true);
      }, INACTIVITY_WARNING_MS);
      logoutTimer.current = setTimeout(() => {
        void expireSession("inactivity");
      }, INACTIVITY_LOGOUT_MS);
    }

    function ensureAbsoluteTimeout() {
      const storedStart = window.localStorage.getItem(SESSION_START_KEY);
      const now = Date.now();
      const sessionStart = storedStart ? Number(storedStart) : now;

      if (!storedStart || !Number.isFinite(sessionStart)) {
        window.localStorage.setItem(SESSION_START_KEY, String(now));
        return;
      }

      const remainingMs = sessionStart + ABSOLUTE_TIMEOUT_MS - now;

      if (remainingMs <= 0) {
        void expireSession("absolute_timeout");
        return;
      }

      absoluteTimer.current = setTimeout(() => {
        void expireSession("absolute_timeout");
      }, remainingMs);
    }

    const activityEvents = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ] as const;
    const pathname = window.location.pathname;
    const autoExpiryDisabled =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/verification-queue");

    if (isDevelopment) {
      console.log("SessionGuard initialized");
    }

    const storedStart = window.localStorage.getItem(SESSION_START_KEY);

    if (!storedStart || !Number.isFinite(Number(storedStart))) {
      window.localStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }

    if (!autoExpiryDisabled) {
      scheduleInactivityTimers();
      ensureAbsoluteTimeout();
      activityEvents.forEach((eventName) => {
        window.addEventListener(eventName, scheduleInactivityTimers, {
          passive: true,
        });
      });
    }

    window.addEventListener("click", clearOnLogout);
    window.addEventListener("submit", clearOnLogout);

    return () => {
      clearTimers();
      if (!autoExpiryDisabled) {
        activityEvents.forEach((eventName) => {
          window.removeEventListener(eventName, scheduleInactivityTimers);
        });
      }
      window.removeEventListener("click", clearOnLogout);
      window.removeEventListener("submit", clearOnLogout);
    };
  }, []);

  if (!warningVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-amber-700 bg-black p-4 text-sm text-amber-200 shadow-2xl md:left-auto md:max-w-md">
      You have been inactive for 14 minutes. For security, Cyber Sentinels will
      sign you out after 15 minutes of inactivity.
    </div>
  );
}
