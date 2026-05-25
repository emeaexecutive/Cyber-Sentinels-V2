export const readinessStates = ["ready", "partial", "missing", "blocked"] as const;

export const readinessCategories = [
  "Auth",
  "Admin Security",
  "Database",
  "Trust Passports",
  "Human Presence",
  "Origin Trace",
  "Evidence Vault",
  "Decision Engine",
  "Policy Engine",
  "Permissions Firewall",
  "Step-Up Verification",
  "Revocation / Recovery",
  "Trust Radar",
  "Trust Timeline",
  "Trust Graph",
  "Trust API",
  "Billing / Clearances",
  "Client Portal",
  "Team Workspace",
  "Public Verification",
] as const;

export type ReadinessState = (typeof readinessStates)[number];
export type ReadinessCategory = (typeof readinessCategories)[number];

export type ReadinessModule = {
  category: ReadinessCategory;
  state: ReadinessState;
  notes: string;
  href: string;
};

export type ChecklistItem = {
  label: string;
  state: ReadinessState;
};

export type LaunchReadinessSnapshot = {
  score: number;
  status: "ready_for_private_beta" | "partial_readiness" | "blocked";
  modules: ReadinessModule[];
  privateBetaChecklist: ChecklistItem[];
  securityChecklist: ChecklistItem[];
  supabaseChecklist: ChecklistItem[];
  vercelChecklist: ChecklistItem[];
  betaLaunchChecklist: ChecklistItem[];
};

const moduleWeights: Record<ReadinessState, number> = {
  ready: 1,
  partial: 0.6,
  missing: 0.2,
  blocked: 0,
};

export const demoReadinessModules: ReadinessModule[] = [
  { category: "Auth", state: "ready", notes: "Supabase auth routes and protected pages are wired.", href: "/login" },
  { category: "Admin Security", state: "ready", notes: "Admin allowlist and step-up access flow are present.", href: "/admin" },
  { category: "Database", state: "partial", notes: "Core tables are expected; demo fallbacks remain for V1 surfaces.", href: "/admin" },
  { category: "Trust Passports", state: "ready", notes: "Passport creation and public-safe summaries are available.", href: "/passport" },
  { category: "Human Presence", state: "ready", notes: "HPI and Human Presence Genome surfaces are present.", href: "/human-presence-index" },
  { category: "Origin Trace", state: "ready", notes: "Origin Trace, Origin DNA and Reality Chain are present.", href: "/origin-trace" },
  { category: "Evidence Vault", state: "partial", notes: "Evidence workflows exist; production storage hardening remains.", href: "/evidence-vault" },
  { category: "Decision Engine", state: "ready", notes: "Decision Engine placeholder and APIs are available.", href: "/decision-engine" },
  { category: "Policy Engine", state: "ready", notes: "Policy evaluation surface is present.", href: "/policy-engine" },
  { category: "Permissions Firewall", state: "ready", notes: "Permission decisions and step-up escalation are wired.", href: "/permissions-firewall" },
  { category: "Step-Up Verification", state: "ready", notes: "Step-up flow is available for high-risk actions.", href: "/step-up-verification" },
  { category: "Revocation / Recovery", state: "ready", notes: "Revocation and recovery surfaces are available.", href: "/revocation-engine" },
  { category: "Trust Radar", state: "ready", notes: "Live trust radar uses demo and signal data.", href: "/trust-radar" },
  { category: "Trust Timeline", state: "ready", notes: "Timeline and ledger memory surfaces are available.", href: "/trust-timeline" },
  { category: "Trust Graph", state: "ready", notes: "Trust Graph and Trust Fabric connections are present.", href: "/trust-graph" },
  { category: "Trust API", state: "ready", notes: "Public verification, registry, embed, seal and trust APIs exist.", href: "/api-docs" },
  { category: "Billing / Clearances", state: "partial", notes: "Billing placeholders exist before Stripe checkout production wiring.", href: "/billing" },
  { category: "Client Portal", state: "ready", notes: "Client workspace is available with demo fallbacks.", href: "/client-portal" },
  { category: "Team Workspace", state: "ready", notes: "Team workspace and team access surfaces are present.", href: "/team-workspace" },
  { category: "Public Verification", state: "ready", notes: "Verify, profiles, badges, embeds, seals and registry are live.", href: "/verify" },
];

export const demoLaunchChecklist: ChecklistItem[] = [
  { label: "Auth", state: "ready" },
  { label: "Supabase env vars", state: "partial" },
  { label: "Admin security", state: "ready" },
  { label: "Database tables", state: "partial" },
  { label: "Signals loop", state: "partial" },
  { label: "Audit loop", state: "partial" },
  { label: "Passport workflow", state: "ready" },
  { label: "Hiring Shield workflow", state: "ready" },
  { label: "Verification queue", state: "ready" },
  { label: "Public verification", state: "ready" },
  { label: "Billing placeholders", state: "ready" },
  { label: "Vercel deployment", state: "partial" },
  { label: "Environment variables set", state: "partial" },
  { label: "Supabase tables created", state: "partial" },
  { label: "Auth working", state: "ready" },
  { label: "Admin protected", state: "ready" },
  { label: "Signals writing", state: "partial" },
  { label: "Audit logs writing", state: "partial" },
  { label: "Passport creation working", state: "ready" },
  { label: "Trust reports working", state: "ready" },
  { label: "Public verify routes live", state: "ready" },
  { label: "Billing placeholders ready", state: "ready" },
  { label: "GitHub Pages disabled", state: "partial" },
  { label: "Vercel deployment healthy", state: "partial" },
];

function scoreModules(modules: ReadinessModule[]) {
  return Math.round(
    (modules.reduce((sum, item) => sum + moduleWeights[item.state], 0) /
      modules.length) *
      100
  );
}

function statusFromScore(score: number, modules: ReadinessModule[]) {
  if (modules.some((module) => module.state === "blocked")) return "blocked";
  if (score >= 85) return "ready_for_private_beta";

  return "partial_readiness";
}

export function createLaunchReadinessSnapshot(
  modules: ReadinessModule[] = demoReadinessModules
): LaunchReadinessSnapshot {
  const score = scoreModules(modules);

  return {
    score,
    status: statusFromScore(score, modules),
    modules,
    privateBetaChecklist: demoLaunchChecklist.slice(0, 12),
    securityChecklist: demoLaunchChecklist.filter((item) =>
      /Auth|Admin|Environment|GitHub|Vercel/i.test(item.label)
    ),
    supabaseChecklist: demoLaunchChecklist.filter((item) =>
      /Supabase|Signals|Audit|Passport|Trust reports/i.test(item.label)
    ),
    vercelChecklist: demoLaunchChecklist.filter((item) =>
      /Environment|Public verify|GitHub|Vercel/i.test(item.label)
    ),
    betaLaunchChecklist: demoLaunchChecklist,
  };
}

export const demoLaunchReadiness = createLaunchReadinessSnapshot();
