import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  createReadinessGateSnapshot,
  type ReadinessGateState,
} from "@/lib/readiness-gate/snapshot";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReadinessNote = {
  id: string;
  note: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
};

const noteStatuses = ["blocker", "improvement", "decision", "deferred"];

async function addReadinessNote(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const user = await requireAdminPageAccess(supabase, {
    path: "/admin/readiness-gate",
    action: "add_readiness_gate_note",
  });
  const note = String(formData.get("note") ?? "").trim();
  const status = String(formData.get("status") ?? "blocker").trim();

  if (!note) return;

  await supabase.from("launch_control_notes").insert({
    note: `[Readiness Gate] ${note}`,
    status: noteStatuses.includes(status) ? status : "blocker",
    created_by: user.email ?? user.id,
  });

  revalidatePath("/admin/readiness-gate");
  revalidatePath("/admin/launch-control");
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function stateLabel(state: ReadinessGateState) {
  if (state === "ready") return "Ready";
  if (state === "blocked") return "Blocked";
  return "Caution";
}

function stateClass(state: ReadinessGateState) {
  if (state === "ready") return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  if (state === "blocked") return "border-red-800 bg-red-950/20 text-red-200";
  return "border-amber-800 bg-amber-950/20 text-amber-200";
}

function statusClass(status: string) {
  if (status === "READY FOR PRIVATE TESTING") return "border-emerald-800 text-emerald-200";
  if (status === "BLOCKED") return "border-red-800 text-red-200";
  return "border-amber-800 text-amber-200";
}

function noteClass(status: string | null) {
  if (status === "blocker") return "border-red-800 text-red-200";
  if (status === "decision") return "border-cyan-800 text-cyan-200";
  if (status === "deferred") return "border-zinc-700 text-zinc-300";
  return "border-amber-800 text-amber-200";
}

async function readReadinessNotes(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("launch_control_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ReadinessNote[]>();

  if (error) {
    console.warn("Readiness gate notes unavailable", {
      code: error.code,
    });
    return [] as ReadinessNote[];
  }

  return data ?? [];
}

export default async function AdminReadinessGatePage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/readiness-gate");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/readiness-gate" });

  const [snapshot, notes] = await Promise.all([
    createReadinessGateSnapshot(supabase),
    readReadinessNotes(supabase),
  ]);
  const checks = snapshot.sections.flatMap((section) => section.checks);
  const readyCount = checks.filter((item) => item.state === "ready").length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Final Readiness Gate</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Controlled readiness review before public testing and
                design-partner outreach. This gate verifies, stabilises and
                summarises readiness without adding new product systems.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/launch-control"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                Launch Control
              </Link>
              <Link
                href="/admin/api-tests"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
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
              {readyCount}/{checks.length} ready
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Ready</p>
              <p className="mt-2 text-2xl font-semibold">{readyCount}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Caution</p>
              <p className="mt-2 text-2xl font-semibold">{snapshot.cautions.length}</p>
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
            <h2 className="text-xl font-semibold">Add Readiness Note</h2>
            <form action={addReadinessNote} className="mt-5 grid gap-4">
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
                  placeholder="Record a final blocker, caution, decision or deferred item."
                />
              </label>
              <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
                Add Note
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Readiness Notes</h2>
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
                  No readiness notes yet. This view reuses launch control notes
                  so there is one operational record.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
