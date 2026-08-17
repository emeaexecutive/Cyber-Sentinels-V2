import Link from "next/link";
import { cookies } from "next/headers";
import {
  normalizePasswordResetCorrelationId,
  PASSWORD_RECOVERY_COOKIE,
} from "@/lib/auth/password-recovery";
import { createNavigationClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recoveryState = normalizePasswordResetCorrelationId(
    cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value,
  );
  const supabase = await createNavigationClient();
  const user = recoveryState
    ? (await supabase?.auth.getUser().catch(() => ({ data: { user: null } })))?.data.user
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#04070c] px-5 py-10 text-white sm:px-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-black p-6 shadow-2xl shadow-black/40 sm:p-8">
        <Link href="/" className="text-xs font-semibold tracking-[0.22em] text-cyan-200">
          CYBER SENTINELS
        </Link>

        {recoveryState && user ? (
          <ResetPasswordForm />
        ) : (
          <div className="mt-8">
            <h1 className="text-3xl font-semibold tracking-tight">Reset link expired or invalid</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Password reset links are single-use and expire for your security. Request a new link to continue.
            </p>
            <Link
              href="/login?mode=forgot-password"
              className="brand-primary-action mt-7 block w-full p-4 text-center"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
