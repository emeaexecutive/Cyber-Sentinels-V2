import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  canInviteMember,
  teamAccessRoles,
  type TeamAccessRole,
} from "@/lib/team/accessControl";

function validateEmail(value: unknown) {
  if (typeof value !== "string" || value.length > 254) {
    throw new Error("Invalid input");
  }

  const email = value.trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!valid) {
    throw new Error("Invalid input");
  }

  return email;
}

function validateRole(value: unknown) {
  if (typeof value !== "string" || !teamAccessRoles.includes(value as TeamAccessRole)) {
    throw new Error("Invalid input");
  }

  return value as TeamAccessRole;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid invite request" },
        { status: 400 }
      );
    }

    const invitedEmail = validateEmail(body.email);
    const role = validateRole(body.role);
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id,role,member_email")
      .eq("member_email", user.email)
      .limit(1)
      .maybeSingle();
    const inviterRole = typeof membership?.role === "string" ? membership.role : "owner";

    // Future: enforce team_id ownership checks and send a signed email invite.
    if (!canInviteMember(inviterRole)) {
      return NextResponse.json(
        { ok: false, error: "Invite permission required" },
        { status: 403 }
      );
    }

    await createSignal(supabase, "team_invite_created");
    await createAuditLog(supabase, "team_invite_created", user.email, {
      invited_email: invitedEmail,
      role,
      team_id: membership?.team_id ?? "pending_team_id",
      email_sent: false,
    });

    return NextResponse.json({
      ok: true,
      invitation_status: "pending",
      invited_email: invitedEmail,
      role,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid invite request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not create invite" },
      { status: 500 }
    );
  }
}
