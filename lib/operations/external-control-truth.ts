export const operationalEvidenceStates = [
  "VERIFIED_FROM_RUNTIME",
  "VERIFIED_FROM_REPOSITORY",
  "BLOCKED_BY_EXTERNAL_CONFIGURATION",
  "NOT_CONFIGURED",
] as const;

export type OperationalEvidenceState = (typeof operationalEvidenceStates)[number];

export type ExternalControlTruth = {
  id: string;
  label: string;
  state: OperationalEvidenceState;
  reasonCode: string;
  evidence: string[];
};

export function classifyOperationalEvidence(input: {
  configured?: boolean;
  repositoryEvidence?: string[];
  runtimeEvidence?: string[];
  requiresExternalEvidence?: boolean;
}): { state: OperationalEvidenceState; evidence: string[] } {
  const runtimeEvidence = input.runtimeEvidence?.filter(Boolean) ?? [];
  const repositoryEvidence = input.repositoryEvidence?.filter(Boolean) ?? [];
  if (runtimeEvidence.length) return { state: "VERIFIED_FROM_RUNTIME", evidence: runtimeEvidence };
  if (input.requiresExternalEvidence) return { state: "BLOCKED_BY_EXTERNAL_CONFIGURATION", evidence: [] };
  if (repositoryEvidence.length) return { state: "VERIFIED_FROM_REPOSITORY", evidence: repositoryEvidence };
  if (input.configured === false) return { state: "NOT_CONFIGURED", evidence: [] };
  return { state: "BLOCKED_BY_EXTERNAL_CONFIGURATION", evidence: [] };
}

export function externalControlTruth(runtimeEvidence: Partial<Record<string, string[]>> = {}): ExternalControlTruth[] {
  return [
    ["vercel-production-branch", "Vercel Production Branch policy", "VERCEL_PRODUCTION_BRANCH_UNVERIFIED"],
    ["vercel-environment", "Vercel Production environment completeness", "VERCEL_ENVIRONMENT_UNVERIFIED"],
    ["cloudflare-waf", "Cloudflare WAF", "CLOUDFLARE_WAF_UNVERIFIED"],
    ["cloudflare-dnssec", "Cloudflare DNSSEC", "CLOUDFLARE_DNSSEC_UNVERIFIED"],
    ["cloudflare-bot-controls", "Cloudflare bot controls and durable rate limiting", "CLOUDFLARE_BOT_CONTROLS_UNVERIFIED"],
    ["supabase-migrations", "Supabase deployed migration state", "SUPABASE_MIGRATIONS_UNVERIFIED"],
    ["supabase-production-rls", "Supabase Production RLS state", "SUPABASE_PRODUCTION_RLS_UNVERIFIED"],
  ].map(([id, label, reasonCode]) => {
    const truth = classifyOperationalEvidence({ runtimeEvidence: runtimeEvidence[id], requiresExternalEvidence: true });
    return { id, label, state: truth.state, reasonCode, evidence: truth.evidence };
  });
}
