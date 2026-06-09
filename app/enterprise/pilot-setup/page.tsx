import Link from "next/link";
import { redirect } from "next/navigation";
import { pilotModeNotice, pilotWorkspaceSlug, PILOT_MODE } from "@/lib/pilot-mode";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function createPilotWorkspace(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/enterprise/pilot-setup");

  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const reviewerEmails = String(formData.get("reviewer_emails") ?? "").trim();
  const caseTitle = String(formData.get("case_title") ?? "").trim();
  const caseDescription = String(formData.get("case_description") ?? "").trim();

  if (!organizationName || !caseTitle) {
    redirect("/enterprise/pilot-setup?error=missing_fields");
  }

  const slug = pilotWorkspaceSlug(organizationName);
  const { data: workspace } = await supabase
    .from("trust_workspaces")
    .insert({
      name: `${organizationName} Pilot Workspace`,
      slug,
      description:
        "Pilot Mode workspace for isolated design-partner onboarding, trust cases, governance review and operational learning.",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (!workspace?.id) {
    redirect("/enterprise/pilot-setup?error=create_failed");
  }

  await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "admin",
  });

  const { data: trustCase } = await supabase
    .from("trust_cases")
    .insert({
      workspace_id: workspace.id,
      title: caseTitle,
      description:
        caseDescription ||
        "First pilot trust case created during design-partner onboarding.",
      status: "open",
      priority: "medium",
      created_by: user.id,
    })
    .select("id")
    .single();

  await supabase.from("launch_control_notes").insert({
    note: `[Pilot Setup] ${organizationName} pilot created. Reviewers to invite: ${reviewerEmails || "not provided"}. First case: ${trustCase?.id ?? "not recorded"}.`,
    status: "decision",
    created_by: user.email ?? user.id,
  });

  await supabase.from("audit_logs").insert({
    event_type: "pilot_workspace_created",
    actor: user.email ?? user.id,
    metadata: {
      pilot: true,
      organization_name: organizationName,
      workspace_id: workspace.id,
      trust_case_id: trustCase?.id ?? null,
      reviewer_emails: reviewerEmails
        .split(/[,\n]/)
        .map((email) => email.trim())
        .filter(Boolean),
      operational_context:
        "Pilot setup created an isolated workspace and first trust case for design-partner onboarding.",
    },
    created_at: new Date().toISOString(),
  });

  redirect(`/workspace/${workspace.id}`);
}

export default async function PilotSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/enterprise/pilot-setup");

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Design Partner Setup
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Create the first meaningful workflow in under 10 minutes.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Set up an isolated pilot workspace, invite reviewer contacts,
            create the first trust case, then continue into evidence upload and
            governance review.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            {PILOT_MODE ? pilotModeNotice : "Pilot Mode is currently disabled."}
          </p>
        </section>

        {query.error ? (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
            Pilot setup could not be completed. Organization name and first
            case title are required.
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <form action={createPilotWorkspace} className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Pilot Workspace</h2>
            <div className="mt-5 grid gap-4">
              <input
                name="organization_name"
                required
                placeholder="Organization name"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
              <textarea
                name="reviewer_emails"
                placeholder="Reviewer emails, comma or line separated"
                className="min-h-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
              <input
                name="case_title"
                required
                placeholder="First trust case title"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
              <textarea
                name="case_description"
                placeholder="Operational context for the first case"
                className="min-h-28 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
              <button className="w-fit rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
                Create Pilot Workspace
              </button>
            </div>
          </form>

          <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">10 Minute Path</h2>
            <div className="mt-5 grid gap-3 text-sm text-zinc-400">
              {[
                "Create isolated workspace",
                "Record reviewer invite list",
                "Create first trust case",
                "Upload evidence",
                "Open governance queue",
                "Review timeline, replay and receipt",
              ].map((item, index) => (
                <div key={item} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/evidence-upload" className="text-sm text-cyan-200 underline">
                Evidence upload
              </Link>
              <Link href="/governance" className="text-sm text-cyan-200 underline">
                Governance queue
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
