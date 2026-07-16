import type { SupabaseClient } from "@supabase/supabase-js";

export type Rc6BlockerState = "Cleared" | "Partially Cleared" | "Deployment Required" | "Human Review Required" | "Pilot Traffic Required" | "Blocked";

export type Rc6EvidenceCard = {
  category: "VALIDATION" | "PROVIDER" | "SECURITY" | "PERFORMANCE";
  state: Rc6BlockerState;
  metrics: Array<[string, string]>;
  evidenceHref: string;
  evidenceLabel: string;
};

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1)];
}

function formatMs(value: number | null) {
  return value === null ? "Awaiting Data" : `${value.toFixed(1)} ms`;
}

export async function readRc6EvidenceCards(admin: SupabaseClient): Promise<Rc6EvidenceCard[]> {
  const targetProviderEnvironment = process.env.HOPAE_ENV?.trim() || "sandbox";
  const [validation, checks, measurements, providerExecution] = await Promise.all([
    admin.from("release_validation_cases").select("case_id,dataset_version,review_status", { count: "exact" }),
    admin.from("release_evidence_checks").select("category,check_name,status,evidence_reference,checked_at,details").eq("release_version", "1.0-rc6").order("checked_at", { ascending: false }),
    admin.from("operational_measurements").select("stage,duration_ms,timeout,status,recorded_at,environment").order("recorded_at", { ascending: false }).limit(5000),
    admin.from("provider_execution_records").select("runtime_mode,status,updated_at,latency_ms,replay_reference,evidence_graph_reference,trust_memory_reference,reviewed_outcome_id").eq("provider_id", "hopae_connect").eq("environment", targetProviderEnvironment).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const validationRows = validation.error ? [] : validation.data ?? [];
  const approved = validationRows.filter((item) => item.review_status === "approved");
  const approvedByDataset = approved.reduce<Record<string, number>>((counts, item) => {
    counts[item.dataset_version] = (counts[item.dataset_version] ?? 0) + 1;
    return counts;
  }, {});
  const [eligibleDatasetVersion = "Awaiting Data", eligibleDatasetCount = 0] = Object.entries(approvedByDataset)
    .sort((left, right) => right[1] - left[1])[0] ?? [];
  const checkRows = checks.error ? [] : checks.data ?? [];
  const categoryChecks = (category: string) => checkRows.filter((item) => item.category === category);
  const passed = (category: string, name: string) => categoryChecks(category).some((item) => item.check_name === name && item.status === "passed" && item.evidence_reference);
  const providerRecord = providerExecution.error ? null : providerExecution.data;
  const providerLinked = Boolean(providerRecord?.replay_reference && providerRecord?.evidence_graph_reference && providerRecord?.trust_memory_reference);
  const providerLive = providerRecord?.runtime_mode === "Live" && providerRecord?.status === "completed" && providerLinked;
  const providerReviewed = Boolean(providerRecord?.reviewed_outcome_id) || passed("provider", "reviewed_provider_outcome");
  const requiredSecurityChecks = [
    "supabase_authentication", "email_verification", "session_expiry", "password_reset", "logout",
    "admin_allowlist", "admin_verification", "protected_routes", "api_authorization", "rls_read_denial",
    "rls_write_denial", "tenant_isolation", "forged_webhook_rejection", "stale_webhook_rejection",
    "duplicate_webhook_rejection", "secret_non_disclosure", "rate_limit_response", "oversized_payload_rejection",
    "audit_logging", "revoked_authority", "expired_authority", "kill_switch_enforcement",
  ];
  const securityChecks = categoryChecks("security");
  const securityPassed = requiredSecurityChecks.filter((name) => passed("security", name)).length;
  const securityFailed = securityChecks.filter((item) => item.status === "failed").length;
  const durations = (measurements.error ? [] : measurements.data ?? []).map((item) => Number(item.duration_ms)).filter(Number.isFinite);
  const timeoutCount = (measurements.error ? [] : measurements.data ?? []).filter((item) => item.timeout).length;
  const failureCount = (measurements.error ? [] : measurements.data ?? []).filter((item) => item.status === "failed").length;
  const p50 = durations.length >= 30 ? percentile(durations, 0.5) : null;
  const p95 = durations.length >= 30 ? percentile(durations, 0.95) : null;
  const latestMeasurement = measurements.error ? null : measurements.data?.[0] ?? null;
  const loadCheck = categoryChecks("performance").find((item) => item.check_name === "controlled_load_test" && item.status === "passed");
  const requiredPerformanceStages = [
    "trust_session_creation", "authority_evaluation", "provider_request", "provider_callback", "evidence_normalization",
    "evidence_quality", "trust_decision", "enforcement", "replay_write", "evidence_graph_write", "trust_memory_write",
    "evidence_pack_generation", "database_query", "queue_wait", "end_to_end",
  ];
  const retainedStages = new Set((measurements.error ? [] : measurements.data ?? []).map((item) => item.stage));
  const missingPerformanceStages = requiredPerformanceStages.filter((stage) => !retainedStages.has(stage));
  const slowestStages = [...retainedStages].map((stage) => {
    const values = (measurements.error ? [] : measurements.data ?? []).filter((item) => item.stage === stage).map((item) => Number(item.duration_ms)).filter(Number.isFinite);
    return [stage, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0] as const;
  }).sort((left, right) => right[1] - left[1]).slice(0, 3).map(([stage]) => stage).join(", ");
  const performanceComplete = requiredPerformanceStages.every((stage) => retainedStages.has(stage)) &&
    Boolean(loadCheck) && passed("performance", "telemetry_survives_restart");

  return [
    {
      category: "VALIDATION",
      state: eligibleDatasetCount >= 30 ? "Cleared" : "Human Review Required",
      metrics: [
        ["Approved reviewed count", String(eligibleDatasetCount)],
        ["Threshold", "30"],
        ["Calibration", eligibleDatasetCount >= 30 ? "Dataset-scoped" : "Calibration Incomplete"],
        ["Dataset version", eligibleDatasetVersion],
      ],
      evidenceHref: "/admin/reviews",
      evidenceLabel: "Open review evidence",
    },
    {
      category: "PROVIDER",
      state: providerLive && providerReviewed ? "Cleared" : "Deployment Required",
      metrics: [
        ["Selected provider", "Hopae Connect"],
        ["Runtime state", providerLive ? "Live" : process.env.HOPAE_CLIENT_ID ? "Test" : "Awaiting Credentials"],
        ["Last successful real check", providerLive ? providerRecord?.updated_at ?? "Awaiting Data" : "Awaiting Data"],
        ["Latency", providerLive && providerRecord?.latency_ms !== null ? formatMs(Number(providerRecord?.latency_ms)) : "Awaiting Data"],
        ["Reviewed outcome", providerReviewed ? "Passed" : "Blocked"],
      ],
      evidenceHref: "/admin/provider-status",
      evidenceLabel: "Open provider evidence",
    },
    {
      category: "SECURITY",
      state: securityFailed === 0 && securityPassed === requiredSecurityChecks.length ? "Cleared" : "Deployment Required",
      metrics: [
        ["Deployed tests passed", String(securityPassed)],
        ["Failed tests", String(securityFailed)],
        ["RLS proof", passed("security", "rls_read_denial") && passed("security", "rls_write_denial") ? "Passed" : "Blocked"],
        ["Webhook proof", passed("security", "forged_webhook_rejection") && passed("security", "stale_webhook_rejection") && passed("security", "duplicate_webhook_rejection") ? "Passed" : "Blocked"],
        ["Tenant isolation", passed("security", "tenant_isolation") ? "Passed" : "Blocked"],
      ],
      evidenceHref: "/admin/runtime-validation",
      evidenceLabel: "Open security evidence",
    },
    {
      category: "PERFORMANCE",
      state: performanceComplete ? "Cleared" : "Pilot Traffic Required",
      metrics: [
        ["Retained samples", String(durations.length)],
        ["Latest sample", latestMeasurement?.recorded_at ?? "Awaiting Data"],
        ["Environment", latestMeasurement?.environment ?? "Awaiting Data"],
        ["Average", formatMs(durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null)],
        ["p50", durations.length >= 30 ? formatMs(p50) : "Awaiting sufficient samples"],
        ["p95", durations.length >= 30 ? formatMs(p95) : "Awaiting sufficient samples"],
        ["Timeout rate", durations.length ? `${((timeoutCount / durations.length) * 100).toFixed(2)}%` : "Awaiting Data"],
        ["Error rate", durations.length ? `${((failureCount / durations.length) * 100).toFixed(2)}%` : "Awaiting Data"],
        ["Slowest stages", slowestStages || "Awaiting Data"],
        ["Missing evidence", missingPerformanceStages.length ? missingPerformanceStages.join(", ") : "None"],
        ["Latest load test", loadCheck?.checked_at ?? "Awaiting Data"],
      ],
      evidenceHref: "/admin/trust-execution",
      evidenceLabel: "Open performance evidence",
    },
  ];
}
