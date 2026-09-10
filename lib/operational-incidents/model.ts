import { hashCanonical, hashesEqual } from "../../src/lib/trust-core/hash.ts";

export type Row = Record<string, any>; // Database JSON is validated at the projection boundary.
export const INCIDENT_SCHEMA = "cyber-sentinels.incident-evidence.v2.0";
export const INCIDENT_KINDS = ["TRANSACTION_LINK", "EXECUTION_OBSERVATION", "OUTCOME", "DETECTION", "INTERVENTION", "CONTAINMENT", "REMEDIATION", "PURPOSE_OBSERVATION"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function invalid(message: string): never { throw Object.assign(new Error(message), { code: "INVALID_REQUEST", status: 400 }); }
export function reference(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) invalid("Invalid resource identifier.");
  return value;
}
function text(value: unknown, name: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) invalid(`Invalid ${name}.`);
  return value.trim();
}
export function validateIncidentRecord(value: unknown, opening = false): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("An object is required.");
  const body = value as Row;
  const fields = ["transaction_id", "kind", "summary", "observed_at", "evidence_object_id", "evidence_digest", "context", "observed_purpose", "outcome_layer", "outcome_status"];
  if (Object.keys(body).some(key => !fields.includes(key))) invalid("Unsupported incident field; derived trust states cannot be supplied.");
  const kind = opening ? "TRANSACTION_LINK" : body.kind;
  if (!INCIDENT_KINDS.includes(kind) || (opening && body.kind && body.kind !== kind)) invalid("Invalid chronology kind.");
  const observed = text(body.observed_at, "observed_at", 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(observed) || !Number.isFinite(Date.parse(observed)) || new Date(observed).toISOString() !== observed) invalid("An exact UTC timestamp is required.");
  const context: Row = {};
  if (body.context !== undefined) {
    if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) invalid("Invalid context.");
    const allowed = ["provider_account", "session", "api_tool", "model_service", "infrastructure", "credential_reference"];
    for (const [key, value] of Object.entries(body.context)) {
      if (!allowed.includes(key)) invalid("Unsupported context field.");
      context[key] = text(value, key, 200);
    }
  }
  const evidence = body.evidence_object_id ? reference(body.evidence_object_id) : null;
  if (!evidence && body.evidence_digest != null) invalid("An evidence digest requires its evidence reference.");
  if (kind !== "TRANSACTION_LINK" && !evidence) invalid("This chronology event requires evidence.");
  if (evidence && (typeof body.evidence_digest !== "string" || !/^[a-f0-9]{64}$/.test(body.evidence_digest))) invalid("An evidence digest is required.");
  if (kind === "OUTCOME" && (!["provider", "runtime", "destination"].includes(body.outcome_layer) || !["SUCCEEDED", "FAILED", "UNKNOWN"].includes(body.outcome_status))) invalid("Separate outcome layer and status are required.");
  if (kind !== "OUTCOME" && (body.outcome_layer !== undefined || body.outcome_status !== undefined)) invalid("Outcome fields require an outcome event.");
  if (kind !== "PURPOSE_OBSERVATION" && body.observed_purpose !== undefined) invalid("Observed purpose requires a separate purpose observation.");
  return {
    transaction_id: reference(body.transaction_id), kind, summary: text(body.summary, "summary"), observed_at: observed,
    evidence_object_id: evidence, evidence_digest: evidence ? body.evidence_digest : null, context,
    observed_purpose: kind === "PURPOSE_OBSERVATION" ? text(body.observed_purpose, "observed_purpose") : null,
    outcome_layer: kind === "OUTCOME" ? body.outcome_layer : null,
    outcome_status: kind === "OUTCOME" ? body.outcome_status : null,
  };
}

export function verifyEvidence(evidence: Row, tenant: string, subject: string, expected: string) {
  if (evidence.enterprise_id !== tenant || evidence.subject_id !== subject) throw Object.assign(new Error("Resource not found."), { code: "RESOURCE_NOT_FOUND", status: 404 });
  if (!hashesEqual(expected, String(evidence.payload_hash)) || !hashesEqual(hashCanonical(evidence.normalized_facts), expected)) throw Object.assign(new Error("Evidence digest mismatch."), { code: "EVIDENCE_DIGEST_MISMATCH", status: 400 });
}

