"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const maxScreenshotSize = 5 * 1024 * 1024;
const allowedScreenshotTypes = ["image/png", "image/jpeg", "image/webp"];

export function ReportIssue({ authState }: { authState: string }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [sessionReference, setSessionReference] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = "cyber_support_session_reference";
    const existing = window.sessionStorage.getItem(key);
    const next = existing || crypto.randomUUID();
    window.sessionStorage.setItem(key, next);
    setSessionReference(next);
  }, []);

  function chooseScreenshot(file: File | null) {
    setError(null);
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!allowedScreenshotTypes.includes(file.type)) {
      setScreenshot(null);
      setError("Use a PNG, JPG or WebP screenshot.");
      return;
    }
    if (file.size > maxScreenshotSize) {
      setScreenshot(null);
      setError("Screenshots must be 5MB or smaller.");
      return;
    }
    setScreenshot(file);
  }

  async function submitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setMessage(null);

    if (!consented) {
      setError("Confirm the diagnostic and privacy notice before submitting.");
      return;
    }

    const form = new FormData(formElement);
    const metadata = {
      user_agent: navigator.userAgent,
      language: navigator.language,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine,
    };
    form.set("current_route", pathname);
    form.set("auth_state", authState);
    form.set("session_reference", sessionReference);
    form.set("browser_metadata", JSON.stringify(metadata));
    form.set(
      "build_version",
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "local"
    );
    if (screenshot) form.set("screenshot", screenshot);

    setSubmitting(true);
    try {
      const response = await fetch("/api/support/issues", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        issue_id?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Could not submit the issue report.");
        return;
      }

      setMessage(`Issue ${payload.issue_id} was submitted.`);
      setScreenshot(null);
      formElement.reset();
      setConsented(false);
    } catch {
      setError("Support reporting is temporarily unavailable.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-cyan-800 bg-zinc-950 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-xl shadow-black/40 hover:border-cyan-400"
      >
        Report Issue
      </button>
      <dialog
        ref={dialogRef}
        className="w-[min(94vw,720px)] rounded-xl border border-zinc-700 bg-[#070a10] p-0 text-white backdrop:bg-black/75"
      >
        <form onSubmit={submitIssue} className="max-h-[88vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Operational support
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Report an issue</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Screenshots help improve workflow continuity and operational reliability.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-zinc-300">
              Issue type
              <select name="issue_type" className="rounded-lg border border-zinc-700 bg-black p-3">
                <option value="ui_regression">UI regression</option>
                <option value="broken_dropdown">Broken dropdown</option>
                <option value="missing_button">Missing button</option>
                <option value="auth_rendering">Auth rendering failure</option>
                <option value="replay_rendering">Replay rendering issue</option>
                <option value="typography_layout">Typography or layout</option>
                <option value="workflow_diagnostic">Workflow diagnostic</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Summary
              <input name="summary" required maxLength={180} className="rounded-lg border border-zinc-700 bg-black p-3" />
            </label>
          </div>

          <label className="mt-4 grid gap-2 text-sm text-zinc-300">
            What happened?
            <textarea name="details" rows={4} maxLength={4000} className="rounded-lg border border-zinc-700 bg-black p-3" />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-zinc-300">Workflow ID<input name="workflow_id" className="rounded-lg border border-zinc-700 bg-black p-3" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">Workflow state<input name="workflow_state" className="rounded-lg border border-zinc-700 bg-black p-3" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">Replay reference<input name="replay_reference" className="rounded-lg border border-zinc-700 bg-black p-3" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">Provider state<input name="provider_state" className="rounded-lg border border-zinc-700 bg-black p-3" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">Trust posture state<input name="trust_posture_state" className="rounded-lg border border-zinc-700 bg-black p-3" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Attach Screenshot (optional)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => chooseScreenshot(event.target.files?.item(0) ?? null)}
                className="rounded-lg border border-zinc-700 bg-black p-3"
              />
            </label>
          </div>

          <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400">
            <p className="font-semibold text-zinc-200">Visible diagnostic consent</p>
            <p className="mt-2">
              This report includes the current route, the workflow references you enter,
              authentication state, browser/device dimensions, timezone, build version and timestamp.
              It never includes passwords, cookies, access tokens or hidden screen capture.
            </p>
            <label className="mt-3 flex items-start gap-3 text-zinc-300">
              <input
                name="support_consent"
                value="confirmed"
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.target.checked)}
                className="mt-1"
              />
              I consent to submitting this operational diagnostic and any screenshot I selected.
            </label>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-900 p-3 text-sm text-red-200">{error}</p> : null}
          {message ? <p className="mt-4 rounded-lg border border-emerald-900 p-3 text-sm text-emerald-200">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Issue"}
          </button>
        </form>
      </dialog>
    </>
  );
}
