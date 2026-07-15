import Link from "next/link";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/communications/createNotification";
import {
  buildPilotActivationMetadata,
  buildPilotWorkspaceDescription,
  normalizePilotOrganizationState,
  pilotGovernanceTemplates,
  pilotModeNotice,
  pilotOrganizationStates,
  pilotVerificationCategories,
  pilotWorkspaceSlug,
  PILOT_MODE,
} from "@/lib/pilot-mode";
import { createClient } from "@/lib/supabase/server";
import {
  getOperationalPilotTemplate,
  operationalPilotTemplates,
} from "@/lib/pilot-templates";
import { enterprisePolicyTemplates } from "@/lib/policy-engine";
import { buildProviderReadinessChecklist, summarizeProviderReadiness } from "@/lib/providers/provider-readiness";

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
  const pilotState = normalizePilotOrganizationState(formData.get("pilot_state"));
  const pilotTemplate = getOperationalPilotTemplate(formData.get("pilot_template"));
  const caseTitle = String(formData.get("case_title") ?? "").trim();
  const caseDescription = String(formData.get("case_description") ?? "").trim();
  const identityProvider = String(formData.get("identity_provider") ?? "supabase").trim();
  const providerConfiguration = String(formData.get("provider_configuration") ?? "awaiting_credentials").trim();
  const policyTemplateId = String(formData.get("policy_template") ?? "general-enterprise").trim();
  const adminConfirmed = formData.get("admin_confirmed") === "on";
  const policyTemplate = enterprisePolicyTemplates.find((template) => template.id === policyTemplateId);
  const reviewerEmailList = reviewerEmails
    .split(/[,\n]/)
    .map((email) => email.trim())
    .filter(Boolean);

  if (!organizationName || !caseTitle || !adminConfirmed || !policyTemplate) {
    redirect("/enterprise/pilot-setup?error=missing_fields");
  }

  const slug = pilotWorkspaceSlug(organizationName);
  const { data: workspace } = await supabase
    .from("trust_workspaces")
    .insert({
      name: `${organizationName} Pilot Workspace`,
      slug,
      description: buildPilotWorkspaceDescription({
        state: pilotState,
        organizationName,
      }),
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
        pilotTemplate.purpose,
      status: "open",
      priority: "medium",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (trustCase?.id) {
    const pilotMetadata = buildPilotActivationMetadata({
      organizationName,
      reviewerEmails: reviewerEmailList,
      state: pilotState,
      workspaceId: workspace.id,
      trustCaseId: trustCase.id,
    });
    Object.assign(pilotMetadata, {
      pilot_template: pilotTemplate.id,
      pilot_template_name: pilotTemplate.name,
      evidence_expected: pilotTemplate.evidenceExpected,
      workflow_path: {
        start: pilotTemplate.workflowStart,
        trust_evolution: pilotTemplate.trustEvolution,
        replay: pilotTemplate.replayChronology,
        governance: pilotTemplate.governanceIntervention,
        outcome: pilotTemplate.finalOutcome,
      },
      enterprise_onboarding: {
        identity_provider: identityProvider,
        provider_configuration: providerConfiguration,
        policy_template: policyTemplate.id,
        policy_name: policyTemplate.name,
        admin_confirmed: adminConfirmed,
        first_verification_walkthrough: "ready",
      },
    });
    const { data: policies } = await supabase
      .from("governance_policies")
      .insert(
        [
          ...pilotGovernanceTemplates.map((template) => ({
            workspace_id: workspace.id,
            name: template.name,
            description: template.description,
            trigger_type: template.trigger_type,
            severity: template.severity,
            action_type: template.action_type,
            requires_human_review: true,
          })),
          {
            workspace_id: workspace.id,
            name: `${policyTemplate.name} Trust Policy`,
            description: `${policyTemplate.purpose} Escalation threshold ${policyTemplate.trustThresholds.escalationThreshold}; provider minimum ${policyTemplate.trustThresholds.providerConfidenceMinimum}. Evidence: ${policyTemplate.evidenceRequirements.join(", ")}.`,
            trigger_type: `enterprise_policy_${policyTemplate.id.replaceAll("-", "_")}`,
            severity: policyTemplate.policy.assuranceLevel === "high" ? "high" : "medium",
            action_type: "human_review",
            requires_human_review: true,
          },
        ]
      )
      .select("id, trigger_type");
    const governancePolicyId =
      policies?.find((policy) => policy.trigger_type === "pilot_governance_pending")?.id ??
      policies?.[0]?.id ??
      null;

    await supabase.from("governance_actions").insert({
      policy_id: governancePolicyId,
      subject_type: "trust_case",
      subject_id: trustCase.id,
      action_status: "pending",
      assigned_to: user.id,
      resolution_notes:
        "Pilot onboarding governance review created for the first trust case. Upload evidence before resolving.",
      created_at: new Date().toISOString(),
    });

    await supabase.from("trust_timeline_events").insert({
      subject_type: "trust_case",
      subject_id: trustCase.id,
      event_type: "pilot_workspace_initialized",
      event_title: "Pilot workspace initialized",
      event_summary:
        `${pilotTemplate.name} pilot initialized. Workflow start, trust evolution, governance intervention, replay chronology and receipt outcome are ready for controlled onboarding.`,
      actor_type: "pilot_setup",
      actor_id: user.id,
      metadata: pilotMetadata,
      severity: pilotState === "suspended" ? "review" : "info",
    });

    await supabase.from("trust_replay_sessions").insert({
      subject_type: "trust_case",
      subject_id: trustCase.id,
      replay_summary:
        `${pilotTemplate.name} replay path: ${pilotTemplate.workflowStart} ${pilotTemplate.replayChronology} ${pilotTemplate.finalOutcome}`,
      generated_by: "pilot_setup_seed",
    });

    await createNotification(supabase, {
      userId: user.id,
      title: "Pilot onboarding checklist ready",
      body:
        "Next action: upload evidence, then complete human governance review before generating the trust receipt and replay.",
      notificationType: "pilot_onboarding_next_step",
      actor: user.email ?? user.id,
      severity: "review",
      metadata: {
        ...pilotMetadata,
        subject_type: "trust_case",
        subject_id: trustCase.id,
      },
    });
  }

  await supabase.from("launch_control_notes").insert({
    note: `[Pilot Setup] ${organizationName} pilot created with state ${pilotState}. Reviewers to invite: ${reviewerEmails || "not provided"}. First case: ${trustCase?.id ?? "not recorded"}.`,
    status: "decision",
    created_by: user.email ?? user.id,
  });

  await supabase.from("audit_logs").insert({
    event_type: "pilot_workspace_created",
    actor: user.email ?? user.id,
    metadata: {
      pilot: true,
      pilot_state: pilotState,
      organization_name: organizationName,
      workspace_id: workspace.id,
      trust_case_id: trustCase?.id ?? null,
      reviewer_emails: reviewerEmailList,
      verification_categories: [...pilotVerificationCategories],
      governance_templates: pilotGovernanceTemplates.map((template) => template.name),
      pilot_template: pilotTemplate.id,
      pilot_template_name: pilotTemplate.name,
      identity_provider: identityProvider,
      provider_configuration: providerConfiguration,
      enterprise_policy_template: policyTemplate.id,
      enterprise_policy_name: policyTemplate.name,
      admin_confirmed: adminConfirmed,
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
  const providerReadiness = summarizeProviderReadiness(buildProviderReadinessChecklist());

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
            create the first trust case, then continue into evidence upload,
            governance review, receipt generation and replay.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            {PILOT_MODE ? pilotModeNotice : "Pilot Mode is currently disabled."}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              ["Configured", providerReadiness.classifications.configured + providerReadiness.classifications.productionReady, "Credentials or reviewed paths are present; successful health remains separate."],
              ["Optional", providerReadiness.classifications.prototype, "Prototype adapters are optional for the first walkthrough."],
              ["Awaiting Credentials", providerReadiness.classifications.awaitingCredentials, "No provider call is made until credentials and controls are reviewed."],
            ].map(([label, count, copy]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-3">
                <p className="text-sm font-semibold text-zinc-100">{label}: {count}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
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
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
                Identity Provider
                <select name="identity_provider" defaultValue="supabase" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
                  <option value="supabase">Supabase Auth - Configured when environment is present</option>
                  <option value="saml">Enterprise SAML - Optional</option>
                  <option value="oidc">Enterprise OIDC - Optional</option>
                  <option value="scim">SCIM lifecycle - Awaiting Credentials</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
                Provider Configuration Status
                <select name="provider_configuration" defaultValue="awaiting_credentials" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
                  <option value="configured">Configured</option>
                  <option value="optional">Optional</option>
                  <option value="awaiting_credentials">Awaiting Credentials</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
                Trust Policy
                <select name="policy_template" defaultValue="general-enterprise" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
                  {enterprisePolicyTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
                Pilot Workflow
                <select
                  name="pilot_template"
                  defaultValue="hiring_security"
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
                >
                  {operationalPilotTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-600">
                Pilot State
                <select
                  name="pilot_state"
                  defaultValue="invited"
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
                >
                  {pilotOrganizationStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
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
              <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                <input name="admin_confirmed" type="checkbox" required className="mt-1" />
                <span>I confirm the organization, identity choice, provider state, policy and named reviewers are correct for this controlled pilot.</span>
              </label>
              <button className="w-fit rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
                Create Pilot Workspace
              </button>
            </div>
          </form>

          <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Guided Enterprise Onboarding</h2>
            <div className="mt-5 grid gap-3 text-sm text-zinc-400">
              {[
                ["Welcome", "Confirm the controlled design-partner scope and evidence boundary."],
                ["Organization setup", "Create the tenant workspace and named administrator."],
                ["Identity Provider selection", "Record Supabase Auth, SAML, OIDC or SCIM readiness."],
                ["Provider configuration status", "Preserve Configured, Optional or Awaiting Credentials without implying Live health."],
                ["Trust Policy selection", "Choose one reviewed template with thresholds, evidence and escalation ownership."],
                ["Admin confirmation", "Confirm organization, identity, providers, policy and reviewer ownership."],
                ["First verification walkthrough", "Create the first case, add evidence, review the decision and open Replay."],
              ].map(([label, item], index) => (
                <div key={item} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    Step {index + 1} / {label}
                  </p>
                  <p className="mt-2 text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/evidence-upload" className="text-sm text-cyan-200 underline">
                Evidence upload
              </Link>
              <Link href="/dashboard/governance" className="text-sm text-cyan-200 underline">
                Governance queue
              </Link>
              <Link href="/timeline" className="text-sm text-cyan-200 underline">
                Timeline
              </Link>
              <Link href="/trust-replay" className="text-sm text-cyan-200 underline">
                Replay
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
