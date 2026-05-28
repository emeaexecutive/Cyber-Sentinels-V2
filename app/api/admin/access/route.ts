import { NextResponse } from "next/server";
import {
  getAdminCookieOptions,
  isAdminAllowlisted,
  adminVerifiedCookieName,
} from "@/lib/admin-auth";
import {
  configurationError,
  getRequestRiskFields,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

async function recordAdminAccessAttempt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventType: "admin_access_granted" | "admin_access_denied",
  signal: "Admin access granted" | "Admin access denied",
  actor: string,
  req: Request
) {
  const metadata = getRequestRiskFields(req);

  try {
    await createAuditLog(supabase, eventType, actor, metadata);
    await createSignal(supabase, signal);
  } catch (error) {
    // Safe beta logging only. Never log or expose ADMIN_ACCESS_CODE.
    console.warn("Admin access audit write failed", error);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login?next=/admin/access", req.url), {
        status: 303,
      });
    }

    const actor = user.email ?? user.id;
    const deniedUrl = new URL("/admin/access?denied=1", req.url);

    if (!isAdminAllowlisted(user.email)) {
      await recordAdminAccessAttempt(
        supabase,
        "admin_access_denied",
        "Admin access denied",
        actor,
        req
      );

      return NextResponse.redirect(deniedUrl, { status: 303 });
    }

    const formData = await req.formData();
    const submittedCode = String(formData.get("access_code") ?? "");
    const expectedCode = process.env.ADMIN_ACCESS_CODE ?? "";

    if (!expectedCode || submittedCode !== expectedCode) {
      await recordAdminAccessAttempt(
        supabase,
        "admin_access_denied",
        "Admin access denied",
        actor,
        req
      );

      return NextResponse.redirect(deniedUrl, { status: 303 });
    }

    await recordAdminAccessAttempt(
      supabase,
      "admin_access_granted",
      "Admin access granted",
      actor,
      req
    );

    const response = NextResponse.redirect(new URL("/admin", req.url), {
      status: 303,
    });
    response.cookies.set(
      adminVerifiedCookieName,
      "true",
      getAdminCookieOptions()
    );

    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Server configuration is incomplete."
    ) {
      return configurationError();
    }

    return NextResponse.redirect(new URL("/admin/access?denied=1", req.url), {
      status: 303,
    });
  }
}
