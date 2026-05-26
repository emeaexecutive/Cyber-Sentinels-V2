"use client";

import { useEffect, useRef, useState } from "react";

const INACTIVITY_WARNING_MS = 14 * 60 * 1000;
const INACTIVITY_LOGOUT_MS = 15 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const SESSION_START_KEY = "cyber_sentinels_session_started_at";

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

    async function expireSession(reason: ExpiryReason) {
      if (expiring.current) return;

      expiring.current = true;

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

      window.localStorage.removeItem(SESSION_START_KEY);
      window.location.assign("/login?expired=1");
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
      const sessionStart = storedStart ? Number(storedStart) : Date.now();

      if (!storedStart || !Number.isFinite(sessionStart)) {
        window.localStorage.setItem(SESSION_START_KEY, String(sessionStart));
      }

      const remainingMs = sessionStart + ABSOLUTE_TIMEOUT_MS - Date.now();

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

    scheduleInactivityTimers();
    ensureAbsoluteTimeout();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, scheduleInactivityTimers, {
        passive: true,
      });
    });

    return () => {
      clearTimers();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, scheduleInactivityTimers);
      });
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