export function verifyObservationClaims(record: Row, evidence: Row) {
  if (record.kind === "TRANSACTION_LINK") return;
  const facts = evidence.normalized_facts;
  if (facts?.evidenceType !== record.kind || new Date(evidence.observed_at).toISOString() !== record.observed_at) invalid("Evidence type and timestamp must match the observation.");
  const claims = facts.evidence;
  if (!claims || typeof claims !== "object") invalid("Structured observation evidence is required.");
  if (hashCanonical(claims.context ?? {}) !== hashCanonical(record.context)) invalid("Context must match the attributed evidence.");
  if (record.kind === "OUTCOME" && (claims.outcome_layer !== record.outcome_layer || claims.outcome_status !== record.outcome_status)) invalid("Outcome must match its evidence.");
  if (record.kind === "PURPOSE_OBSERVATION" && claims.observed_purpose !== record.observed_purpose) invalid("Observed purpose must match its evidence.");
}

export function buildIncidentPackage(input: { incident: Row; links: Row[]; transactions: Row[]; evidence: Row[]; authorities: Row[]; events: Row[]; existingOutcomes?: Row[]; generatedAt: string; id: string }) {
  const { incident, generatedAt } = input;
  const tenant = incident.enterprise_id;
  for (const row of [...input.links, ...input.transactions, ...input.evidence, ...input.authorities, ...input.events, ...(input.existingOutcomes ?? [])]) {
    if (row.enterprise_id !== tenant) throw new Error("Cross-tenant incident projection rejected.");
  }
  const txs = new Map(input.transactions.map(row => [row.transaction_id, row]));
  const evidence = new Map(input.evidence.map(row => [row.evidence_id, row]));
  const gaps: string[] = [];
  const contradictions: Row[] = [];
  const timeline = input.links.map(link => {
    if (link.incident_id !== incident.id) throw new Error("Cross-incident projection rejected.");
    const tx = txs.get(link.transaction_id);
    const source = evidence.get(link.evidence_object_id);
    const event = input.events.find(row => row.id === link.chronology_event_id && row.incident_id === incident.id);
    const { content_digest: supplied, ...content } = link.details;
    let integrity = Boolean(event && tx && content.id === link.id && content.transaction_id === link.transaction_id
      && content.kind === link.relation_type && content.evidence_object_id === link.evidence_object_id
      && hashesEqual(hashCanonical(content), String(supplied)) && supplied === link.content_digest);
    if (source && tx) {
      try { verifyEvidence(source, tenant, tx.subject_id, link.details.evidence_digest); verifyObservationClaims(link.details, source); }
      catch { integrity = false; gaps.push(`EVIDENCE_INTEGRITY:${link.id}`); }
      if (source.revoked_at || (source.retention_expires_at && Date.parse(source.retention_expires_at) <= Date.parse(generatedAt))) { integrity = false; gaps.push(`EVIDENCE_UNAVAILABLE:${link.id}`); }
    } else if (link.evidence_object_id || link.relation_type !== "TRANSACTION_LINK") { integrity = false; gaps.push(`MISSING_EVIDENCE:${link.id}`); }
    if (!tx || !event) gaps.push(`MISSING_CANONICAL_REFERENCE:${link.id}`);
    if (!integrity) gaps.push(`CHRONOLOGY_INTEGRITY:${link.id}`);
    if (tx && Date.parse(link.details.observed_at) < Date.parse(tx.requested_at)) gaps.push(`OBSERVATION_PRECEDES_DECISION:${link.id}`);
    if (link.details.outcome_status === "FAILED" && tx?.decision === "ALLOW") contradictions.push({ transaction_id: tx.transaction_id, observation_id: link.id, kind: "ALLOW_WITH_REPORTED_FAILURE", evaluation: "UNRESOLVED" });
    return {
      id: link.id, kind: link.relation_type, transaction_id: link.transaction_id,
      observed_at: link.details.observed_at, received_at: link.received_at,
      summary: link.details.summary, evidence_object_id: link.evidence_object_id,
      source: source ? { provider: source.provider_key, source_type: source.source_type, classification: source.evidence_classification, independently_verified: false } : { provider: "Cyber Sentinels", source_type: "CANONICAL_TRANSACTION", classification: "CANONICAL_RECORD", independently_verified: false },
      context: Object.keys(link.details.context ?? {}).length ? { dimensions: Object.entries(link.details.context).map(([dimension, reference]) => ({ dimension, reference })), classification: "CALLER_ASSERTED_CONTEXT" } : { status: "UNKNOWN" },
      declared_purpose: tx?.action_purpose ?? "UNKNOWN", observed_purpose: link.details.observed_purpose ?? "UNKNOWN",
      purpose_drift: "UNRESOLVED", attribution: "NOT_ESTABLISHED", global_authorization: "NOT_INFERRED",
      outcome_layer: link.details.outcome_layer, outcome_status: link.details.outcome_status,
      integrity: integrity ? "VERIFIED" : "UNVERIFIED", timestamp_confidence: "UNKNOWN",
    };
  }).sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.received_at.localeCompare(b.received_at) || a.id.localeCompare(b.id));
  for (const kind of ["TRANSACTION_LINK", "EXECUTION_OBSERVATION", "OUTCOME", "DETECTION", "INTERVENTION", "CONTAINMENT", "REMEDIATION"]) {
    if (!timeline.some(row => row.kind === kind && row.integrity === "VERIFIED")) gaps.push(`MISSING_${kind}`);
  }
  const evidenceComplete = gaps.length === 0;
  const authorityResolved = input.transactions.length > 0 && input.transactions.every(tx => input.authorities.some(a => a.id === tx.authority_reference));
  if (!authorityResolved) gaps.push("INCIDENT_AUTHORITY_UNRESOLVED");
  const chronologyIntegrity = timeline.length > 0 && timeline.every(row => row.integrity === "VERIFIED") && !gaps.some(gap => gap.startsWith("OBSERVATION_PRECEDES"));
  // Verification means a complete, integrity-checked reconstruction of attributed records.
  // It never certifies source clock accuracy (exposed separately as UNKNOWN).
  const timelineVerified = chronologyIntegrity && !gaps.some(gap => gap.startsWith("MISSING_"));
  const body = {
    id: input.id, schema_version: INCIDENT_SCHEMA, incident_id: incident.id, tenant_id: tenant, generated_at: generatedAt,
    incident: incident.canonical_case, timeline,
    authorization_phase: input.transactions.map(tx => ({ transaction_id: tx.transaction_id, occurred_at: tx.requested_at, actor: tx.subject_id, authority: tx.authority_reference, action: tx.action_type, resource: tx.action_resource, purpose: tx.action_purpose, policy_id: tx.policy_id, policy_version: tx.policy_version, decision: tx.decision })),
    evaluation_phase: input.transactions.filter(tx => tx.decision_outcome_review).map(tx => ({ transaction_id: tx.transaction_id, original_decision: tx.decision, review: tx.decision_outcome_review })),
    actors: [...new Set(input.transactions.map(tx => tx.subject_id))],
    authority_lineage: input.transactions.map(tx => {
      const current = input.authorities.find(a => a.id === tx.authority_reference);
      return { transaction_id: tx.transaction_id, original_authority: tx.authority_reference, lineage: tx.authority_lineage_references,
        current_record: current ? { authority_id: current.id, status: current.status ?? current.revocation_state ?? "UNKNOWN", revoked_at: current.revoked_at ?? null, subject_id: current.subject_id ?? tx.subject_id } : null };
    }),
    decisions: input.transactions.map(tx => ({ transaction_id: tx.transaction_id, decision: tx.decision, declared_purpose: tx.action_purpose, action: tx.action_type, resource: tx.action_resource, policy_id: tx.policy_id, policy_version: tx.policy_version, reason_codes: tx.reason_codes, decision_outcome_review: tx.decision_outcome_review ?? null })),
    receipts: input.transactions.map(tx => ({ transaction_id: tx.transaction_id, receipt_reference: `/api/v1/trust/transactions/${tx.transaction_id}/receipt`, replay_reference: `/api/v1/trust/transactions/${tx.transaction_id}/replay`, request_digest: tx.request_digest, evidence_digest: tx.evidence_digest, decision_digest: tx.decision_time_snapshot?.decisionDigest ?? null })),
    evidence_references: input.evidence.map(e => ({ evidence_id: e.evidence_id, digest: e.payload_hash, provider: e.provider_key, classification: e.evidence_classification, observed_at: e.observed_at ?? null, received_at: e.received_at ?? null })),
    observations: timeline.filter(row => row.kind === "EXECUTION_OBSERVATION"), outcomes: timeline.filter(row => row.kind === "OUTCOME"),
    existing_outcome_records: input.existingOutcomes ?? [],
    interventions: timeline.filter(row => ["INTERVENTION", "CONTAINMENT"].includes(row.kind)), remediation: timeline.filter(row => row.kind === "REMEDIATION"),
    contradictions, gaps: [...new Set(gaps)],
    states: { evidence_completeness: evidenceComplete ? "INCIDENT_EVIDENCE_COMPLETE" : "INCIDENT_EVIDENCE_GAP", chronology_integrity: chronologyIntegrity ? "VERIFIED" : "UNVERIFIED", timeline: timelineVerified ? "INCIDENT_TIMELINE_VERIFIED" : "UNVERIFIED", authority: authorityResolved ? "RESOLVED" : "INCIDENT_AUTHORITY_UNRESOLVED", export: gaps.length === 0 && timelineVerified ? "REGULATORY_EXPORT_READY" : "DRAFT" },
    limitations: ["Source assertions are not independent verification.", "Digest verifies package integrity, not source truth.", "No regulatory approval or compliance certification.", "Correlation is not attribution; ALLOW is not execution."],
  };
  return { ...body, integrity_digest: hashCanonical(body) };
}
