import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

async function markAllRead() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/notifications");

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id);

  const actor = user.email ?? user.id;
  await createAuditLog(supabase, "notifications_marked_read", actor, {
    actor,
  });
  await createSignal(supabase, "Notifications marked read", { actor });
  redirect("/notifications?read=1");
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/notifications");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = notifications ?? [];
  const unreadCount = rows.filter((row) => !row.is_read).length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Notifications
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Notification Center</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Review passport, evidence, decision, appeal and message updates.
              </p>
            </div>
            <form action={markAllRead}>
              <button className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
                Mark All Read
              </button>
            </form>
          </div>
        </section>

        {params?.read ? (
          <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-200">
            Notifications marked read.
          </p>
        ) : null}

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Latest Updates</h2>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {unreadCount} unread
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {rows.length ? (
              rows.map((notification) => (
                <article
                  key={String(notification.id)}
                  className={`rounded-lg border p-4 ${
                    notification.is_read
                      ? "border-zinc-800 bg-black"
                      : "border-cyan-900 bg-cyan-950/10"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-100">
                        {notification.title ?? "Notification"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {notification.body ?? "Update recorded."}
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                      {notification.notification_type ?? "update"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-600">
                    {formatDate(notification.created_at)}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No notifications yet. Updates will appear here when your trust
                workflow changes.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Future secure email and SMS notifications planned.
          </p>
        </section>
      </div>
    </main>
  );
}
