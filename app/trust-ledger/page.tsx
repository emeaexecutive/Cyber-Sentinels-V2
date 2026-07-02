import Link from "next/link";
import {
  demoTrustLedgerEvents,
  trustLedgerAuditEvents,
  trustLedgerEventTypes,
  trustLedgerSignals,
} from "@/lib/trust-engine/trustLedger";

function eventClass(eventType: string) {
  if (/revoked|restricted|tampered|denied/.test(eventType)) {
    return "border-red-700 text-red-200";
  }
  if (/changed|evaluated|created/.test(eventType)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-emerald-700 text-emerald-200";
}

export default function TrustLedgerPage() {
  const sections = [
    ["Evidence Chain Overview", "Track how and why Trust Posture changed over time."],
    ["Recent Trust Changes", "Latest score, presence, origin and passport movements."],
    ["Score Changes", "Trust Score, HPI and Origin Trace movements."],
    ["Revocations", "Passport, agent and permission restrictions."],
    ["Recoveries", "Restored trust after approved recovery workflows."],
    ["Evidence Events", "Evidence additions and tamper detection."],
    ["Agent Events", "Agent verification and restriction history."],
    ["Decision Events", "Decision, policy, permission and step-up history."],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/trust-timeline", "Replay Timeline"],
            ["/back-office", "Back Office"],
            ["/mission-control", "Mission Control"],
            ["/client-portal", "Client Portal"],
            ["/profile", "Public Profiles"],
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
            Evidence Chain history
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Evidence Chain and Trust Posture history
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Retained evidence explains what changed, why it changed and who acted.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Evidence Events", demoTrustLedgerEvents.length],
            ["Score Changes", demoTrustLedgerEvents.filter((event) => /changed/.test(event.event_type)).length],
            ["Revocations", demoTrustLedgerEvents.filter((event) => /revoked|restricted|tampered/.test(event.event_type)).length],
            ["Recoveries", demoTrustLedgerEvents.filter((event) => /restored|recovery/.test(event.event_type)).length],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Recent Trust Changes</h2>
          <div className="mt-5 grid gap-3">
            {demoTrustLedgerEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-500">{event.subject_id}</p>
                    <p className="mt-2 text-lg font-medium">
                      {event.previous_value ?? "new"} -&gt; {event.new_value ?? "n/a"}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {event.reason_code} / {event.actor} / {event.source}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs ${eventClass(
                      event.event_type
                    )}`}
                  >
                    {event.event_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sections.map(([title, copy]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Ledger Event Types</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustLedgerEventTypes.map((eventType) => (
                <code
                  key={eventType}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {eventType}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustLedgerSignals.map((signal) => (
                <code
                  key={signal}
                  className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200"
                >
                  {signal}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustLedgerAuditEvents.map((event) => (
                <code
                  key={event}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {event}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
