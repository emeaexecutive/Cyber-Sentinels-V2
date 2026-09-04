export type TrustAlertContractRow = Record<string, unknown>;

export type TrustAlertContract = {
  id?: string | null;
  enterprise_id?: string | null;
  alert_type?: string | null;
  title: string;
  description: string;
  severity?: string | null;
  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  source?: string | null;
  evidence_refs: string[];
  alert_title: string | null;
  alert_description: string | null;
  [key: string]: unknown;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function asOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return String(value);
}

export function normalizeTrustAlert(row: TrustAlertContractRow): TrustAlertContract {
  const titleCandidate =
    row.alert_title ?? row.title ?? row.summary ?? row.alert_type ?? "Trust alert";
  const descriptionCandidate =
    row.alert_description ?? row.description ?? row.summary ?? "Review the alert context before changing workflow state.";
  const createdAtCandidate = row.created_at ?? row.detected_at ?? row.createdAt ?? row.detectedAt ?? null;
  const resolvedAtCandidate = row.resolved_at ?? row.resolvedAt ?? null;
  const evidenceRefs = asStringArray(row.evidence_refs ?? row.evidence_references ?? []);
  const normalizedTitle = String(titleCandidate ?? "Trust alert");
  const normalizedDescription = String(descriptionCandidate ?? "Review the alert context before changing workflow state.");

  return {
    ...row,
    id: asOptionalString(row.id),
    enterprise_id: asOptionalString(row.enterprise_id),
    alert_type: asOptionalString(row.alert_type),
    title: normalizedTitle,
    description: normalizedDescription,
    severity: asOptionalString(row.severity),
    status: asOptionalString(row.status),
    created_at: createdAtCandidate ? String(createdAtCandidate) : null,
    resolved_at: resolvedAtCandidate ? String(resolvedAtCandidate) : null,
    source: asOptionalString(row.source) ?? (row.triggering_event_id ? "trust_event" : "continuous_trust"),
    evidence_refs: evidenceRefs,
    alert_title: normalizedTitle,
    alert_description: normalizedDescription,
  };
}
