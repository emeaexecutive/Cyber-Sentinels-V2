export type RadarSeverity = "low" | "medium" | "high" | "critical";
export type RadarStatus = "pending" | "investigating" | "verified" | "critical";

export type SignalRow = {
  id: string;
  event: string;
  created_at: string | null;
};

type LooseSignalRow = {
  id: string;
  event?: string | null;
  created_at?: string | null;
};

export type PassportSignalStats = {
  human_presence_index: number | null;
  origin_trace_score: number | null;
  review_status: string | null;
};

export type RadarSignal = {
  id: string;
  event: string;
  severity: RadarSeverity;
  created_at: string;
  source_type: string;
  status: RadarStatus;
  isDemo: boolean;
  visual: "Signal detected" | "Trust state changed" | "Reality status updated";
};

export type RadarMetrics = {
  signalsToday: number;
  criticalAlerts: number;
  pendingReviews: number;
  averageHumanPresenceIndex: number;
  averageOriginTrace: number;
};

const demoEvents = [
  "Unknown entity entered trust layer",
  "Voice anomaly detected",
  "Human Presence Index recalculated",
  "Origin Trace weak",
  "Synthetic-media risk increased",
  "Manual review requested",
  "Reality Passport updated",
  "Admin decision completed",
  "Evidence scan complete",
];

function inferSeverity(event: string): RadarSeverity {
  const lower = event.toLowerCase();

  if (
    lower.includes("critical") ||
    lower.includes("synthetic-media") ||
    lower.includes("synthetic media") ||
    lower.includes("unknown entity")
  ) {
    return "critical";
  }

  if (
    lower.includes("weak") ||
    lower.includes("anomaly") ||
    lower.includes("risk increased") ||
    lower.includes("review requested")
  ) {
    return "high";
  }

  if (
    lower.includes("pending") ||
    lower.includes("recalculated") ||
    lower.includes("started")
  ) {
    return "medium";
  }

  return "low";
}

function inferStatus(event: string, severity: RadarSeverity): RadarStatus {
  const lower = event.toLowerCase();

  if (severity === "critical") {
    return "critical";
  }

  if (lower.includes("review") || lower.includes("anomaly")) {
    return "investigating";
  }

  if (
    lower.includes("complete") ||
    lower.includes("completed") ||
    lower.includes("updated") ||
    lower.includes("verified")
  ) {
    return "verified";
  }

  return "pending";
}

function inferSourceType(event: string) {
  const lower = event.toLowerCase();

  if (lower.includes("agent")) return "AI agent";
  if (lower.includes("candidate") || lower.includes("hiring")) return "Candidate verification";
  if (
    lower.includes("synthetic-media") ||
    lower.includes("synthetic media") ||
    lower.includes("voice") ||
    lower.includes("image")
  ) {
    return "Synthetic media";
  }
  if (lower.includes("reality")) return "Reality Passport";
  if (lower.includes("origin")) return "Origin Trace";
  if (lower.includes("human presence") || lower.includes("human")) return "Human";
  if (lower.includes("admin")) return "Back office";

  return "Trust layer";
}

function inferVisual(event: string): RadarSignal["visual"] {
  const lower = event.toLowerCase();

  if (lower.includes("reality")) {
    return "Reality status updated";
  }

  if (
    lower.includes("updated") ||
    lower.includes("completed") ||
    lower.includes("recalculated")
  ) {
    return "Trust state changed";
  }

  return "Signal detected";
}

export function createDemoSignals(now = new Date()): RadarSignal[] {
  return demoEvents.map((event, index) => {
    const createdAt = new Date(now.getTime() - index * 1000 * 60 * 7);
    const severity = inferSeverity(event);

    return {
      id: `demo-${index}`,
      event,
      severity,
      created_at: createdAt.toISOString(),
      source_type: inferSourceType(event),
      status: inferStatus(event, severity),
      isDemo: true,
      visual: inferVisual(event),
    };
  });
}

export function normalizeSignals(
  signals: Array<SignalRow | LooseSignalRow> | null | undefined
) {
  if (!signals?.length) {
    return createDemoSignals();
  }

  return signals.map((signal) => {
    const event = signal.event ?? "Signal recorded";
    const severity = inferSeverity(event);

    return {
      id: signal.id,
      event,
      severity,
      created_at: signal.created_at ?? new Date().toISOString(),
      source_type: inferSourceType(event),
      status: inferStatus(event, severity),
      isDemo: false,
      visual: inferVisual(event),
    };
  });
}

export function formatTimeAgo(value: string) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );

  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;

  return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

export function calculateRadarMetrics(
  signals: RadarSignal[],
  passports: PassportSignalStats[] | null | undefined
): RadarMetrics {
  const today = new Date().toDateString();
  const liveSignals = signals.filter((signal) => !signal.isDemo);
  const metricSignals = liveSignals.length ? liveSignals : signals;
  const passportRows = passports ?? [];

  const averageHumanPresenceIndex = passportRows.length
    ? Math.round(
        passportRows.reduce(
          (sum, passport) => sum + (passport.human_presence_index ?? 0),
          0
        ) / passportRows.length
      )
    : 0;

  const averageOriginTrace = passportRows.length
    ? Math.round(
        passportRows.reduce(
          (sum, passport) => sum + (passport.origin_trace_score ?? 0),
          0
        ) / passportRows.length
      )
    : 0;

  return {
    signalsToday: metricSignals.filter(
      (signal) => new Date(signal.created_at).toDateString() === today
    ).length,
    criticalAlerts: metricSignals.filter(
      (signal) => signal.severity === "critical"
    ).length,
    pendingReviews:
      passportRows.filter((passport) => (passport.review_status ?? "pending") === "pending")
        .length ||
      metricSignals.filter((signal) => signal.status === "pending").length,
    averageHumanPresenceIndex,
    averageOriginTrace,
  };
}
