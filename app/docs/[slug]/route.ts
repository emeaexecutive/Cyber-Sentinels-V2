import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const allowedDocs = new Set([
  "DEMO_VIDEO_SCRIPT.md",
  "DEMO_VIDEO_STORYBOARD.md",
  "PILOT_WALKTHROUGH_SCRIPT.md",
  "FOUNDER_DEMO_SCRIPT.md",
  "FOUNDER_OPERATIONAL_NARRATIVES.md",
  "FOUNDER_OPERATIONAL_RHYTHM.md",
  "CONTINUOUS_TRUST_LIFECYCLE.md",
  "DESIGN_PARTNER_GUIDE.md",
  "ENTERPRISE_ONBOARDING.md",
  "DEPLOYMENT_CHECKLIST.md",
  "PROVIDER_SETUP_GUIDE.md",
  "SPRINT_12_1_ACCEPTANCE.md",
  "CATEGORY_POSITIONING.md",
  "VISUAL_SYSTEM.md",
  "TRUST_EVIDENCE_PACKS.md",
  "SPRINT_12_2_ACCEPTANCE.md",
  "RELEASE_READINESS.md",
  "ENTERPRISE_UI_CONSISTENCY.md",
  "SPRINT_12_3_ACCEPTANCE.md",
  "RC4_VALIDATION.md",
  "RC4_PROVIDER_REALITY.md",
  "RC4_PERFORMANCE.md",
  "RC4_SECURITY.md",
  "RC4_ENTERPRISE_STORY.md",
  "RC4_RELEASE_SCORECARD.md",
  "SPRINT_13_4_ACCEPTANCE.md",
  "TRUST_MEMORY_RC5.md",
  "EVIDENCE_GRAPH_RC5.md",
  "VALIDATION_CENTER.md",
  "PROVIDER_OPERATIONS.md",
  "ENTERPRISE_PROOF_PACK.md",
  "UX_SIMPLIFICATION.md",
  "API_MATURITY.md",
  "SPRINT_14_1_ACCEPTANCE.md",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!allowedDocs.has(slug)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "docs", slug);
  const body = await readFile(filePath, "utf8");
  const download = new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      ...(download ? { "Content-Disposition": `attachment; filename="${slug}"` } : {}),
    },
  });
}
