"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ReplayEvent, ReplayTimeline } from "@/src/core/trust/replay";

type FilterState = {
  from: string;
  to: string;
  riskMin: string;
  riskMax: string;
  trustMin: string;
  trustMax: string;
  provider: string;
  actor: string;
  evidenceType: string;
  eventType: string;
};

const emptyFilters: FilterState = {
  from: "",
  to: "",
  riskMin: "",
  riskMax: "",
  trustMin: "",
  trustMax: "",
  provider: "",
  actor: "",
  evidenceType: "",
  eventType: "",
};

function change(before: number | null | undefined, after: number | null | undefined) {
  if (before === null || before === undefined || after === null || after === undefined) {
    return "No measured change";
  }
  const delta = Math.round((after - before) * 100) / 100;
  return `${before} → ${after} (${delta >= 0 ? "+" : ""}${delta})`;
}

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid timestamp"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" });
}

function queryFrom(filters: FilterState) {
  const params = new URLSearchParams({ limit: "500" });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params;
}

export function ReplayViewer({
  enterpriseId,
  entityId,
  initialTimeline,
}: {
  enterpriseId: string;
  entityId: string;
  initialTimeline: ReplayTimeline;
}) {
  const [events, setEvents] = useState(initialTimeline.events);
  const [filters, setFilters] = useState(emptyFilters);
  const [status, setStatus] = useState("Showing the complete retained timeline.");
  const [loading, setLoading] = useState(false);
  const summary = useMemo(() => ({
    events: events.length,
    trustChanges: events.filter((event) =>
      event.priorTrust !== null &&
      event.resultingTrust !== null &&
      event.priorTrust !== event.resultingTrust,
    ).length,
    riskChanges: events.filter((event) =>
      event.priorRisk !== null &&
      event.priorRisk !== undefined &&
      event.resultingRisk !== null &&
      event.resultingRisk !== undefined &&
      event.priorRisk !== event.resultingRisk,
    ).length,
    evidenceChanges: events.filter((event) =>
      event.evidenceIds.length > 0 || event.type === "EVIDENCE_REMOVED",
    ).length,
    policyChanges: events.filter((event) => event.type.includes("POLICY")).length,
    manualActions: events.filter((event) =>
      event.type.includes("MANUAL") || event.type.includes("REVIEW"),
    ).length,
    providerEvents: events.filter((event) => Boolean(event.provider)).length,
  }), [events]);

  function setFilter(key: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Searching retained Replay events…");
    try {
      const response = await fetch(
        `/api/replay/${encodeURIComponent(entityId)}/events?${queryFrom(filters)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "X-Enterprise-Id": enterpriseId },
        },
      );
      const body = await response.json() as { events?: ReplayEvent[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Replay search failed.");
      const nextEvents = Array.isArray(body.events) ? body.events : [];
      setEvents(nextEvents);
      setStatus(`Showing ${nextEvents.length} matching event(s).`);
    } catch {
      setStatus("Replay search could not be completed safely.");
    } finally {
      setLoading(false);
    }
  }

  async function exportReplay(format: "json" | "csv" | "audit") {
    setLoading(true);
    setStatus(`Preparing ${format.toUpperCase()} export…`);
    try {
      const params = queryFrom(filters);
      params.set("format", format);
      const response = await fetch(`/api/replay/${encodeURIComponent(entityId)}?${params}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { "X-Enterprise-Id": enterpriseId },
      });
      if (!response.ok) throw new Error("Replay export failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `replay-${entityId}.${format === "csv" ? "csv" : "json"}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(`${format.toUpperCase()} export prepared.`);
    } catch {
      setStatus("Replay export could not be completed safely.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="replay-viewer" className="space-y-6">
      <section className="rounded-2xl border border-cyan-900/60 bg-cyan-950/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Forensic Replay™</p>
            <h1 className="mt-2 text-3xl font-semibold">Trust Timeline</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Immutable evidence, provider, policy, human-review, risk and trust changes for entity{" "}
              <span className="font-mono text-zinc-300">{entityId}</span>.
            </p>
          </div>
          <div className="text-right">
            <p className={initialTimeline.integrity.valid ? "text-sm text-emerald-200" : "text-sm text-red-200"}>
              {initialTimeline.integrity.valid ? "Integrity chain verified" : "Integrity review required"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {initialTimeline.integrity.chainedEvents} chained · {initialTimeline.integrity.unchainedLegacyEvents} legacy
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={search} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Search retained events</h2>
            <p className="mt-1 text-sm text-zinc-500">Filters execute inside the authenticated tenant boundary.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilters(emptyFilters);
              setEvents(initialTimeline.events);
              setStatus("Showing the complete retained timeline.");
            }}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-700"
          >
            Reset filters
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["from", "From date", "datetime-local"],
            ["to", "To date", "datetime-local"],
            ["riskMin", "Minimum risk", "number"],
            ["riskMax", "Maximum risk", "number"],
            ["trustMin", "Minimum trust", "number"],
            ["trustMax", "Maximum trust", "number"],
            ["provider", "Provider", "text"],
            ["actor", "Actor", "text"],
            ["evidenceType", "Evidence type", "text"],
            ["eventType", "Event type", "text"],
          ].map(([key, label, type]) => (
            <label key={key} className="text-sm text-zinc-400">
              {label}
              <input
                type={type}
                min={type === "number" ? 0 : undefined}
                max={type === "number" ? 100 : undefined}
                value={filters[key as keyof FilterState]}
                onChange={(event) => setFilter(key as keyof FilterState, event.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-zinc-100 outline-none focus:border-cyan-700"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-cyan-200 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Search Replay
          </button>
          {(["json", "csv", "audit"] as const).map((format) => (
            <button
              key={format}
              type="button"
              disabled={loading}
              onClick={() => void exportReplay(format)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm uppercase text-zinc-300 hover:border-cyan-700 disabled:opacity-50"
            >
              Export {format}
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" className="mt-4 text-xs text-zinc-500">{status}</p>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7" aria-label="Replay summary">
        {Object.entries(summary).map(([label, value]) => (
          <article key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs capitalize text-zinc-500">{label.replaceAll(/([A-Z])/g, " $1")}</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-100">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Immutable event timeline</h2>
          <span className="text-xs text-zinc-500">Oldest to newest · maximum 500</span>
        </div>
        <div className="mt-6 space-y-4">
          {events.map((event) => (
            <article key={event.id} className="relative border-l border-cyan-900 pl-5">
              <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border border-cyan-300 bg-black" />
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-cyan-300">
                      {event.type.replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-1 font-semibold">{event.title}</h3>
                  </div>
                  <time className="text-xs text-zinc-500">{displayTime(event.eventTime ?? event.occurredAt)}</time>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{event.description}</p>
                <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <p className="rounded-lg bg-black p-2 text-zinc-400">Trust: {change(event.priorTrust, event.resultingTrust)}</p>
                  <p className="rounded-lg bg-black p-2 text-zinc-400">Risk: {change(event.priorRisk, event.resultingRisk)}</p>
                  <p className="rounded-lg bg-black p-2 text-zinc-400">Actor: {event.actor ?? event.actorId ?? "System"}</p>
                  <p className="rounded-lg bg-black p-2 text-zinc-400">Provider: {event.provider ?? "Not applicable"}</p>
                </div>
                {event.evidenceIds.length ? (
                  <p className="mt-3 text-xs text-zinc-500">
                    Evidence: {event.type === "EVIDENCE_REMOVED" ? "removed" : "added"} · {event.evidenceIds.join(", ")}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
          {!events.length ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">
              No retained Replay events match these filters.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
