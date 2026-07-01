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
  ["Trust Posture", "/dashboard/trust-posture"],
  ["Governance Review", "/dashboard/governance"],
  ["Replay Timeline", "/trust-replay"],
  ["Evidence Chain", "/evidence-vault"],
  ["Authorization Lineage", "/dashboard/access-governance"],
  ["Session Integrity", "/dashboard/session-integrity"],
  ["Verification Receipt", "/verification-receipts"],
] as const;

export const demoMissionSignals: MissionSignal[] = [
  { id: "demo-session-integrity", event: "Session Integrity changed" },
  { id: "demo-evidence-chain", event: "Evidence Chain updated" },
  { id: "demo-governance-review", event: "Governance Review assigned" },
  { id: "demo-authorization", event: "Authorization Lineage recorded" },
  { id: "demo-replay", event: "Replay Timeline updated" },
  { id: "demo-receipt", event: "Verification Receipt issued" },
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
