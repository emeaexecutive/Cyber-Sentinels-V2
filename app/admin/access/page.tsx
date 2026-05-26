import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionGuard } from "@/components/session-guard";
import {
  hasAdminVerifiedCookie,
  isAdminAllowlisted,
} from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminAccessPageProps = {
  searchParams?: Promise<{ denied?: string }>;
};

export default async function AdminAccessPage({
  searchParams,
}: AdminAccessPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowlisted = isAdminAllowlisted(user?.email);

  if (user && allowlisted && (await hasAdminVerifiedCookie())) {
    redirect("/admin");
  }

  const params = await searchParams;
  const denied = params?.denied === "1";

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      {user ? <SessionGuard /> : null}
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold">Triple-Secure Back Office</h1>
          <p className="mt-3 text-zinc-400">
            Authenticated. Allowlisted. Step-up verified.
          </p>

          {!user ? (
            <div className="mt-6 rounded-lg border border-amber-900 bg-black p-4">
              <p className="text-sm font-medium text-amber-200">
                Login required before admin access code.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
              >
                Go to login
              </Link>
            </div>
          ) : allowlisted ? (
            <form action="/api/admin/access" method="post" className="mt-6 grid gap-4">
              <p className="text-sm text-emerald-300">
                Logged in as {user.email ?? user.id}. This account is allowlisted.
              </p>
              <label className="grid gap-2 text-sm text-zinc-400">
                Admin access code
                <input
                  name="access_code"
                  type="password"
                  autoComplete="one-time-code"
                  required
                  className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
                />
              </label>

              <button
                type="submit"
                className="rounded-lg bg-white p-3 font-semibold text-black"
              >
                Verify admin access
              </button>

              {denied ? (
                <p className="text-sm text-red-300">Admin access denied.</p>
              ) : null}
            </form>
          ) : (
            <div className="mt-6 rounded-lg border border-red-900 bg-black p-4">
              <p className="text-sm text-red-300">
                Logged in as {user.email ?? user.id}. This account is not allowlisted for admin access.
              </p>
              {denied ? (
                <p className="mt-2 text-sm text-red-300">Admin access denied.</p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
