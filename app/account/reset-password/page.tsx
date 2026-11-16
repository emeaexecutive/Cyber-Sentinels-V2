import { AccountLanguageControl } from "@/components/account-language-control";
import { accountCopy, accountLocale, accountHref, ACCOUNT_LOCALE_COOKIE } from "@/lib/i18n/account";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  normalizePasswordResetCorrelationId,
  PASSWORD_RECOVERY_COOKIE,
  isActivePasswordRecovery,
} from "@/lib/auth/password-recovery";
import { createNavigationClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> } = {}) {
  const cookieStore = await cookies();
  const locale = accountLocale((await searchParams)?.lang, cookieStore.get(ACCOUNT_LOCALE_COOKIE)?.value);
  const copy = accountCopy[locale];
  const recoveryState = normalizePasswordResetCorrelationId(
    cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value,
  );
  const supabase = await createNavigationClient();
  const verified = await supabase?.auth.getClaims().catch(() => null);
  const activeRecovery = !verified?.error && isActivePasswordRecovery(verified?.data?.claims);
  const user = recoveryState
    ? (await supabase?.auth.getUser().catch(() => ({ data: { user: null } })))?.data.user
    : null;

  return (
    <main lang={locale} className="flex min-h-screen items-center justify-center bg-[#04070c] px-5 py-10 text-white sm:px-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-black p-6 shadow-2xl shadow-black/40 sm:p-8">
        <Link href="/" className="text-xs font-semibold tracking-[0.22em] text-cyan-200">
          CYBER SENTINELS
        </Link>

        {recoveryState && user && activeRecovery ? (
          <ResetPasswordForm locale={locale} />
        ) : (
          <div className="mt-8">
            <h1 className="text-3xl font-semibold tracking-tight">{copy.expiredTitle}</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {copy.expiredBody}
            </p>
            <Link
              href={accountHref("/login?mode=forgot-password", locale)}
              className="brand-primary-action mt-7 block w-full p-4 text-center"
            >
              {copy.requestLink}
            </Link>
          </div>
        )}
        <AccountLanguageControl locale={locale} />
      </section>
    </main>
  );
}
