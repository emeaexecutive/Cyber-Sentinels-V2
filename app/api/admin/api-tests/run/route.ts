import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { runCoreApiTests } from "@/lib/api-tests/harness";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function wantsHtml(req: Request) {
  return (req.headers.get("accept") ?? "").includes("text/html");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const results = await runCoreApiTests();

  if (wantsHtml(req)) {
    return NextResponse.redirect(new URL("/admin/api-tests?ran=1", req.url), {
      status: 303,
    });
  }

  return NextResponse.json({ ok: true, results });
}
