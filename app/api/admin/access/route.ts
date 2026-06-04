import { NextResponse } from "next/server";
import {
  getAdminCookieOptions,
  adminVerifiedCookieName,
} from "@/lib/admin-auth";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
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
    const access = await requireAdminApiAccess(req, supabase, {
      requireCookie: false,
      audit: false,
    });

    if (!access.ok) {
      console.error("Admin access denied before code check.");
      return access.response;
    }

    const user = access.user;
    const actor = user.email ?? user.id;
    const deniedUrl = new URL("/command-center", req.url);

    const formData = await req.formData();
    const submittedCode = String(formData.get("access_code") ?? "");
    const expectedCode = process.env.ADMIN_ACCESS_CODE ?? "";

    if (!expectedCode || submittedCode !== expectedCode) {
      console.error("Admin access code check failed.", {
        missingAdminAccessCode: !expectedCode,
        actor,
      });
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

    const response = NextResponse.redirect(new URL("/back-office", req.url), {
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

    console.error("Admin access route failed.", error);

    return NextResponse.redirect(
      new URL("/command-center?message=admin_access_required", req.url),
      {
        status: 303,
      }
    );
  }
}
