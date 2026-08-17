import { NextResponse } from "next/server";
import { getMissingEnv } from "@/lib/env";
import { buildEnterpriseTrustReadinessResponse, evaluateEnterpriseTrustRegistry } from "@/lib/readiness/enterprise-trust-registry";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

  try {
    const { data, error } = await createServiceRoleClient()
      .from("trust_domain_versions")
      .select("domain_key, version, active");

    const readiness = buildEnterpriseTrustReadinessResponse(
      evaluateEnterpriseTrustRegistry(data, error),
      runtimeCommit,
      generatedAt,
    );
    return NextResponse.json(readiness.body, {
      status: readiness.statusCode,
      headers: { "cache-control": "no-store" },
    });
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
