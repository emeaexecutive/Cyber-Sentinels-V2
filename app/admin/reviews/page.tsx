import { StatusBadge } from "@/components/phase-one-trust";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type ReviewEvent = {
  id: string;
  subject_type: string | null;
  status: string | null;
  risk_level: string | null;
  notes: string | null;
  created_at: string | null;
};

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/admin/reviews" });

  const adminSupabase = createServiceRoleClient();
  const { data: events, error } = await adminSupabase
    .from("verification_events")
    .select("id,subject_type,status,risk_level,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (events ?? []) as ReviewEvent[];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Admin Review Queue
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Verification Events</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Review pending candidate, recruiter and interview integrity events.
          </p>
        </section>

        {error ? (
          <p className="mt-8 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
            Admin review queue could not be loaded.
          </p>
        ) : null}

        <section className="mt-8 grid gap-3">
          {rows.length ? rows.map((event) => (
            <article key={event.id} className="rounded-lg border border-zinc-800 bg-black p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{event.subject_type}</p>
                  <p className="mt-2 font-medium">{event.id}</p>
                  {event.notes ? <p className="mt-2 text-sm text-zinc-500">{event.notes}</p> : null}
                </div>
                <StatusBadge status={event.risk_level ?? event.status ?? "pending"} />
              </div>
              <form action="/api/admin/reviews" method="post" className="mt-4 flex flex-wrap gap-3">
                <input type="hidden" name="verification_event_id" value={event.id} />
                <button name="status" value="approved" className="rounded-lg border border-emerald-800 px-3 py-2 text-sm text-emerald-200">Approve</button>
                <button name="status" value="needs_manual_review" className="rounded-lg border border-amber-800 px-3 py-2 text-sm text-amber-200">Needs Review</button>
                <button name="status" value="rejected" className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-200">Reject</button>
              </form>
            </article>
          )) : (
            <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
              No verification events are waiting for review.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
