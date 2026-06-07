import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationRegistry } from "@/lib/integrations/registry";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ApiTestStatus = "not_run" | "passed" | "failed" | "warning";

export type ApiTestResult = {
  test_name: string;
  status: Exclude<ApiTestStatus, "not_run">;
  safe_message: string;
  metadata: Record<string, unknown>;
};

export const apiTestNames = [
  "Supabase connection",
  "Enterprise Access insert",
  "Passport creation",
  "Evidence upload schema check",
  "Decision insert",
  "Audit log insert",
  "Signal insert",
  "Stripe config check",
  "OpenAI config check",
  "World ID config check",
];

const diagnosticSource = "admin_api_test_harness";

function safeError(prefix: string, error: unknown) {
  const candidate = error as { code?: unknown; name?: unknown };
  const code = typeof candidate?.code === "string" ? ` (${candidate.code})` : "";
  const name = typeof candidate?.name === "string" ? ` ${candidate.name}` : "";
  return `${prefix}${name}${code}`;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function baseMetadata(extra: Record<string, unknown> = {}) {
  return {
    diagnostic: true,
    source: diagnosticSource,
    ...extra,
  };
}

async function cleanupById(
  supabase: SupabaseClient,
  table: string,
  id: string | null | undefined
) {
  if (!id) return;
  await supabase.from(table).delete().eq("id", id);
}

async function testSupabaseConnection(supabase: SupabaseClient): Promise<ApiTestResult> {
  const { error } = await supabase
    .from("api_test_runs")
    .select("id", { count: "exact", head: true });

  if (error) {
    return {
      test_name: "Supabase connection",
      status: "failed",
      safe_message: safeError("Supabase diagnostic query failed.", error),
      metadata: baseMetadata({ operation: "head_select" }),
    };
  }

  return {
    test_name: "Supabase connection",
    status: "passed",
    safe_message: "Supabase responded to a server-side diagnostic query.",
    metadata: baseMetadata({ operation: "head_select" }),
  };
}

async function testEnterpriseAccessInsert(supabase: SupabaseClient): Promise<ApiTestResult> {
  const stamp = nowStamp();
  const { data, error } = await supabase
    .from("enterprise_access_requests")
    .insert({
      name: "Diagnostic API Test",
      work_email: `api-test-${stamp}@diagnostic.cybersentinels.local`,
      company: "Cyber Sentinels Diagnostics",
      role: "diagnostic",
      company_size: "diagnostic",
      current_problem_category: "diagnostic",
      current_problem: "Diagnostic insert created by the admin API test harness.",
      ai_usage_level: "diagnostic",
      use_case: "api_test_harness",
      message: "diagnostic: true; safe test row cleaned up after insert.",
      status: "diagnostic",
    })
    .select("id")
    .single<{ id: string }>();

  await cleanupById(supabase, "enterprise_access_requests", data?.id);

  if (error) {
    return {
      test_name: "Enterprise Access insert",
      status: "failed",
      safe_message: safeError("Enterprise Access diagnostic insert failed.", error),
      metadata: baseMetadata({ table: "enterprise_access_requests" }),
    };
  }

  return {
    test_name: "Enterprise Access insert",
    status: "passed",
    safe_message: "Diagnostic Enterprise Access row inserted and cleaned up.",
    metadata: baseMetadata({
      table: "enterprise_access_requests",
      diagnostic_record_id: data?.id,
      cleaned_up: true,
    }),
  };
}

async function testPassportCreation(supabase: SupabaseClient): Promise<ApiTestResult> {
  const stamp = nowStamp();
  const { data, error } = await supabase
    .from("passports")
    .insert({
      user_email: "api-test@diagnostic.cybersentinels.local",
      subject_type: "human",
      subject_name: `Diagnostic API Test ${stamp}`,
      verification_status: "pending",
      review_status: "diagnostic",
      trust_score: 50,
    })
    .select("id")
    .single<{ id: string }>();

  await cleanupById(supabase, "passports", data?.id);

  if (error) {
    return {
      test_name: "Passport creation",
      status: "failed",
      safe_message: safeError("Passport diagnostic insert failed.", error),
      metadata: baseMetadata({ table: "passports" }),
    };
  }

  return {
    test_name: "Passport creation",
    status: "passed",
    safe_message: "Diagnostic passport row inserted and cleaned up.",
    metadata: baseMetadata({
      table: "passports",
      diagnostic_record_id: data?.id,
      cleaned_up: true,
    }),
  };
}

async function testEvidenceUploadSchema(supabase: SupabaseClient): Promise<ApiTestResult> {
  const stamp = nowStamp();
  const { data, error } = await supabase
    .from("evidence_files")
    .insert({
      file_name: `diagnostic-api-test-${stamp}.txt`,
      file_url: "diagnostic://api-test-harness",
      media_type: "document",
      evidence_type: "diagnostic",
      notes: "diagnostic: true; safe schema check row cleaned up after insert.",
      uploaded_by: "admin_api_test_harness",
      status: "diagnostic",
      scan_status: "diagnostic",
    })
    .select("id")
    .single<{ id: string }>();

  await cleanupById(supabase, "evidence_files", data?.id);

  if (error) {
    return {
      test_name: "Evidence upload schema check",
      status: "failed",
      safe_message: safeError("Evidence schema diagnostic insert failed.", error),
      metadata: baseMetadata({ table: "evidence_files" }),
    };
  }

  return {
    test_name: "Evidence upload schema check",
    status: "passed",
    safe_message: "Diagnostic evidence row inserted and cleaned up.",
    metadata: baseMetadata({
      table: "evidence_files",
      diagnostic_record_id: data?.id,
      cleaned_up: true,
    }),
  };
}

async function testDecisionInsert(supabase: SupabaseClient): Promise<ApiTestResult> {
  const { data, error } = await supabase
    .from("decisions")
    .insert({
      decision: "manual_review",
      status: "pending",
      actor: "admin_api_test_harness",
      notes: "diagnostic: true; safe decision insert row cleaned up after insert.",
    })
    .select("id")
    .single<{ id: string }>();

  await cleanupById(supabase, "decisions", data?.id);

  if (error) {
    return {
      test_name: "Decision insert",
      status: "failed",
      safe_message: safeError("Decision diagnostic insert failed.", error),
      metadata: baseMetadata({ table: "decisions" }),
    };
  }

  return {
    test_name: "Decision insert",
    status: "passed",
    safe_message: "Diagnostic decision row inserted and cleaned up.",
    metadata: baseMetadata({
      table: "decisions",
      diagnostic_record_id: data?.id,
      cleaned_up: true,
    }),
  };
}

async function testAuditLogInsert(supabase: SupabaseClient): Promise<ApiTestResult> {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      event_type: "api_test_audit_log_insert",
      actor: "admin_api_test_harness",
      metadata: baseMetadata({ table: "audit_logs" }),
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return {
      test_name: "Audit log insert",
      status: "failed",
      safe_message: safeError("Audit log diagnostic insert failed.", error),
      metadata: baseMetadata({ table: "audit_logs" }),
    };
  }

  return {
    test_name: "Audit log insert",
    status: "passed",
    safe_message: "Diagnostic audit log inserted with diagnostic metadata.",
    metadata: baseMetadata({
      table: "audit_logs",
      diagnostic_record_id: data?.id,
    }),
  };
}

