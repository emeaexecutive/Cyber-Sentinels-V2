export type AuthorityPrincipalType = "organization" | "human" | "ai_agent" | "machine_identity";

export type AuthorityConstraints = {
  workflowIds?: string[];
  actions?: string[];
  purposes?: string[];
};

export type AuthorityGrant = {
  id: string;
  tenantId: string;
  grantorId: string;
  grantorType: AuthorityPrincipalType;
  granteeId: string;
  granteeType: AuthorityPrincipalType;
  scope: string[];
  constraints?: AuthorityConstraints;
  parentGrantId?: string | null;
  maxDelegationDepth: number;
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  evidenceRefs?: string[];
};

export type AuthorityGraphRequest = {
  tenantId: string;
  subjectId: string;
  workflowId: string;
  action: string;
  purpose: string;
  requestedScope?: string[];
  grants: AuthorityGrant[];
  evaluatedAt?: string;
};

export type AuthorityGraphResult = {
  decision: "ALLOW" | "DENY";
  valid: boolean;
  reason: string;
  chain: AuthorityGrant[];
  effectiveScope: string[];
  effectiveConstraints: {
    workflowIds: string[] | null;
    actions: string[] | null;
    purposes: string[] | null;
  };
  accountableHumanId: string | null;
  authorityReference: string | null;
  evidenceRefs: string[];
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  limitations: string[];
};

const allowedDelegations = new Set([
  "organization->human",
  "organization->ai_agent",
  "human->ai_agent",
  "human->machine_identity",
  "ai_agent->ai_agent",
]);

function unique(values: string[] = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function subset(child: string[], parent: string[]) {
  const allowed = new Set(parent);
  return child.every((item) => allowed.has(item));
}

function intersect(values: Array<string[] | undefined>) {
  const defined = values.filter((value): value is string[] => Array.isArray(value));
  if (!defined.length) return null;
  return unique(defined.reduce((current, next) => current.filter((item) => next.includes(item))));
}

function activeAt(grant: AuthorityGrant, evaluatedAt: number) {
  const issuedAt = Date.parse(grant.issuedAt);
  const expiresAt = grant.expiresAt ? Date.parse(grant.expiresAt) : null;
  const revokedAt = grant.revokedAt ? Date.parse(grant.revokedAt) : null;
  return Number.isFinite(issuedAt)
    && issuedAt <= evaluatedAt
    && (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > evaluatedAt))
    && (revokedAt === null || (Number.isFinite(revokedAt) && revokedAt > evaluatedAt));
}

function buildChain(terminal: AuthorityGrant, grants: Map<string, AuthorityGrant>) {
  const reversed: AuthorityGrant[] = [];
  const visited = new Set<string>();
  let current: AuthorityGrant | undefined = terminal;
  while (current) {
    if (visited.has(current.id)) return { chain: [] as AuthorityGrant[], error: "Authority chain contains a cycle." };
    visited.add(current.id);
    reversed.push(current);
    if (!current.parentGrantId) break;
    const parent: AuthorityGrant | undefined = grants.get(current.parentGrantId);
    if (!parent) return { chain: [] as AuthorityGrant[], error: `Parent grant ${current.parentGrantId} is missing.` };
    current = parent;
  }
  return { chain: reversed.reverse(), error: null };
}

