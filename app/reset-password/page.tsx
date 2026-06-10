"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const authTimeoutMs = 5000;

async function withAuthTimeout<T>(task: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Supabase auth timed out after ${authTimeoutMs / 1000} seconds.`)),
          authTimeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function getResetPasswordMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("session") ||
    normalized.includes("expired") ||
    normalized.includes("invalid") ||
    normalized.includes("refresh")
  ) {
    return "Reset link expired or invalid. Request a new password reset email.";
  }

  return message || "Could not update password.";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    setMessage("");

    if (!password || !confirmPassword) {
      setMessage("Enter and confirm your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await withAuthTimeout(
        supabase.auth.updateUser({ password })
      );

      if (error) {
        setMessage(getResetPasswordMessage(error));
        return;
      }

      setMessage("Password updated successfully.");
      router.push("/passport");
    } catch (error) {
      console.error("Supabase password update failed.", error);
      setMessage(getResetPasswordMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-bold">Reset Password</h1>

        <div className="mt-8 grid gap-4">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <button
            onClick={updatePassword}
            disabled={loading}
            type="button"
            className="rounded-xl bg-white p-4 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

          {message && <p className="text-sm text-zinc-400">{message}</p>}

          <Link href="/" className="text-sm text-zinc-400 underline">
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
