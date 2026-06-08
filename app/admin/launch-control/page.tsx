import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createLaunchControlSnapshot, type LaunchCheckState } from "@/lib/launch-control/checklist";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LaunchControlNote = {
  id: string;
  note: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
};

const noteStatuses = ["blocker", "improvement", "decision", "deferred"];

async function addLaunchControlNote(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const user = await requireAdminPageAccess(supabase, {
    path: "/admin/launch-control",
    action: "add_launch_note",
  });
  const note = String(formData.get("note") ?? "").trim();
  const status = String(formData.get("status") ?? "blocker").trim();

  if (!note) {
    return;
  }

  await supabase.from("launch_control_notes").insert({
    note,
    status: noteStatuses.includes(status) ? status : "blocker",
    created_by: user.email ?? user.id,
  });

  revalidatePath("/admin/launch-control");
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function stateLabel(state: LaunchCheckState) {
  if (state === "ready") return "Ready";
  if (state === "blocked") return "Blocked";
  return "Caution";
}

function stateClass(state: LaunchCheckState) {
  if (state === "ready") {
    return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  }

  if (state === "blocked") {
    return "border-red-800 bg-red-950/20 text-red-200";
  }

  return "border-amber-800 bg-amber-950/20 text-amber-200";
}

function statusClass(status: string) {
  if (status === "Ready") return "border-emerald-800 text-emerald-200";
  if (status === "Blocked") return "border-red-800 text-red-200";
  return "border-amber-800 text-amber-200";
}

function noteClass(status: string | null) {
  if (status === "blocker") return "border-red-800 text-red-200";
  if (status === "decision") return "border-cyan-800 text-cyan-200";
  if (status === "deferred") return "border-zinc-700 text-zinc-300";
  return "border-amber-800 text-amber-200";
}

async function readNotes(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("launch_control_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<LaunchControlNote[]>();

  if (error) {
    console.warn("Launch control notes unavailable", error);
    return [] as LaunchControlNote[];
  }

  return data ?? [];
}

export default async function AdminLaunchControlPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/launch-control");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/launch-control" });

  const [snapshot, notes] = await Promise.all([
    createLaunchControlSnapshot(supabase),
    readNotes(supabase),
  ]);
  const totalChecks = snapshot.sections.reduce(
    (sum, section) => sum + section.checks.length,
    0
  );
  const readyChecks = snapshot.sections.flatMap((section) => section.checks).filter(
    (item) => item.state === "ready"
  ).length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Launch Control</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Public testing and design-partner outreach checklist for core
                Cyber Sentinels readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/api-tests"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                API Tests
              </Link>
              <Link
                href="/back-office"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
              >
                Back Office
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                Launch Status
              </p>
              <h2 className="mt-2 text-3xl font-semibold">{snapshot.status}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                {snapshot.summary}
              </p>
            </div>
            <span className={`rounded-full border px-4 py-2 text-sm ${statusClass(snapshot.status)}`}>
              {readyChecks}/{totalChecks} ready
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Ready</p>
              <p className="mt-2 text-2xl font-semibold">{readyChecks}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Needs Attention</p>
              <p className="mt-2 text-2xl font-semibold">{snapshot.attention.length}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Blocked</p>
              <p className="mt-2 text-2xl font-semibold">{snapshot.blockers.length}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6">
          {snapshot.sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {section.checks.map((item) => (
                  <div key={`${section.title}-${item.label}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">{item.message}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${stateClass(item.state)}`}>
                        {stateLabel(item.state)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Add Launch Note</h2>
            <form action={addLaunchControlNote} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-zinc-400">
                Type
                <select
                  name="status"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                  defaultValue="blocker"
                >
                  {noteStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Note
                <textarea
                  name="note"
                  rows={5}
                  required
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                  placeholder="Record a launch blocker, improvement, decision or deferred item."
                />
              </label>
              <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
                Add Note
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Launch Notes</h2>
            <div className="mt-5 grid gap-3">
              {notes.length ? (
                notes.map((note) => (
                  <article key={note.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs ${noteClass(note.status)}`}>
                        {note.status ?? "open"}
                      </span>
                      <p className="text-xs text-zinc-600">{formatDate(note.created_at)}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">{note.note}</p>
                    <p className="mt-3 text-xs text-zinc-600">
                      {note.created_by ?? "admin"}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No launch notes yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
