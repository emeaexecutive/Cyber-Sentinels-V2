import { redirect } from "next/navigation";
import { createNotification } from "@/lib/communications/createNotification";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

async function createThread(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/messages");

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!subject || !message) redirect("/messages?error=missing");

  const actor = user.email ?? user.id;
  const { data: thread, error } = await supabase
    .from("message_threads")
    .insert({
      subject,
      created_by_user_id: user.id,
      created_by_email: user.email,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !thread) redirect("/messages?error=submit_failed");

  const metadata = {
    thread_id: thread.id,
    actor,
  };

  await supabase.from("message_events").insert({
    thread_id: thread.id,
    sender_type: "user",
    sender_email: actor,
    message,
    metadata,
  });
  await createAuditLog(supabase, "message_received", actor, metadata);
  await createSignal(supabase, "Message received", metadata);
  await createNotification(supabase, {
    userId: user.id,
    title: "Message sent",
    body: "Your message thread was created for human review.",
    notificationType: "message_received",
    actor,
    metadata,
  });

  redirect("/messages?created=1");
}

async function replyToThread(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/messages");

  const threadId = String(formData.get("thread_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!threadId || !message) redirect("/messages?error=missing");

  const actor = user.email ?? user.id;
  const metadata = { thread_id: threadId, actor };

  const { error } = await supabase.from("message_events").insert({
    thread_id: threadId,
    sender_type: "user",
    sender_email: actor,
    message,
    metadata,
  });

  if (error) redirect("/messages?error=submit_failed");

  await supabase
    .from("message_threads")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("created_by_user_id", user.id);
  await createAuditLog(supabase, "message_received", actor, metadata);
  await createSignal(supabase, "Message received", metadata);

  redirect("/messages?replied=1");
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/messages");

  const { data: threads } = await supabase
    .from("message_threads")
    .select("*")
    .eq("created_by_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);
  const threadRows = threads ?? [];
  const threadIds = threadRows.map((thread) => String(thread.id));
  const { data: events } = threadIds.length
    ? await supabase
        .from("message_events")
        .select("*")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: true })
    : { data: [] as AnyRow[] };
  const eventsByThread = new Map<string, AnyRow[]>();

  (events ?? []).forEach((event) => {
    const threadId = String(event.thread_id);
    eventsByThread.set(threadId, [...(eventsByThread.get(threadId) ?? []), event]);
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Messages
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Support Messages</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Ask support questions, reply to verification requests and respond to
            review outcomes. Messages are reviewed by humans.
          </p>
        </section>

        {params?.created || params?.replied ? (
          <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-200">
            Message recorded for review.
          </p>
        ) : null}

        <form action={createThread} className="mt-8 grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
          <h2 className="text-xl font-semibold">Start a Message Thread</h2>
          <input
            name="subject"
            required
            placeholder="Subject"
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
          />
          <textarea
            name="message"
            required
            rows={5}
            placeholder="Tell the review team what you need."
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
          />
          <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
            Send Message
          </button>
        </form>

        <section className="mt-8 grid gap-4">
          <h2 className="text-2xl font-semibold">Your Threads</h2>
          {threadRows.length ? (
            threadRows.map((thread) => (
              <article key={String(thread.id)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-zinc-100">{thread.subject ?? "Message thread"}</h3>
                    <p className="mt-1 text-xs text-zinc-600">{formatDate(thread.updated_at ?? thread.created_at)}</p>
                  </div>
                  <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-100">
                    {thread.status ?? "open"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {(eventsByThread.get(String(thread.id)) ?? []).map((event) => (
                    <div key={String(event.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                        {event.sender_type ?? "message"} / {formatDate(event.created_at)}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {event.message}
                      </p>
                    </div>
                  ))}
                </div>
                {thread.status !== "closed" ? (
                  <form action={replyToThread} className="mt-4 grid gap-3">
                    <input type="hidden" name="thread_id" value={String(thread.id)} />
                    <textarea
                      name="message"
                      required
                      rows={3}
                      placeholder="Reply to this thread"
                      className="rounded-lg border border-zinc-800 bg-black p-3 text-white placeholder:text-zinc-600"
                    />
                    <button className="w-fit rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
                      Reply
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
              No messages yet. Start a message thread when you need help with a
              passport, evidence or review outcome.
            </p>
          )}
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