function validateChain(chain: AuthorityGrant[], request: AuthorityGraphRequest, evaluatedAt: number) {
  const checks: AuthorityGraphResult["checks"] = [];
  const add = (name: string, passed: boolean, detail: string) => checks.push({ name, passed, detail });

  add("tenant isolation", chain.every((grant) => grant.tenantId === request.tenantId), "Every grant must belong to the requesting tenant.");
  add("supported delegation", chain.every((grant) => allowedDelegations.has(`${grant.grantorType}->${grant.granteeType}`)), "Only declared organization, human, agent and machine delegation paths are accepted.");
  add("active grants", chain.every((grant) => activeAt(grant, evaluatedAt)), "Expired, revoked, future-dated or malformed grants fail closed.");
  add("chain linkage", chain.every((grant, index) => index === 0 || (grant.grantorId === chain[index - 1].granteeId && grant.parentGrantId === chain[index - 1].id)), "Every delegated grant must continue from its parent grantee.");
  add("scope inheritance", chain.every((grant, index) => index === 0 || subset(grant.scope, chain[index - 1].scope)), "A child grant cannot exceed its parent scope.");
  add("maximum delegation depth", chain.every((grant, index) => chain.length - index - 1 <= Math.max(0, grant.maxDelegationDepth)), "Every ancestor's delegation-depth ceiling is enforced.");

  const constraintInheritance = chain.every((grant, index) => {
    if (index === 0) return true;
    const parent = chain[index - 1].constraints;
    const child = grant.constraints;
    return (["workflowIds", "actions", "purposes"] as const).every((key) => {
      if (!parent?.[key] || !child?.[key]) return true;
      return subset(child[key] ?? [], parent[key] ?? []);
    });
  });
  add("constraint inheritance", constraintInheritance, "A child grant may narrow, but never broaden, workflow, action or purpose constraints.");

  const effectiveScope = intersect(chain.map((grant) => grant.scope)) ?? [];
  const effectiveConstraints = {
    workflowIds: intersect(chain.map((grant) => grant.constraints?.workflowIds)),
    actions: intersect(chain.map((grant) => grant.constraints?.actions)),
    purposes: intersect(chain.map((grant) => grant.constraints?.purposes)),
  };
  const requestedScope = unique([...(request.requestedScope ?? []), request.action]);
  add("requested scope", subset(requestedScope, effectiveScope), "The requested action and scope must be present throughout the chain.");
  add("workflow constraint", effectiveConstraints.workflowIds === null || effectiveConstraints.workflowIds.includes(request.workflowId), `Workflow ${request.workflowId} must be allowed.`);
  add("action constraint", effectiveConstraints.actions === null || effectiveConstraints.actions.includes(request.action), `Action ${request.action} must be allowed.`);
  add("purpose constraint", effectiveConstraints.purposes === null || effectiveConstraints.purposes.includes(request.purpose), `Purpose ${request.purpose} must be allowed.`);

  return { checks, effectiveScope, effectiveConstraints };
}

export function evaluateAuthorityGraph(request: AuthorityGraphRequest): AuthorityGraphResult {
  const evaluatedAt = Date.parse(request.evaluatedAt ?? new Date().toISOString());
  const grants = new Map(request.grants.map((grant) => [grant.id, { ...grant, scope: unique(grant.scope) }]));
  const terminals = [...grants.values()].filter((grant) => grant.tenantId === request.tenantId && grant.granteeId === request.subjectId);
  const failures: AuthorityGraphResult["checks"] = [];

  for (const terminal of terminals) {
    const built = buildChain(terminal, grants);
    if (built.error) {
      failures.push({ name: "chain continuity", passed: false, detail: built.error });
      continue;
    }
    const validation = validateChain(built.chain, request, evaluatedAt);
    if (validation.checks.every((check) => check.passed)) {
      const accountableHuman = [...built.chain].reverse().find((grant) => grant.grantorType === "human")?.grantorId
        ?? built.chain.find((grant) => grant.granteeType === "human")?.granteeId
        ?? null;
      return {
        decision: "ALLOW",
        valid: true,
        reason: "The authority chain is active, tenant-isolated and inside inherited scope, constraints and delegation depth.",
        chain: built.chain,
        effectiveScope: validation.effectiveScope,
        effectiveConstraints: validation.effectiveConstraints,
        accountableHumanId: accountableHuman,
        authorityReference: terminal.id,
        evidenceRefs: unique(built.chain.flatMap((grant) => grant.evidenceRefs ?? [])),
        checks: validation.checks,
        limitations: ["Authority is valid only for the evaluated tenant, workflow, action, purpose and time."],
      };
    }
    failures.push(...validation.checks.filter((check) => !check.passed));
  }

  return {
    decision: "DENY",
    valid: false,
    reason: terminals.length ? "No authority chain satisfied every fail-closed check." : "No authority grant reaches the requested subject.",
    chain: [],
    effectiveScope: [],
    effectiveConstraints: { workflowIds: null, actions: null, purposes: null },
    accountableHumanId: null,
    authorityReference: null,
    evidenceRefs: [],
    checks: failures.length ? failures : [{ name: "authority present", passed: false, detail: "No matching terminal grant was found." }],
    limitations: ["Denied authority is retained for review; it is never promoted through fallback inheritance."],
  };
}
