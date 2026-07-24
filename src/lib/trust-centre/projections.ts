import type {
  TrustCentreRow,
  TrustDnaDimension,
} from "./types";

const dimensionRules: Array<{
  name: string;
  weight: number;
  domains: string[];
  evidence: RegExp;
}> = [
  { name: "Identity", weight: 16, domains: ["IDENTITY"], evidence: /identity|passport|document|email|phone|liveness/i },
  { name: "AI behaviour", weight: 14, domains: ["AI_AGENT"], evidence: /agent|model|delegation|permission|behavio/i },
  { name: "Device", weight: 11, domains: ["DEVICE"], evidence: /device|browser|attestation/i },
  { name: "Network", weight: 9, domains: ["NETWORK"], evidence: /network|vpn|ip|location/i },
  { name: "Runtime", weight: 14, domains: ["RUNTIME"], evidence: /runtime|session|execution/i },
  { name: "Authority", weight: 10, domains: ["AUTHORITY"], evidence: /authority|permission|grant|role/i },
  { name: "Workflow", weight: 8, domains: ["WORKFLOW"], evidence: /workflow|approval|review/i },
  { name: "Data provenance", weight: 8, domains: ["DATA"], evidence: /document|data|provenance|origin/i },
  { name: "Consent", weight: 5, domains: ["CONSENT"], evidence: /consent|receipt/i },
  { name: "Governance", weight: 5, domains: ["GOVERNANCE"], evidence: /policy|governance|compliance/i },
];

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evidenceScore(rows: TrustCentreRow[]) {
  if (!rows.length) return null;
  const values = rows.map((row) => {
    const result = String(row.result ?? "").toUpperCase();
    const assurance = String(row.assurance_level ?? "").toUpperCase();
    const resultScore =
      result === "POSITIVE" ? 100 : result === "NEGATIVE" || result === "REVOKED" ? 0 : 45;
    const assuranceAdjustment =
      assurance === "VERY_HIGH" ? 0 : assurance === "HIGH" ? -3 : assurance === "MEDIUM" ? -8 : -15;
    return Math.max(0, resultScore + assuranceAdjustment);
  });
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function trustStateDistribution(runtime: TrustCentreRow[]) {
  const counts = new Map<string, number>();
  for (const row of runtime) {
    const state = String(row.state ?? "UNKNOWN").toUpperCase();
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

export function trustScoreDistribution(runtime: TrustCentreRow[]) {
  const bands = [
    { label: "0–19", minimum: 0, maximum: 19 },
    { label: "20–39", minimum: 20, maximum: 39 },
    { label: "40–59", minimum: 40, maximum: 59 },
    { label: "60–79", minimum: 60, maximum: 79 },
    { label: "80–100", minimum: 80, maximum: 100 },
  ];
  return bands.map(({ label, minimum, maximum }) => ({
    label,
    count: runtime.filter((row) => {
      const score = number(row.normalized_score);
      return score !== null && score >= minimum && score <= maximum;
    }).length,
  }));
}

export function trustHealth(runtime: TrustCentreRow[]) {
  const measured = runtime
    .map((row) => number(row.normalized_score))
    .filter((value): value is number => value !== null);
  if (!measured.length) return null;
  return Math.round(measured.reduce((sum, value) => sum + value, 0) / measured.length);
}

export function highRisk(runtime: TrustCentreRow[]) {
  return runtime.filter((row) => {
    const state = String(row.state ?? "").toUpperCase();
    const score = number(row.normalized_score);
    const flags = Array.isArray(row.current_risk_flags) ? row.current_risk_flags : [];
    return ["BLOCKED", "CHALLENGED", "REVOKED"].includes(state) ||
      (score !== null && score < 40) ||
      flags.length > 0;
  });
}

export function deriveTrustDna(
  evidence: TrustCentreRow[],
  assessments: TrustCentreRow[]
): TrustDnaDimension[] {
  return dimensionRules.map((rule) => {
    const matching = evidence.filter((row) => {
      const domain = String(row.domain_key ?? "").toUpperCase();
      const descriptor = `${row.evidence_type ?? ""} ${row.source_type ?? ""} ${row.source_key ?? ""}`;
      return rule.domains.includes(domain) || rule.evidence.test(descriptor);
    });
    const score = evidenceScore(matching);
    const currentDomain = assessments.find(
      (row) => rule.domains.includes(String(row.domain_key ?? "").toUpperCase())
    );
    const previousDomain = assessments.find(
      (row) =>
        row !== currentDomain &&
        rule.domains.includes(String(row.domain_key ?? "").toUpperCase())
    );
    const current = number(currentDomain?.score) ?? score;
    const previous = number(previousDomain?.score);
    const confidence = Math.min(
      100,
      Math.round(
        matching.reduce((total, row) => {
          const assurance = String(row.assurance_level ?? "").toUpperCase();
          return total + (assurance === "VERY_HIGH" ? 100 : assurance === "HIGH" ? 85 : assurance === "MEDIUM" ? 65 : 35);
        }, 0) / Math.max(1, matching.length)
      )
    );
    const trend =
      current === null || previous === null
        ? current === null ? "unavailable" : "stable"
        : current > previous + 2 ? "improving"
        : current < previous - 2 ? "declining"
        : "stable";
    return {
      dimension: rule.name,
      score: current,
      confidence: matching.length ? confidence : 0,
      weight: rule.weight,
      trend,
      explanation: matching.length
        ? `Derived from ${matching.length} tenant-scoped canonical evidence object${matching.length === 1 ? "" : "s"}.`
        : "No canonical evidence is available for this dimension.",
      evidenceCount: matching.length,
      comparedWith: previous,
    };
  });
}

export function csvCell(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}
