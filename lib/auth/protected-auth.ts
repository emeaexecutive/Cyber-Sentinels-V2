import { getApprovedAuthOrigin, isApprovedSameOriginRequest, validateNewPassword } from "./password-recovery";
import { checkRequestRateLimit, getClientIp, getExpectedTurnstileHostname, getTurnstileTokenFromJson, verifyTurnstileToken } from "../bot-protection";

export type ProtectedAuthOperation = "password" | "signup" | "resend" | "magic-link";
export const authChallengeActions = { password: "login", signup: "signup", resend: "signup", "magic-link": "login" } as const;
type Input = { operation: ProtectedAuthOperation; email: string; password: string; redirectTo: string };
type Result = { error: { code?: string; message: string } | null; data?: { session?: unknown } };

// The dependency is not constructed or invoked until Siteverify succeeds.
export function createProtectedAuthHandler(execute: (input: Input) => Promise<Result>) {
  return async function POST(request: Request) {
    const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
    const origin = getApprovedAuthOrigin(request.url);
    if (!origin || !isApprovedSameOriginRequest(request)) return reply({ error: { message: "Request could not be verified." } }, 403);
    const limited = checkRequestRateLimit(request, "/api/auth/submit", 12, 60_000);
    if (limited) return limited;
    const body = await request.json().catch(() => null);
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
