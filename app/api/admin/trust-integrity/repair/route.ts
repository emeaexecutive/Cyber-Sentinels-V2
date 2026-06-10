import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import {
  runTrustIntegrityRepair,
  type TrustIntegrityRepairAction,
} from "@/lib/trust-integrity/repair";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const actions = new Set<TrustIntegrityRepairAction>([
  "audit",
  "rebuild_timelines",
  "rebuild_relationships",
  "regenerate_receipts",
  "repair_replay_ordering",
  "run_all",
]);

function wantsHtml(req: Request) {
  return (req.headers.get("accept") ?? "").includes("text/html");
}

async function getAction(req: Request): Promise<TrustIntegrityRepairAction> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { action?: unknown };
    const action = typeof body.action === "string" ? body.action : "audit";

    return actions.has(action as TrustIntegrityRepairAction)
      ? (action as TrustIntegrityRepairAction)
      : "audit";
  }

  const formData = await req.formData().catch(() => new FormData());
  const action = String(formData.get("action") ?? "audit");

  return actions.has(action as TrustIntegrityRepairAction)
    ? (action as TrustIntegrityRepairAction)
    : "audit";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  try {
    const action = await getAction(req);
    const result = await runTrustIntegrityRepair(action);

    if (wantsHtml(req)) {
      return NextResponse.redirect(
        new URL(`/admin/trust-integrity?ran=${encodeURIComponent(action)}`, req.url),
        { status: 303 }
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Trust integrity repair failed.", error);

    if (wantsHtml(req)) {
      return NextResponse.redirect(
        new URL("/admin/trust-integrity?error=repair_failed", req.url),
        { status: 303 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Trust integrity repair is temporarily unavailable" },
      { status: 503 }
    );
  }
}
