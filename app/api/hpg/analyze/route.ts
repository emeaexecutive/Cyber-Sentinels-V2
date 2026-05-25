import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  hpgAuditEvents,
  hpgSignalEvents,
  overallPresenceGenome,
  type HumanPresenceGenomeInput,
} from "@/lib/trust-engine/humanPresenceGenome";

function getOptionalText(value: unknown, maxLength = 160) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value;
}

function getScore(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error("Invalid input");
  }

  return Math.max(0, Math.min(100, value));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid HPG analysis request" },
        { status: 400 }
      );
    }

    const signalInputs =
      typeof body.signal_inputs === "object" && body.signal_inputs !== null
        ? (body.signal_inputs as Record<string, unknown>)
        : {};
    const subjectId = getOptionalText(body.subject_id);
    const input: HumanPresenceGenomeInput = {
      face: getScore(signalInputs.face),
      voice: getScore(signalInputs.voice),
      behavior: getScore(signalInputs.behavior),
      timeline: getScore(signalInputs.timeline),
      interaction: getScore(signalInputs.interaction),
    };
    const result = overallPresenceGenome(input);

    try {
      const supabase = await createClient();
      await createSignal(supabase, "hpg_created");
      if (result.state !== "stable") {
        await createSignal(supabase, "presence_shift_detected");
      }
      if (result.synthetic_deviation >= 40) {
        await createSignal(supabase, "synthetic_deviation_detected");
      }
      await createAuditLog(
        supabase,
        "human_presence_genome_created",
        subjectId ?? "hpg-api",
        {
          state: result.state,
          recommended_action: result.recommended_action,
        }
      );
    } catch {
      // HPG analysis should remain available before production logging and
      // signal tables are fully provisioned.
    }

    return NextResponse.json({
      ok: true,
      presence_confidence: result.presence_confidence,
      human_signature: result.human_signature,
      synthetic_deviation: result.synthetic_deviation,
      recommended_action: result.recommended_action,
      signals: hpgSignalEvents,
      audit_events: hpgAuditEvents,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid HPG analysis request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not analyze Human Presence Genome" },
      { status: 500 }
    );
  }
}
