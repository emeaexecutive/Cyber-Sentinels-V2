import { NextResponse } from "next/server";
import { summarizeIntegrationStatus } from "@/lib/integrations/registry";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    status: "ok",
    integrations: summarizeIntegrationStatus(),
    timestamp: new Date().toISOString(),
  });
}
