import { getApprovedAuthOrigin, isApprovedSameOriginRequest, validateNewPassword } from "./password-recovery";
import { checkRequestRateLimit, getClientIp, getExpectedTurnstileHostname, getTurnstileTokenFromJson, verifyTurnstileToken } from "../bot-protection";
import { authChallengeActions, type ProtectedAuthOperation } from "./login-experience";
import { readBoundedText } from "../qualification/bounded-body";

export { authChallengeActions } from "./login-experience";
export type { ProtectedAuthOperation } from "./login-experience";
type Input = { operation: ProtectedAuthOperation; email: string; password: string; redirectTo: string };
type Result = { error: { code?: string; message: string } | null; data?: { session?: unknown } };
const maxAuthRequestBytes = 16 * 1024;

// The dependency is not constructed or invoked until Siteverify succeeds.
export function createProtectedAuthHandler(execute: (input: Input) => Promise<Result>) {
  return async function POST(request: Request) {
    const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
    const origin = getApprovedAuthOrigin(request.url);
    if (!origin || !isApprovedSameOriginRequest(request)) return reply({ error: { message: "Request could not be verified." } }, 403);
    const limited = checkRequestRateLimit(request, "/api/auth/submit", 12, 60_000);
    if (limited) return limited;
    let text: string;
    try {
      text = await readBoundedText(request.body, maxAuthRequestBytes);
    } catch (error) {
      if (error instanceof RangeError && error.message === "BODY_TOO_LARGE") {
        return reply({ error: { message: "Request body is too large." } }, 413);
      }
      return reply({ error: { message: "Invalid authentication request." } }, 400);
    }
    let body: Record<string, unknown> | null;
    try {
      const parsed: unknown = JSON.parse(text);
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return reply({ error: { message: "Invalid authentication request." } }, 400);
    }
    if (!body) return reply({ error: { message: "Invalid authentication request." } }, 400);
    const operation = body?.operation as ProtectedAuthOperation;
    if (!Object.hasOwn(authChallengeActions, operation)) return reply({ error: { message: "Invalid authentication operation." } }, 400);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length > 1024 ||
      (operation === "password" && !password) || (operation === "signup" && validateNewPassword(password))) {
      return reply({ error: { message: "Enter valid account details." } }, 400);
    }
    const check = await verifyTurnstileToken(getTurnstileTokenFromJson(body), getClientIp(request), getExpectedTurnstileHostname(new URL(request.url).hostname), authChallengeActions[operation]);
    const correlationId = crypto.randomUUID();
    console.info("Protected auth security check completed.", { correlationId, operation, ok: check.ok, reason: check.reason, hostname: check.hostname ?? null, action: check.action ?? null, expectedAction: authChallengeActions[operation], challengeTimestamp: check.challengeTimestamp ?? null });
    if (!check.ok) return reply({ error: { code: check.reason, message: "Security check failed. Please complete it again." }, correlationId }, 400);
    try {
      const result = await execute({ operation, email, password, redirectTo: new URL("/auth/callback", origin).toString() });
      if (result.error) return reply({ error: { code: result.error.code, message: "Authentication could not be completed. Check your details or try again later." } }, 400);
      return reply({ error: null, data: { session: result.data?.session ?? null } }, 200);
    } catch {
      return reply({ error: { message: "Authentication is temporarily unavailable." } }, 503);
    }
  };
}
