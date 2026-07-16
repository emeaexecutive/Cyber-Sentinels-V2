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
  "BUYER_JOURNEYS.md",
  "VISUAL_SYSTEM.md",
  "TRUST_EVIDENCE_PACKS.md",
  "SPRINT_12_2_ACCEPTANCE.md",
  "ENTERPRISE_PILOT_CHECKLIST.md",
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
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!allowedDocs.has(slug)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "docs", slug);
  const body = await readFile(filePath, "utf8");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
