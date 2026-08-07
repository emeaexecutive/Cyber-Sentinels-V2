import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { buildPlatformHealth } from "@/lib/core/platform-health";
import {
  buildEnterpriseOperationsSnapshot,
  designPartnerOperationalFlow,
  enterpriseControlCatalog,
  enterpriseLifecycleCatalog,
  securityReviewCatalog,
} from "@/lib/enterprise-operations";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function correlationId(request: Request) {
  return (
    request.headers.get("x-correlation-id")
      ?.trim()
      .replace(/[^a-zA-Z0-9._:-]/g, "")
      .slice(0, 120) || crypto.randomUUID()
  );
}

function explicitMaintenanceMode() {
  const value = process.env.ENTERPRISE_MAINTENANCE_MODE?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function GET(request: Request) {
  const requestCorrelationId = correlationId(request);
  const supabase = await createClient();
  const access = await requireAdminApiAccess(request, supabase);
  if (!access.ok) return access.response;

  const health = buildPlatformHealth({ authConfigured: true, apiAvailable: true });
  const snapshot = buildEnterpriseOperationsSnapshot({
    platformHealth: health,
    correlationId: requestCorrelationId,
    maintenanceMode: explicitMaintenanceMode(),
  });

  const response = NextResponse.json({
    ok: true,
    snapshot,
    controls: enterpriseControlCatalog,
    lifecycles: enterpriseLifecycleCatalog,
    securityReview: securityReviewCatalog,
    designPartnerFlow: designPartnerOperationalFlow,
  });
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("x-correlation-id", requestCorrelationId);
  response.headers.set("x-release-version", snapshot.releaseVersion ?? "unavailable");
  return response;
}
