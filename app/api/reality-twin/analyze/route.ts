import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { createRealityTwin } from "@/lib/trust-engine/realityTwin";
import {
  syntheticCounterpartAuditEvents,
  syntheticCounterpartSignals,
  type SyntheticCounterpartInput,
} from "@/lib/trust-engine/syntheticCounterpart";

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
        { ok: false, error: "Invalid Reality Twin request" },
        { status: 400 }
      );
    }

    const rawInputs =
      typeof body.signal_inputs === "object" && body.signal_inputs !== null
        ? (body.signal_inputs as Record<string, unknown>)
        : {};
    const subjectId = getOptionalText(body.subject_id);
    const input: SyntheticCounterpartInput = {
      hpg: getScore(rawInputs.hpg),
      origin_dna: getScore(rawInputs.origin_dna),
      reality_chain: getScore(rawInputs.reality_chain),
      trust_timeline: getScore(rawInputs.trust_timeline),
      trust_graph: getScore(rawInputs.trust_graph),
      voice_presence: getScore(rawInputs.voice_presence),
      video_presence: getScore(rawInputs.video_presence),
      behavior_pattern: getScore(rawInputs.behavior_pattern),
      public_profile_exposure: getScore(rawInputs.public_profile_exposure),
      social_signal_density: getScore(rawInputs.social_signal_density),
      media_exposure: getScore(rawInputs.media_exposure),
      agent_activity: getScore(rawInputs.agent_activity),
      evidence_chain_strength: getScore(rawInputs.evidence_chain_strength),
    };
    const result = createRealityTwin(input);

    try {
      const supabase = await createClient();
      await createSignal(supabase, "reality_twin_created");
      if (["elevated", "high", "critical"].includes(result.clone_risk)) {
        await createSignal(supabase, "synthetic_clone_risk_detected");
      }
      if (result.identity_exposure >= 70) {
        await createSignal(supabase, "identity_exposure_increased");
      }
      await createSignal(supabase, "reality_resilience_changed");
      await createAuditLog(
        supabase,
        "reality_twin_created",
        subjectId ?? "reality-twin-api",
        {
          clone_risk: result.clone_risk,
          reality_resilience: result.reality_resilience,
        }
      );
      await createAuditLog(
        supabase,
        "synthetic_counterpart_evaluated",
        subjectId ?? "reality-twin-api",
        {
          clone_risk: result.clone_risk,
          reality_resilience: result.reality_resilience,
        }
      );
    } catch {
      // Keep analysis available before production signal/audit tables are ready.
    }

    return NextResponse.json({
      ok: true,
      clone_risk: result.clone_risk,
      reality_resilience: result.reality_resilience,
      recommendations: result.recommendations,
      signals: syntheticCounterpartSignals,
      audit_events: syntheticCounterpartAuditEvents,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid Reality Twin request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not analyze Reality Twin" },
      { status: 500 }
    );
  }
}
