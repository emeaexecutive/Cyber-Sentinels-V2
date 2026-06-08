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
    .update({ is_read: true, read: true })
    .eq("user_id", user.id);

  const actor = user.email ?? user.id;
  await createAuditLog(supabase, "notifications_marked_read", actor, {
    actor,
  });
  await createSignal(supabase, "Notifications marked read", { actor });
  redirect("/notifications?read=1");
}

function notificationMessage(row: Record<string, any>) {
  return String(row.message ?? row.body ?? "Operational update recorded.");
}

function notificationRead(row: Record<string, any>) {
  return Boolean(row.read ?? row.is_read);
}

function severityClass(severity?: string | null) {
  const normalized = String(severity ?? "info").toLowerCase();
  if (["critical", "high"].includes(normalized)) return "border-red-800 text-red-200";
  if (["review", "warning", "medium"].includes(normalized)) return "border-amber-800 text-amber-200";
  if (normalized === "success") return "border-emerald-800 text-emerald-200";
  return "border-cyan-800 text-cyan-200";
}

function typeLabel(value?: string | null) {
  return String(value ?? "update").replace(/_/g, " ");
}

function NotificationCard({ notification }: { notification: Record<string, any> }) {
  const isRead = notificationRead(notification);
  const metadata =
    notification.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata)
      ? notification.metadata
      : {};

  return (
    <article
      className={`rounded-lg border p-4 ${
        isRead ? "border-zinc-800 bg-black" : "border-cyan-900 bg-cyan-950/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-100">
            {notification.title ?? "Notification"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {notificationMessage(notification)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs capitalize ${severityClass(notification.severity)}`}>
            {notification.severity ?? "info"}
          </span>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs capitalize text-zinc-300">
            {typeLabel(notification.notification_type)}
          </span>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
        <p>{formatDate(notification.created_at)}</p>
        <p>State: {isRead ? "read" : "unread"}</p>
        <p>Email ready: {metadata.email_ready ? "prepared" : "not configured yet"}</p>
      </div>
    </article>
  );
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
  const unread = rows.filter((row) => !notificationRead(row));
  const escalations = rows.filter((row) =>
    /escalation|suspicious|review/i.test(
      `${row.notification_type ?? ""} ${row.severity ?? ""} ${row.title ?? ""}`
    )
  );
  const governanceActions = rows.filter((row) =>
    /governance|review|evidence_request|ai_recommendation/i.test(
      String(row.notification_type ?? "")
    )
  );
  const reminders = rows.filter((row) =>
    /assigned|request|pending|reminder/i.test(
      `${row.notification_type ?? ""} ${row.title ?? ""} ${notificationMessage(row)}`
    )
  );
  const unreadCount = unread.length;

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
                Review high-value operational updates across governance actions,
                evidence requests, trust cases, appeals and AI-assisted review
                recommendations.
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
            <h2 className="text-xl font-semibold">Unread</h2>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {unreadCount} unread
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {unread.length ? (
              unread.map((notification) => (
                <NotificationCard key={String(notification.id)} notification={notification} />
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No unread operational notifications. New assignments,
                escalations and evidence requests will appear here.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {[
            ["Escalations", escalations, "No escalations require attention."],
            ["Governance Actions", governanceActions, "No governance notifications are waiting."],
            ["Review Reminders", reminders, "No review reminders are pending."],
          ].map(([title, collection, empty]) => {
            const items = collection as Record<string, any>[];
            return (
              <section key={String(title)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">{String(title)}</h2>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                    {items.length}
                  </span>
                </div>
                <div className="mt-5 grid gap-3">
                  {items.length ? (
                    items.slice(0, 5).map((notification) => (
                      <NotificationCard key={String(notification.id)} notification={notification} />
                    ))
                  ) : (
                    <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                      {String(empty)}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Recent</h2>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
              {rows.length}
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {rows.length ? (
              rows.slice(0, 12).map((notification) => (
                <NotificationCard key={String(notification.id)} notification={notification} />
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No notifications yet. Cyber Sentinels keeps this view focused
                on high-value operational coordination rather than constant
                activity noise.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Email Readiness</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Notification records include delivery-safe metadata for future
            email digests and governance escalation alerts. No external email
            provider is required for V1.
          </p>
        </section>
      </div>
    </main>
  );
}
