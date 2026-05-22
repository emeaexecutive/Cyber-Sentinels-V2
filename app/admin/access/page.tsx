import Link from "next/link";
import { redirect } from "next/navigation";
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

  if (!user) {
    redirect("/login");
  }

  const allowlisted = isAdminAllowlisted(user.email);

  if (allowlisted && (await hasAdminVerifiedCookie())) {
    redirect("/admin");
  }

  const params = await searchParams;
  const denied = params?.denied === "1";

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold">Triple-Secure Back Office</h1>
          <p className="mt-3 text-zinc-400">
            Authenticated. Allowlisted. Step-up verified.
          </p>

          {allowlisted ? (
            <form action="/api/admin/access" method="post" className="mt-6 grid gap-4">
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
            <p className="mt-6 text-sm text-red-300">Admin access denied.</p>
          )}
        </section>
      </div>
    </main>
  );
}
