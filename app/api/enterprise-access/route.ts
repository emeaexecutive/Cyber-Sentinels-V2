import { createClient } from "@supabase/supabase-js";
import {
  checkRequestRateLimit,
  getClientIp,
  getTurnstileTokenFromForm,
  isTurnstileConfigured,
  isTurnstileSiteKeyConfigured,
  verifyTurnstileToken,
} from "@/lib/bot-protection";
import {
  createRequestDemoHandler,
  type RequestDemoLogFields,
  type RequestDemoPayload,
} from "@/lib/request-demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleRequestDemo = createRequestDemoHandler({
  isRateLimited(req) {
    return Boolean(checkRequestRateLimit(req, "/api/enterprise-access", 6, 60_000));
  },
  getClientIp,
  getTurnstileToken: getTurnstileTokenFromForm,
  verifyTurnstile: verifyTurnstileToken,
  getConfig() {
    return {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      turnstileSecretConfigured: isTurnstileConfigured(),
      turnstileSiteKeyConfigured: isTurnstileSiteKeyConfigured(),
    };
  },
  createPersistence(config) {
    const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return {
      async insertRequest(payload: RequestDemoPayload) {
        const { error } = await supabase
          .from("enterprise_access_requests")
          .insert([payload]);
        return { error };
      },
      async insertInterestSignal(payload) {
        const { error } = await supabase
          .from("interest_signals")
          .insert(payload);
        return { error };
      },
    };
  },
  logError(event: string, fields: RequestDemoLogFields) {
    console.error(event, fields);
  },
});

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  return handleRequestDemo(req, correlationId);
}
