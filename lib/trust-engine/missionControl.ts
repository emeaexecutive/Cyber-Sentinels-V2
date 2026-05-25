export type MissionSignal = {
  id?: string;
  event: string;
  created_at?: string | null;
};

export type MissionPassport = {
  trust_score?: number | null;
  human_presence_index?: number | null;
  origin_trace_score?: number | null;
  synthetic_risk?: number | null;
  suspicious_activity?: boolean | null;
  scan_status?: string | null;
  review_status?: string | null;
  verification_status?: string | null;
  reality_passport_status?: string | null;
  created_at?: string | null;
};

export type MissionVerificationCase = {
  status?: string | null;
  verification_status?: string | null;
  trust_score?: number | null;
  created_at?: string | null;
};

export type MissionDecision = {
  decision?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type MissionEvidence = {
  scan_status?: string | null;
  created_at?: string | null;
};

export type MissionSources = {
  passports?: MissionPassport[] | null;
  verificationCases?: MissionVerificationCase[] | null;
  signals?: MissionSignal[] | null;
  decisions?: MissionDecision[] | null;
  evidence?: MissionEvidence[] | null;
  apiAuditEvents?: Array<{ event_type?: string | null; created_at?: string | null }> | null;
};

type MissionStatusItem = {
  status?: string | null;
  verification_status?: string | null;
  review_status?: string | null;
};

export type MissionMetrics = {
  activeVerifications: number;
  criticalAlerts: number;
  signalsToday: number;
  averageTrustScore: number;
  evidencePendingScan: number;
  humanReviews: number;
  apiCallsToday: number;
  manualReviews: number;
  trustDriftEvents: number;
  realityDriftEvents: number;
  hpgSignals: number;
  cloneRiskEvents: number;
};

export type MissionControlSnapshot = {
  metrics: MissionMetrics;
  systemIndicators: Array<{ label: string; value: string }>;
  regionalActivity: Array<{ region: string; status: string; activity: number }>;
  liveSignals: MissionSignal[];
  isDemo: boolean;
};

export const missionSections = [
  ["Trust Radar™", "/trust-radar"],
  ["Verification Queue™", "/verification-queue"],
  ["Prediction Engine™", "/trust-prediction"],
  ["Policy Engine™", "/policy-engine"],
  ["Decision Engine™", "/decision-engine"],
  ["Evidence Vault™", "/evidence-vault"],
  ["Trust Timeline™", "/trust-timeline"],
  ["Trust Graph™", "/trust-graph"],
  ["Reality Passport™", "/reality-passport"],
  ["Origin DNA™", "/origin-dna"],
  ["Reality Chain™", "/reality-chain"],
  ["Reality Twin™", "/reality-twin"],
  ["Synthetic Counterpart™", "/synthetic-counterpart"],
  ["Human Presence Index™", "/human-presence-index"],
  ["Human Presence Genome™", "/human-presence-genome"],
  ["Step-Up Verification™", "/step-up-verification"],
  ["Revocation Engine™", "/revocation-engine"],
  ["Trust Recovery™", "/trust-recovery"],
  ["Compliance Export™", "/compliance-export"],
  ["Verifier Network™", "/verifier-network"],
  ["Trust Feed™", "/trust-feed"],
] as const;

export const demoMissionSignals: MissionSignal[] = [
  { id: "demo-trust-drift", event: "Trust drift detected" },
  { id: "demo-synthetic-escalation", event: "Synthetic escalation forecast" },
  { id: "demo-human-presence", event: "Human Presence changed" },
  { id: "demo-hpg", event: "Human Presence Genome stable" },
  { id: "demo-clone-risk", event: "Synthetic clone risk detected" },
  { id: "demo-evidence-scan", event: "Evidence scan complete" },
  { id: "demo-admin-decision", event: "Admin decision created" },
  { id: "demo-reality-passport", event: "Reality Passport updated" },
  { id: "demo-reality-drift", event: "Reality drift detected" },
  { id: "demo-step-up", event: "Step-Up verification required" },
  { id: "demo-revocation", event: "Revocation review started" },
  { id: "demo-recovery", event: "Trust recovery requested" },
  { id: "demo-compliance-export", event: "Compliance export created" },
  { id: "demo-verifier-assignment", event: "Case assigned to verifier" },
  { id: "demo-trust-feed", event: "Public activity generated" },
];

function isToday(value: string | null | undefined) {
  return value ? new Date(value).toDateString() === new Date().toDateString() : false;
}

function statusOf(item: MissionStatusItem) {
  return item.verification_status ?? item.review_status ?? item.status ?? "pending";
}

function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

export function createDemoMissionControlSnapshot(): MissionControlSnapshot {
  return {
    metrics: {
      activeVerifications: 12,
      criticalAlerts: 3,
      signalsToday: 18,
      averageTrustScore: 82,
      evidencePendingScan: 5,
      humanReviews: 7,
      apiCallsToday: 144,
      manualReviews: 6,
      trustDriftEvents: 4,
      realityDriftEvents: 2,
      hpgSignals: 3,
      cloneRiskEvents: 2,
    },
    systemIndicators: createSystemIndicators(),
    regionalActivity: createRegionalActivity(18),
    liveSignals: demoMissionSignals,
    isDemo: true,
  };
}

export function createSystemIndicators() {
  return [
    { label: "Trust Layer", value: "ACTIVE" },
    { label: "Evidence Chain", value: "ACTIVE" },
    { label: "Origin Trace", value: "ACTIVE" },
    { label: "API Gateway", value: "READY" },
    { label: "Security Layer", value: "GREEN" },
    { label: "Compliance", value: "READY" },
  ];
}

export function createRegionalActivity(seed: number) {
  const regions = ["EU", "UK", "USA", "APAC", "MEA"];

  return regions.map((region, index) => ({
    region,
    status: index < 3 ? "active" : "ready",
    activity: Math.max(1, Math.round(seed / (index + 1))),
  }));
}

export function createMissionControlSnapshot(
  sources: MissionSources
): MissionControlSnapshot {
  const passports = sources.passports ?? [];
  const verificationCases = sources.verificationCases ?? [];
  const signals = sources.signals ?? [];
  const decisions = sources.decisions ?? [];
  const evidence = sources.evidence ?? [];
  const apiAuditEvents = sources.apiAuditEvents ?? [];

  if (
    !passports.length &&
    !verificationCases.length &&
    !signals.length &&
    !decisions.length &&
    !evidence.length &&
    !apiAuditEvents.length
  ) {
    return createDemoMissionControlSnapshot();
  }

  const activeVerifications = verificationCases.filter((item) =>
    ["pending", "in_review", "escalated"].includes(statusOf(item))
  ).length;
  const criticalAlerts =
    passports.filter(
      (passport) =>
        passport.suspicious_activity ||
        (passport.synthetic_risk ?? 0) >= 80 ||
        (passport.trust_score ?? 100) < 45
    ).length +
    verificationCases.filter((item) => statusOf(item) === "escalated").length;
  const signalsToday = signals.filter((signal) => isToday(signal.created_at)).length;
  const averageTrustScore = average(
    passports
      .map((passport) => passport.trust_score)
      .filter((value): value is number => typeof value === "number")
  );
  const evidencePendingScan =
    evidence.filter((item) =>
      ["pending", "submitted", "scanning", "pending_scan"].includes(
        item.scan_status ?? "pending"
      )
    ).length ||
    passports.filter((passport) => (passport.scan_status ?? "pending") === "pending")
      .length;
  const humanReviews =
    verificationCases.filter((item) =>
      ["pending", "in_review", "escalated"].includes(statusOf(item))
    ).length +
    passports.filter((passport) =>
      ["pending", "in_review", "manual_review"].includes(statusOf(passport))
    ).length;
  const apiCallsToday = apiAuditEvents.filter((event) => isToday(event.created_at)).length;
  const manualReviews = decisions.filter(
    (decision) => decision.decision === "manual_review"
  ).length;
  const trustDriftEvents = signals.filter((signal) =>
    /drift|synthetic escalation|presence changed/i.test(signal.event)
  ).length;
  const realityDriftEvents = signals.filter((signal) =>
    /reality_drift|reality drift|origin_confidence|reality_chain/i.test(
      signal.event
    )
  ).length;
  const hpgSignals = signals.filter((signal) =>
    /hpg|presence_shift|behavioral_drift|synthetic_deviation/i.test(
      signal.event
    )
  ).length;
  const cloneRiskEvents = signals.filter((signal) =>
    /clone_risk|synthetic_clone|identity_exposure|reality_twin/i.test(
      signal.event
    )
  ).length;
  const signalFallback = signals.length ? signals.slice(0, 6) : demoMissionSignals;

  return {
    metrics: {
      activeVerifications,
      criticalAlerts,
      signalsToday,
      averageTrustScore,
      evidencePendingScan,
      humanReviews,
      apiCallsToday,
      manualReviews,
      trustDriftEvents,
      realityDriftEvents,
      hpgSignals,
      cloneRiskEvents,
    },
    systemIndicators: createSystemIndicators(),
    regionalActivity: createRegionalActivity(
      signalsToday + activeVerifications + apiCallsToday
    ),
    liveSignals: signalFallback,
    isDemo: false,
  };
}
