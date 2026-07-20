import { POST as saveConsent } from "../route";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const replacement = new Request(request.url.replace(/\/withdraw$/, ""), { method: "POST", headers: request.headers, body: JSON.stringify({ ...body, action: "WITHDRAW", source: "TRUST_PREFERENCES_WITHDRAWAL" }) });
  const response = await saveConsent(replacement);
  for (const name of ["_ga", "_gid", "_gat", "_fbp", "ph_phc", "plausible_session"]) response.cookies.set(name, "", { path: "/", maxAge: 0, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}
