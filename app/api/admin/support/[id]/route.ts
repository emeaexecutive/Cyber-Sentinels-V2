import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const statuses = new Set(["new", "triaged", "in_progress", "fix_ready", "verified", "closed"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await requireAdminApiAccess(request, supabase);
  if (!access.ok) return access.response;

  const form = await request.formData();
  const status = String(form.get("status") ?? "");
  if (!statuses.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid support status." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("support_issues")
    .update({
      status,
      admin_notes: String(form.get("admin_notes") ?? "").trim().slice(0, 8000) || null,
      verification_notes: String(form.get("verification_notes") ?? "").trim().slice(0, 8000) || null,
      reviewed_by: access.user.email ?? access.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not update support issue." }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/admin/support/${id}`, request.url), { status: 303 });
}

