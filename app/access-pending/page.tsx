import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  PENDING: "Your access request is awaiting review.",
  DENIED: "Your access request was denied.",
  SUSPENDED: "Your account access is currently suspended.",
  REVOKED: "Your account access has been revoked.",
};

export default async function AccessPendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: approval } = await supabase
    .from("account_access_approvals")
    .select("status,organization,reason")
    .eq("user_id", user.id)
    .maybeSingle();

  if (approval?.status === "APPROVED") redirect("/operational-entities");

  const status = approval?.status ?? "PENDING";

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-12 text-white">
      <section className="w-full max-w-xl border-l-2 border-amber-500 pl-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
          Account access: {status}
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Access review</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          {statusMessages[status] ?? "Product access is not currently approved."}
        </p>
        {approval?.organization ? (
          <p className="mt-3 text-sm text-zinc-500">Organization: {approval.organization}</p>
        ) : null}
        {approval?.reason ? (
          <p className="mt-3 text-sm text-zinc-400">Reason: {approval.reason}</p>
        ) : null}
        <form action="/api/auth/logout" method="POST" className="mt-8">
          <button
            type="submit"
            className="inline-flex border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}