async function testSignalInsert(supabase: SupabaseClient): Promise<ApiTestResult> {
  const { data, error } = await supabase
    .from("signals")
    .insert({
      event: "API test signal insert",
      metadata: baseMetadata({ table: "signals" }),
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return {
      test_name: "Signal insert",
      status: "failed",
      safe_message: safeError("Signal diagnostic insert failed.", error),
      metadata: baseMetadata({ table: "signals" }),
    };
  }

  return {
    test_name: "Signal insert",
    status: "passed",
    safe_message: "Diagnostic signal inserted with diagnostic metadata.",
    metadata: baseMetadata({
      table: "signals",
      diagnostic_record_id: data?.id,
    }),
  };
}

function configResult(provider: "Stripe" | "OpenAI" | "World ID"): ApiTestResult {
  const item = getIntegrationRegistry().find((entry) => entry.provider === provider);
  const testName = `${provider} config check`;

  if (!item) {
    return {
      test_name: testName,
      status: "failed",
      safe_message: `${provider} registry definition was not found.`,
      metadata: baseMetadata({ provider }),
    };
  }

  if (item.status === "configured") {
    return {
      test_name: testName,
      status: "passed",
      safe_message: `${provider} is configured. Secret values are hidden.`,
      metadata: baseMetadata({
        provider,
        required_env: item.required_env,
        present_env: item.present_env,
      }),
    };
  }

  return {
    test_name: testName,
    status: "warning",
    safe_message: `${provider} is not configured yet. Optional workflow remains disabled.`,
    metadata: baseMetadata({
      provider,
      required_env: item.required_env,
      missing_env: item.missing_env,
    }),
  };
}

async function runWithCatch(
  testName: string,
  task: () => Promise<ApiTestResult>
): Promise<ApiTestResult> {
  try {
    return await task();
  } catch (error) {
    return {
      test_name: testName,
      status: "failed",
      safe_message: safeError(`${testName} failed unexpectedly.`, error),
      metadata: baseMetadata(),
    };
  }
}

async function persistResults(supabase: SupabaseClient, results: ApiTestResult[]) {
  const { error } = await supabase.from("api_test_runs").insert(
    results.map((result) => ({
      test_name: result.test_name,
      status: result.status,
      safe_message: result.safe_message,
      metadata: result.metadata,
    }))
  );

  if (error) {
    console.warn("API test run persistence failed", error);
  }
}

export async function runCoreApiTests() {
  let supabase: SupabaseClient;

  try {
    supabase = createServiceRoleClient();
  } catch (error) {
    const results: ApiTestResult[] = apiTestNames.map((testName) => ({
      test_name: testName,
      status: testName.includes("config check") ? "warning" : "failed",
      safe_message:
        testName.includes("config check")
          ? "Configuration check could not run because Supabase service credentials are unavailable."
          : safeError("Supabase service credentials are unavailable.", error),
      metadata: baseMetadata(),
    }));

    return results;
  }

  const results = [
    await runWithCatch("Supabase connection", () => testSupabaseConnection(supabase)),
    await runWithCatch("Enterprise Access insert", () =>
      testEnterpriseAccessInsert(supabase)
    ),
    await runWithCatch("Passport creation", () => testPassportCreation(supabase)),
    await runWithCatch("Evidence upload schema check", () =>
      testEvidenceUploadSchema(supabase)
    ),
    await runWithCatch("Decision insert", () => testDecisionInsert(supabase)),
    await runWithCatch("Audit log insert", () => testAuditLogInsert(supabase)),
    await runWithCatch("Signal insert", () => testSignalInsert(supabase)),
    configResult("Stripe"),
    configResult("OpenAI"),
    configResult("World ID"),
  ];

  await persistResults(supabase, results);

  return results;
}

export async function readLatestApiTestRuns() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("api_test_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("API test runs read failed", error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.warn("API test runs unavailable", error);
    return [];
  }
}
