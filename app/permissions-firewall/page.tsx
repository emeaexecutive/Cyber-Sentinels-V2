import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  demoPermissionDecisions,
  evaluatePermissionsFirewall,
  highRiskActions,
  permissionSignals,
} from "@/lib/trust-engine/permissionsFirewall";
import { permissionScopes } from "@/lib/trust-engine/agentRegistry";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

function badgeClass(decision: string) {
  if (["deny", "revoke"].includes(decision)) return "border-red-700 text-red-200";
  if (["step_up_required", "manual_review"].includes(decision)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-emerald-700 text-emerald-200";
}

export default async function PermissionsFirewallPage() {
  const supabase = await createClient();
  const { data: signals } = await supabase
    .from("signals")
    .select("id,event,created_at")
    .or(
      "event.ilike.%permission%,event.ilike.%agent_permission%,event.ilike.%revoked%"
    )
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<Signal[]>();
  const demos = demoPermissionDecisions.map((demo) => ({
    ...demo,
    result: evaluatePermissionsFirewall(demo.input),
  }));

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/agent-registry", "Agent Registry"],
            ["/developer-console", "Developer Console"],
            ["/mission-control", "Mission Control"],
            ["/step-up-verification", "Step-Up Verification"],
            ["/revocation-engine", "Revocation Engine"],
            ["/admin", "Admin"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Permission enforcement
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Permissions Firewall™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Permission is not granted by identity alone. It is earned by trust
            evidence.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {demos.map((demo) => (
            <div
              key={demo.subject}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{demo.subject}</p>
              <h2 className="mt-2 text-xl font-semibold">
                {demo.input.requested_action}
              </h2>
              <span
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs ${badgeClass(
                  demo.result.decision
                )}`}
              >
                {demo.result.decision}
              </span>
              <div className="mt-4 flex flex-wrap gap-2">
                {demo.result.reason_codes.length ? (
                  demo.result.reason_codes.map((reason) => (
                    <code
                      key={reason}
                      className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                    >
                      {reason}
                    </code>
                  ))
                ) : (
                  <code className="rounded-full border border-emerald-700 px-2 py-1 text-xs text-emerald-200">
                    permission_allowed
                  </code>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">High-Risk Actions</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {highRiskActions.map((action) => (
                <code
                  key={action}
                  className="rounded-full border border-amber-700 px-2.5 py-1 text-xs text-amber-200"
                >
                  {action}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Agent Permissions</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {permissionScopes.map((scope) => (
                <code
                  key={scope}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {scope}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Permission Signals</h2>
            <div className="mt-5 space-y-3">
              {signals?.length
                ? signals.map((signal) => (
                    <div
                      key={signal.id}
                      className="rounded-lg border border-zinc-800 bg-black p-3"
                    >
                      <p className="text-sm text-zinc-300">{signal.event}</p>
                    </div>
                  ))
                : permissionSignals.slice(0, 5).map((signal) => (
                    <div
                      key={signal}
                      className="rounded-lg border border-zinc-800 bg-black p-3"
                    >
                      <p className="text-sm text-zinc-300">{signal}</p>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Human Step-Up",
              "High-risk actions below trust threshold require stronger human approval.",
            ],
            [
              "Step-Up Verification",
              "When the firewall returns step_up_required, Cyber Sentinels requests stronger proof before permission.",
            ],
            [
              "API Key Access",
              "API keys need explicit scopes and revoked keys are blocked.",
            ],
            [
              "Revocation Rules",
              "Critical risk, policy violations and revoked subjects can remove access through the revoke decision.",
            ],
            [
              "Permission Decision",
              "Every request resolves to allow, deny, step-up, manual review or revoke.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
              {title === "Step-Up Verification" ? (
                <Link
                  href="/step-up-verification"
                  className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  Open Step-Up Verification
                </Link>
              ) : null}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
