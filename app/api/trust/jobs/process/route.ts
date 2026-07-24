import { timingSafeEqual } from "node:crypto";
import {
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustResponse,
} from "@/src/lib/continuous-trust/http";
import { processContinuousTrustJobs } from "@/src/lib/continuous-trust/signal-service";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization");
  if (!secret || !supplied?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied.slice(7));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function GET(request: Request) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    if (!authorized(request)) {
      return continuousTrustResponse({ ok: false, code: "WORKER_AUTHORIZATION_DENIED", error: "Worker authorization denied." }, 401, correlationId);
    }
    const result = await processContinuousTrustJobs(10);
    return continuousTrustResponse({ ok: true, result }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
