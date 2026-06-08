export type AnyTrustRow = Record<string, any>;

export type TrustRelationshipView = {
  id: string;
  source_type: string;
  source_id: string | null;
  relationship_type: string;
  target_type: string;
  target_id: string | null;
  confidence_level: string;
  explanation: string;
  created_at: string | null;
  created_by: string;
  trigger: string;
  source_label: string;
  target_label: string;
  origin: "stored" | "derived";
};

const relationshipLabels: Record<string, string> = {
  submitted_evidence: "Submitted evidence",
  reviewed_by: "Reviewed by",
  linked_to: "Linked to",
  generated_signal: "Generated signal",
  owned_by: "Owned by",
  verified_by: "Verified by",
  escalated_to: "Escalated to",
  connected_activity: "Connected activity",
};

export function relationshipLabel(type: string | null | undefined) {
  return relationshipLabels[String(type ?? "linked_to")] ?? String(type ?? "linked_to").replaceAll("_", " ");
}

function value(input: unknown, fallback: string) {
  return input === null || input === undefined || input === "" ? fallback : String(input);
}

function asDate(input: unknown) {
  return input ? String(input) : null;
}

function metadata(row: AnyTrustRow | null | undefined) {
  const raw = row?.metadata;
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function relationshipId(prefix: string, sourceId: unknown, targetId: unknown) {
  return `${prefix}:${value(sourceId, "source")}:${value(targetId, "target")}`;
}

function uniqueRelationships(items: TrustRelationshipView[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.source_type,
      item.source_id,
      item.relationship_type,
      item.target_type,
      item.target_id,
      item.origin,
    ].join(":");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeStoredRelationship(row: AnyTrustRow): TrustRelationshipView {
  return {
    id: value(row.id, relationshipId("stored", row.source_id, row.target_id)),
    source_type: value(row.source_type, "record"),
    source_id: row.source_id ? String(row.source_id) : null,
    relationship_type: value(row.relationship_type, "linked_to"),
    target_type: value(row.target_type, "record"),
    target_id: row.target_id ? String(row.target_id) : null,
    confidence_level: value(row.confidence_level, "medium"),
    explanation: value(row.explanation, "Relationship recorded in the trust relationship registry."),
    created_at: asDate(row.created_at),
    created_by: "Relationship registry",
    trigger: `${value(row.source_type, "source")} ${relationshipLabel(row.relationship_type)} ${value(row.target_type, "target")}`,
    source_label: `${value(row.source_type, "source")} ${row.source_id ? String(row.source_id).slice(0, 8) : ""}`.trim(),
    target_label: `${value(row.target_type, "target")} ${row.target_id ? String(row.target_id).slice(0, 8) : ""}`.trim(),
    origin: "stored",
  };
}

function derivedRelationship(input: Omit<TrustRelationshipView, "origin">): TrustRelationshipView {
  return { ...input, origin: "derived" };
}

export function buildPassportRelationships(input: {
  passport: AnyTrustRow;
  verificationCases?: AnyTrustRow[] | null;
  evidence?: AnyTrustRow[] | null;
  decisions?: AnyTrustRow[] | null;
  signals?: AnyTrustRow[] | null;
  auditLogs?: AnyTrustRow[] | null;
  trustRuns?: AnyTrustRow[] | null;
  storedRelationships?: AnyTrustRow[] | null;
}) {
  const passport = input.passport;
  const passportId = String(passport.id);
  const subjectLabel = value(passport.subject_name, "Trust passport");
  const relationships = (input.storedRelationships ?? []).map(normalizeStoredRelationship);

  for (const item of input.evidence ?? []) {
    relationships.push(derivedRelationship({
      id: relationshipId("passport-evidence", passportId, item.id),
      source_type: "passport",
      source_id: passportId,
      relationship_type: "submitted_evidence",
      target_type: "evidence",
      target_id: item.id ? String(item.id) : null,
      confidence_level: "high",
      explanation: "Evidence is connected because it references this passport or one of its verification cases.",
      created_at: asDate(item.created_at),
      created_by: value(item.uploaded_by ?? item.owner_email ?? passport.user_email, "authenticated user"),
      trigger: "Evidence file upload or verification case evidence linkage",
      source_label: subjectLabel,
      target_label: value(item.file_name ?? item.file_url ?? item.evidence_type, "Evidence file"),
    }));
  }

  for (const item of input.verificationCases ?? []) {
    relationships.push(derivedRelationship({
      id: relationshipId("passport-case", passportId, item.id),
      source_type: "passport",
      source_id: passportId,
      relationship_type: "verified_by",
      target_type: "verification_case",
      target_id: item.id ? String(item.id) : null,
      confidence_level: "high",
      explanation: "Verification case is connected because it directly references this passport.",
      created_at: asDate(item.created_at),
      created_by: value(item.created_by ?? item.owner_email ?? passport.user_email, "verification workflow"),
      trigger: "Verification case creation",
      source_label: subjectLabel,
      target_label: value(item.subject_name ?? item.status, "Verification case"),
    }));
  }

  for (const item of input.decisions ?? []) {
    relationships.push(derivedRelationship({
      id: relationshipId("passport-decision", passportId, item.id),
      source_type: "passport",
      source_id: passportId,
      relationship_type: "reviewed_by",
      target_type: "decision",
      target_id: item.id ? String(item.id) : null,
      confidence_level: "high",
      explanation: "Decision is connected because it references this passport or one of its verification cases.",
      created_at: asDate(item.created_at),
      created_by: value(item.actor ?? item.decided_by, "human reviewer"),
      trigger: value(item.decision, "Admin decision recorded"),
      source_label: subjectLabel,
      target_label: value(item.decision, "Decision"),
    }));
  }

  for (const item of input.signals ?? []) {
    const meta = metadata(item);
    relationships.push(derivedRelationship({
      id: relationshipId("passport-signal", passportId, item.id),
      source_type: "signal",
      source_id: item.id ? String(item.id) : null,
      relationship_type: "generated_signal",
      target_type: "passport",
      target_id: passportId,
      confidence_level: value(item.risk_level, "medium"),
      explanation: "Signal is related because its metadata, case reference, or event text points to this passport workflow.",
      created_at: asDate(item.created_at),
      created_by: value(meta.actor ?? item.owner_email, "system signal pipeline"),
      trigger: value(item.event, "Operational signal emitted"),
      source_label: value(item.event, "Signal"),
      target_label: subjectLabel,
    }));
  }

  for (const item of input.auditLogs ?? []) {
    const meta = metadata(item);
    relationships.push(derivedRelationship({
      id: relationshipId("passport-audit", passportId, item.id),
      source_type: "passport",
      source_id: passportId,
      relationship_type: "linked_to",
      target_type: "audit_log",
      target_id: item.id ? String(item.id) : null,
      confidence_level: "high",
      explanation: "Audit event is connected because its metadata references this passport or one of its verification cases.",
      created_at: asDate(item.created_at),
      created_by: value(item.actor ?? meta.actor, "audit logger"),
      trigger: value(item.event_type, "Audit event recorded"),
      source_label: subjectLabel,
      target_label: value(item.event_type, "Audit event"),
    }));
  }

  for (const item of input.trustRuns ?? []) {
    relationships.push(derivedRelationship({
      id: relationshipId("passport-trust-run", passportId, item.id),
      source_type: "passport",
      source_id: passportId,
      relationship_type: "connected_activity",
      target_type: "trust_algorithm_run",
      target_id: item.id ? String(item.id) : null,
      confidence_level: value(item.confidence_level, "medium"),
      explanation: "Trust algorithm run is linked because it evaluated this passport using deterministic operational evidence.",
      created_at: asDate(item.created_at),
      created_by: "Trust Algorithm V1",
      trigger: "Recalculate Trust Score",
      source_label: subjectLabel,
      target_label: value(item.confidence_level, "Trust algorithm run"),
    }));
  }

  return uniqueRelationships(relationships).slice(0, 48);
}

export function buildAgentRelationships(input: {
  agent: AnyTrustRow;
  events?: AnyTrustRow[] | null;
  permissions?: AnyTrustRow[] | null;
  trustRuns?: AnyTrustRow[] | null;
  storedRelationships?: AnyTrustRow[] | null;
}) {
  const agent = input.agent;
  const agentId = String(agent.id);
  const agentLabel = value(agent.name, "AI agent");
  const agentMeta = metadata(agent);
  const relationships = (input.storedRelationships ?? []).map(normalizeStoredRelationship);

  if (agent.owner_user_id || agent.owner_email) {
    relationships.push(derivedRelationship({
      id: relationshipId("agent-owner", agentId, agent.owner_user_id ?? agent.owner_email),
      source_type: "agent",
      source_id: agentId,
      relationship_type: "owned_by",
      target_type: "user",
      target_id: agent.owner_user_id ? String(agent.owner_user_id) : null,
      confidence_level: "high",
      explanation: "Owner relationship exists because the agent record declares an owner user or owner email.",
      created_at: asDate(agent.created_at),
      created_by: value(agent.owner_email, "registered owner"),
      trigger: "Agent registration",
      source_label: agentLabel,
      target_label: value(agent.owner_email ?? agent.owner_user_id, "Owner"),
    }));
  }

  if (agentMeta.enterprise_id || agentMeta.organization_id || agentMeta.organization_name || agentMeta.team_id) {
    relationships.push(derivedRelationship({
      id: relationshipId(
        "agent-organization",
        agentId,
        agentMeta.enterprise_id ?? agentMeta.organization_id ?? agentMeta.organization_name ?? agentMeta.team_id
      ),
      source_type: "agent",
      source_id: agentId,
      relationship_type: "owned_by",
      target_type: "enterprise",
      target_id:
        agentMeta.enterprise_id || agentMeta.organization_id
          ? String(agentMeta.enterprise_id ?? agentMeta.organization_id)
          : null,
      confidence_level: "medium",
      explanation: "Organization relationship exists because the agent metadata links it to an enterprise, organization or team context.",
      created_at: asDate(agent.created_at),
      created_by: value(agent.owner_email, "agent registration workflow"),
      trigger: "Agent organization metadata recorded",
      source_label: agentLabel,
      target_label: value(
        agentMeta.organization_name ?? agentMeta.enterprise_id ?? agentMeta.organization_id ?? agentMeta.team_id,
        "Enterprise"
      ),
    }));
  }

  for (const event of input.events ?? []) {
    relationships.push(derivedRelationship({
      id: relationshipId("agent-event", agentId, event.id),
      source_type: "agent",
      source_id: agentId,
      relationship_type: "connected_activity",
      target_type: "trust_event",
      target_id: event.id ? String(event.id) : null,
      confidence_level: value(event.risk_level, "medium"),
      explanation: "Activity relationship exists because the trust event was recorded against this agent.",
      created_at: asDate(event.created_at),
      created_by: value(event.actor_label ?? event.actor_type, "trust event pipeline"),
      trigger: value(event.event_type, "Agent activity event"),
      source_label: agentLabel,
      target_label: value(event.event_type, "Trust event"),
    }));
  }

  for (const permission of input.permissions ?? []) {
    relationships.push(derivedRelationship({
      id: relationshipId("agent-permission", agentId, permission.id),
      source_type: "agent",
      source_id: agentId,
      relationship_type: "linked_to",
      target_type: "permission",
      target_id: permission.id ? String(permission.id) : null,
      confidence_level: value(permission.risk_level, "medium"),
      explanation: "Permission relationship exists because the permission record is assigned to this agent.",
      created_at: asDate(permission.created_at),
      created_by: value(permission.created_by, "governance operator"),
      trigger: value(permission.permission_name, "Permission assigned"),
      source_label: agentLabel,
      target_label: value(permission.permission_name, "Permission"),
    }));
  }

  for (const item of input.trustRuns ?? []) {
    relationships.push(derivedRelationship({
      id: relationshipId("agent-trust-run", agentId, item.id),
      source_type: "agent",
      source_id: agentId,
      relationship_type: "connected_activity",
      target_type: "trust_algorithm_run",
      target_id: item.id ? String(item.id) : null,
      confidence_level: value(item.confidence_level, "medium"),
      explanation: "Trust algorithm run is linked because it evaluated this agent using deterministic operational evidence.",
      created_at: asDate(item.created_at),
      created_by: "Trust Algorithm V1",
      trigger: "Recalculate Trust Score",
      source_label: agentLabel,
      target_label: value(item.confidence_level, "Trust algorithm run"),
    }));
  }

  return uniqueRelationships(relationships).slice(0, 48);
}
