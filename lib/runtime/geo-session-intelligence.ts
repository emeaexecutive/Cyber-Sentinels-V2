export type GeoSessionDecision = "allow" | "step_up" | "review" | "block";

export type GeoSessionInput = {
  currentCountry?: string | null;
  previousCountry?: string | null;
  currentDevice?: string | null;
  previousDevice?: string | null;
  userAgent?: string | null;
  expectedCountries?: string[];
  knownDevice?: boolean;
  sessionAgeMinutes?: number | null;
  governanceLock?: boolean;
};

export type GeoSessionIntelligence = {
  decision: GeoSessionDecision;
  posture: "normal" | "watch" | "elevated" | "restricted";
  continuity_score: number;
  geo_mismatch: boolean;
  impossible_travel: "not_evaluated" | "requires_provider" | "suspected";
  unusual_session_country: boolean;
  new_device: boolean;
  unusual_browser_or_device: boolean;
  risky_session: boolean;
  source_labels: ["Heuristic Baseline", "Runtime Intelligence"];
  reasons: string[];
  limitations: string[];
};

function normalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function evaluateGeoSessionIntelligence(input: GeoSessionInput): GeoSessionIntelligence {
  const currentCountry = normalize(input.currentCountry);
  const previousCountry = normalize(input.previousCountry);
  const currentDevice = normalize(input.currentDevice);
  const previousDevice = normalize(input.previousDevice);
  const userAgent = normalize(input.userAgent);
  const expectedCountries = (input.expectedCountries ?? []).map(normalize).filter(Boolean);

  const geoMismatch = Boolean(currentCountry && previousCountry && currentCountry !== previousCountry);
  const unusualSessionCountry = Boolean(
    currentCountry &&
      expectedCountries.length > 0 &&
      !expectedCountries.includes(currentCountry)
  );
  const newDevice = Boolean(currentDevice && previousDevice && currentDevice !== previousDevice) || input.knownDevice === false;
  const unusualBrowserOrDevice =
    /headless|bot|crawler|spider|selenium|phantom/i.test(userAgent) ||
    userAgent.length < 12;
  const impossibleTravel =
    geoMismatch && typeof input.sessionAgeMinutes === "number" && input.sessionAgeMinutes < 60
      ? "suspected"
      : geoMismatch
        ? "requires_provider"
        : "not_evaluated";

  const penalties = [
    geoMismatch ? 18 : 0,
    unusualSessionCountry ? 16 : 0,
    newDevice ? 14 : 0,
    unusualBrowserOrDevice ? 12 : 0,
    impossibleTravel === "suspected" ? 20 : 0,
    input.governanceLock ? 100 : 0,
  ];
  const continuityScore = clampScore(100 - penalties.reduce((total, value) => total + value, 0));
  const riskySession = continuityScore < 70;
  const decision: GeoSessionDecision = input.governanceLock
    ? "block"
    : continuityScore < 45
      ? "block"
      : continuityScore < 65
        ? "review"
        : continuityScore < 82
          ? "step_up"
          : "allow";
  const posture =
    decision === "block"
      ? "restricted"
      : decision === "review"
        ? "elevated"
        : decision === "step_up"
          ? "watch"
          : "normal";
  const reasons = [
    geoMismatch ? "Country changed from the previous retained session." : null,
    unusualSessionCountry ? "Session country is outside the expected operating set." : null,
    newDevice ? "Device continuity changed or no trusted-device marker is present." : null,
    unusualBrowserOrDevice ? "Browser or device signature is unusual." : null,
    impossibleTravel === "suspected" ? "Impossible-travel placeholder requires provider validation." : null,
    input.governanceLock ? "Governance lock blocks session continuation." : null,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    decision,
    posture,
    continuity_score: continuityScore,
    geo_mismatch: geoMismatch,
    impossible_travel: impossibleTravel,
    unusual_session_country: unusualSessionCountry,
    new_device: newDevice,
    unusual_browser_or_device: unusualBrowserOrDevice,
    risky_session: riskySession,
    source_labels: ["Heuristic Baseline", "Runtime Intelligence"],
    reasons: reasons.length ? reasons : ["Session continuity is consistent with retained context."],
    limitations: [
      "Geo and device intelligence is heuristic runtime context unless a configured provider supplies verified evidence.",
      "Impossible-travel checks are placeholders without precise provider-backed location timestamps.",
      "Session risk is review context, not a standalone identity or fraud verdict.",
    ],
  };
}

export function geoSessionInputFromHeaders(headers: Headers, input: Partial<GeoSessionInput> = {}) {
  return {
    currentCountry:
      input.currentCountry ??
      headers.get("x-vercel-ip-country") ??
      headers.get("cf-ipcountry") ??
      headers.get("x-country") ??
      "unknown",
    userAgent: input.userAgent ?? headers.get("user-agent") ?? "unknown",
    currentDevice: input.currentDevice ?? headers.get("user-agent") ?? "unknown",
    previousCountry: input.previousCountry,
    previousDevice: input.previousDevice,
    expectedCountries: input.expectedCountries,
    knownDevice: input.knownDevice,
    sessionAgeMinutes: input.sessionAgeMinutes,
    governanceLock: input.governanceLock,
  };
}
