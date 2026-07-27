import { NextResponse } from "next/server";
import { getMissingEnv } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getConsentConfigurationStatus } from "@/src/lib/config/consent-config";

export const dynamic = "force-dynamic";

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export async function GET() {
  const generatedAt = new Date().toISOString();
  const runtimeCommit = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const missingEnvironment = getMissingEnv([...requiredEnvironment]);
  const consentConfig = getConsentConfigurationStatus();

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

  if (!consentConfig.ready) {
    return NextResponse.json(
      {
        schemaVersion: "readiness-v2",
        status: "NOT_READY",
        reasonCode: "CONSENT_CONFIGURATION_NOT_READY",
        checks: {
          environment: "READY",
          enterpriseTrustArchitecture: "NOT_CHECKED",
          repositoryRuntime: runtimeCommit ? "VERIFIED_FROM_RUNTIME" : "NOT_CONFIGURED",
          externalControls: "BLOCKED",
        },
        runtime: { commitSha: runtimeCommit },
        consent: consentConfig,
        externalControls: {
          state: "BLOCKED",
          reasonCode: "AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED",
        },
        generatedAt,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const { count, error } = await createServiceRoleClient()
      .from("trust_domain_versions")
      .select("domain_key", { count: "exact", head: true })
      .eq("version", "1.0.0")
      .eq("active", true);

    if (error) {
      const migrationMissing = error.code === "42P01";
      return NextResponse.json(
        {
          schemaVersion: "readiness-v2",
          status: migrationMissing ? "NOT_READY" : "BLOCKED",
          reasonCode: migrationMissing
            ? "EPIC_18_MIGRATION_NOT_DEPLOYED"
            : "AUTHORITATIVE_DATA_PLANE_UNAVAILABLE",
          checks: {
            environment: "READY",
            enterpriseTrustArchitecture: migrationMissing ? "NOT_READY" : "BLOCKED",
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

    const architectureReady = count === 10;
    return NextResponse.json(
      {
        schemaVersion: "readiness-v2",
        status: architectureReady ? "READY" : "NOT_READY",
        reasonCode: architectureReady
          ? "ENTERPRISE_TRUST_ARCHITECTURE_AVAILABLE"
          : "ENTERPRISE_TRUST_DOMAIN_REGISTRY_INCOMPLETE",
        checks: {
          environment: "READY",
          enterpriseTrustArchitecture: architectureReady ? "READY" : "NOT_READY",
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
      { status: architectureReady ? 200 : 503, headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        schemaVersion: "readiness-v2",
        status: "BLOCKED",
        reasonCode: "AUTHORITATIVE_DATA_PLANE_UNAVAILABLE",
        checks: {
          environment: "READY",
          enterpriseTrustArchitecture: "BLOCKED",
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
}
