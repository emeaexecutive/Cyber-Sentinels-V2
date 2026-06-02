export type TrustGraphRow = Record<string, any>;

export type TrustGraphHealthInput = {
  passport?: TrustGraphRow | null;
  verificationCases?: TrustGraphRow[];
  evidenceFiles?: TrustGraphRow[];
  decisions?: TrustGraphRow[];
  auditLogs?: TrustGraphRow[];
  signals?: TrustGraphRow[];
  stateChecks?: TrustGraphRow[];
  executionPassports?: TrustGraphRow[];
  graphNodes?: TrustGraphRow[];
  graphEdges?: TrustGraphRow[];
};

export type TrustGraphTimelineEvent = {
  label: string;
  created_at: string;
};

function hasRows(rows?: TrustGraphRow[]) {
  return Boolean(rows?.length);
}

function rowDate(row?: TrustGraphRow) {
  return String(row?.created_at ?? row?.updated_at ?? "");
}

function firstDate(rows?: TrustGraphRow[]) {
  return [...(rows ?? [])].sort(
    (left, right) =>
      new Date(rowDate(left)).getTime() - new Date(rowDate(right)).getTime()
  )[0]?.created_at;
}

function labelForScore(score: number) {
  if (score >= 80) {
    return "Complete Trust Chain";
  }

  if (score >= 60) {
    return "Strong Trust Chain";
  }

  if (score >= 40) {
    return "Partial Trust Chain";
  }

  return "Weak Trust Chain";
}

function healthForScore(score: number) {
  if (score >= 80) {
    return "Complete";
  }

  if (score >= 60) {
    return "Strong";
  }

  if (score >= 40) {
    return "Partial";
  }

  return "Weak";
}

export function scoreGraphHealth(input: TrustGraphHealthInput) {
  const verificationCases = input.verificationCases ?? [];
  const evidenceFiles = input.evidenceFiles ?? [];
  const decisions = input.decisions ?? [];
  const auditLogs = input.auditLogs ?? [];
  const signals = input.signals ?? [];
  const stateChecks = input.stateChecks ?? [];
  const executionPassports = input.executionPassports ?? [];
  const graphNodes = input.graphNodes ?? [];
  const graphEdges = input.graphEdges ?? [];

  let score = 0;

  if (input.passport) {
    score += 20;
  }

  if (hasRows(verificationCases)) {
    score += 20;
  }

  if (hasRows(evidenceFiles)) {
    score += 20;
  }

  if (hasRows(decisions)) {
    score += 20;
  }

  if (hasRows(auditLogs)) {
    score += 10;
  }

  if (hasRows(signals)) {
    score += 10;
  }

  score = Math.max(0, Math.min(score, 100));

  const missingLinks = [
    evidenceFiles.length ? "" : "No evidence linked",
    decisions.length ? "" : "No admin decision linked",
    auditLogs.length ? "" : "No audit trail linked",
    signals.length ? "" : "No signal trail linked",
    stateChecks.length ? "" : "No state check linked",
    executionPassports.length ? "" : "No execution passport linked",
  ].filter(Boolean);

  const timeline: TrustGraphTimelineEvent[] = [
    input.passport?.created_at
      ? { label: "Passport created", created_at: String(input.passport.created_at) }
      : null,
    firstDate(verificationCases)
      ? {
          label: "Verification started",
          created_at: String(firstDate(verificationCases)),
        }
      : null,
    firstDate(evidenceFiles)
      ? { label: "Evidence uploaded", created_at: String(firstDate(evidenceFiles)) }
      : null,
    evidenceFiles.find((row) =>
      /accepted|approved|clean|verified/i.test(
        String(row.status ?? row.scan_status ?? row.review_status ?? "")
      )
    )?.created_at
      ? {
          label: "Evidence accepted",
          created_at: String(
            evidenceFiles.find((row) =>
              /accepted|approved|clean|verified/i.test(
                String(row.status ?? row.scan_status ?? row.review_status ?? "")
              )
            )?.created_at
          ),
        }
      : null,
    firstDate(decisions)
      ? { label: "Decision created", created_at: String(firstDate(decisions)) }
      : null,
    verificationCases.find((row) =>
      /verified|approved|completed/i.test(
        String(row.status ?? row.verification_status ?? "")
      )
    )?.updated_at
      ? {
          label: "Verification completed",
          created_at: String(
            verificationCases.find((row) =>
              /verified|approved|completed/i.test(
                String(row.status ?? row.verification_status ?? "")
              )
            )?.updated_at
          ),
        }
      : null,
    firstDate(stateChecks)
      ? { label: "State check created", created_at: String(firstDate(stateChecks)) }
      : null,
    firstDate(executionPassports)
      ? {
          label: "Execution passport created",
          created_at: String(firstDate(executionPassports)),
        }
      : null,
  ].filter(Boolean) as TrustGraphTimelineEvent[];

  timeline.sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );

  const strengths = [
    input.passport ? "a passport" : "",
    evidenceFiles.length ? "evidence" : "",
    evidenceFiles.some((row) =>
      /accepted|approved|clean|verified/i.test(
        String(row.status ?? row.scan_status ?? row.review_status ?? "")
      )
    )
      ? "an accepted review"
      : "",
    decisions.length ? "an admin decision" : "",
    auditLogs.length ? "audit events" : "",
    signals.length ? "signals" : "",
  ].filter(Boolean);

  const explanation = missingLinks.length
    ? `This trust graph is incomplete because ${missingLinks[0].toLowerCase()}.`
    : `This trust graph is strong because it contains ${strengths.join(", ")}.`;

  return {
    totalNodes: graphNodes.length,
    totalEdges: graphEdges.length,
    evidenceCoverage: evidenceFiles.length,
    decisionCoverage: decisions.length,
    auditCoverage: auditLogs.length,
    signalDensity: signals.length,
    score,
    label: labelForScore(score),
    health: healthForScore(score),
    missingLinks,
    timeline,
    explanation,
  };
}
