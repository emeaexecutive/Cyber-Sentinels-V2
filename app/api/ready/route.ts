import { NextResponse } from "next/server";
import { getMissingEnv } from "@/lib/env";
import { buildEnterpriseTrustReadinessResponse, evaluateEnterpriseTrustRegistry } from "@/lib/readiness/enterprise-trust-registry";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { publicApiEnvironmentMetadata } from "@/lib/public-api/v1/environment";

export const dynamic = "force-dynamic";

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PUBLIC_API_KEY_ROTATION_SECRET",
] as const;

export async function GET() {
  const generatedAt = new Date().toISOString();
  const runtimeCommit = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const missingEnvironment = getMissingEnv([...requiredEnvironment]);
  const publicApiEnvironment = publicApiEnvironmentMetadata();
  const rotationSecretValid = new TextEncoder().encode(process.env.PUBLIC_API_KEY_ROTATION_SECRET?.trim() ?? "").byteLength >= 32;

  if (missingEnvironment.length > 0) {
    return NextResponse.json(
      {
        schemaVersion: "readiness-v2",
        status: "NOT_READY",
        reasonCode: "REQUIRED_RUNTIME_CONFIGURATION_NOT_PRESENT",
        checks: {
          environment: "NOT_READY",
          enterpriseTrustArchitecture: "NOT_CHECKED",
          repositoryRuntime: runtimeCommit ? "VERIFIED_FROM_RUNTIME" : "NOT_CONFIGURED",
          externalControls: "BLOCKED",
        },
        runtime: { commitSha: runtimeCommit },
        externalControls: {
          state: "BLOCKED",
          reasonCode: "AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED",
        },
        generatedAt,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  if (!publicApiEnvironment.valid || !rotationSecretValid) {
    return NextResponse.json({
      schemaVersion: "readiness-v3",
      status: "NOT_READY",
      reasonCode: "CONFIGURATION_INVALID",
      diagnosticState: "CONFIGURATION_INVALID",
      checks: { process: "PROCESS_HEALTHY", environment: "CONFIGURATION_INVALID", dataPlane: "NOT_CHECKED", apiAuthentication: "NOT_CHECKED", enterpriseTrustArchitecture: "NOT_CHECKED" },
      publicApiEnvironment,
      runtime: { commitSha: runtimeCommit },
      generatedAt,
    }, { status: 503, headers: { "cache-control": "no-store" } });
  }

  try {
    const db = createServiceRoleClient();
    const [{ data, error }, apiAuthentication, apiContract] = await Promise.all([
      db.from("trust_domain_versions").select("domain_key, version, active"),
      db.from("api_keys").select("id,tenant_id,client_id,key_prefix,key_hash,status,scopes,expires_at,revoked_at,created_by,rotation_request_id,authority_management_boundary").limit(1),
      db.rpc("public_api_readiness_v1"),
    ]);

    if (apiAuthentication.error || apiContract.error || !(apiContract.data as { ready?: boolean } | null)?.ready) {
      const errorCode = apiAuthentication.error?.code ?? apiContract.error?.code ?? "";
      const migrationRequired = ["42P01", "42703", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(errorCode)
        || apiContract.data !== null;
      return NextResponse.json({
        schemaVersion: "readiness-v3",
        status: "NOT_READY",
        reasonCode: migrationRequired ? "MIGRATION_REQUIRED" : "API_CONTRACT_UNAVAILABLE",
        diagnosticState: migrationRequired ? "MIGRATION_REQUIRED" : "API_CONTRACT_UNAVAILABLE",
        checks: { process: "PROCESS_HEALTHY", environment: "READY", dataPlane: "DATA_PLANE_UNAVAILABLE", apiAuthentication: apiAuthentication.error ? "NOT_READY" : "READY", canonicalPersistence: migrationRequired ? "MIGRATION_REQUIRED" : "NOT_READY", authority: "NOT_READY", humanReview: "NOT_READY", rateLimiting: "NOT_READY", apiKeyRotation: "NOT_READY", enterpriseTrustArchitecture: "NOT_CHECKED" },
        publicApiEnvironment,
        runtime: { commitSha: runtimeCommit },
        generatedAt,
      }, { status: 503, headers: { "cache-control": "no-store" } });
    }

    const readiness = buildEnterpriseTrustReadinessResponse(
      evaluateEnterpriseTrustRegistry(data, error),
      runtimeCommit,
      generatedAt,
    );
    const ready = readiness.statusCode === 200;
    return NextResponse.json({
      ...readiness.body,
      schemaVersion: "readiness-v3",
      diagnosticState: ready ? "PROCESS_HEALTHY" : readiness.body.reasonCode === "EPIC_18_MIGRATION_NOT_DEPLOYED" ? "MIGRATION_REQUIRED" : "DATA_PLANE_UNAVAILABLE",
      checks: { ...readiness.body.checks, process: "PROCESS_HEALTHY", dataPlane: ready ? "READY" : "DATA_PLANE_UNAVAILABLE", apiAuthentication: "READY", canonicalPersistence: "READY", authority: "READY", humanReview: "READY", rateLimiting: "READY", apiKeyRotation: "READY" },
      publicApiEnvironment,
    }, {
      status: readiness.statusCode,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        schemaVersion: "readiness-v3",
        status: "BLOCKED",
        reasonCode: "DATA_PLANE_UNAVAILABLE",
        diagnosticState: "DATA_PLANE_UNAVAILABLE",
        checks: {
          process: "PROCESS_HEALTHY",
          environment: "READY",
          dataPlane: "DATA_PLANE_UNAVAILABLE",
          apiAuthentication: "NOT_CHECKED",
          enterpriseTrustArchitecture: "BLOCKED",
          repositoryRuntime: runtimeCommit ? "VERIFIED_FROM_RUNTIME" : "NOT_CONFIGURED",
          externalControls: "BLOCKED",
        },
        runtime: { commitSha: runtimeCommit },
        publicApiEnvironment,
        externalControls: {
          state: "BLOCKED",
          reasonCode: "AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED",
        },
        generatedAt,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
