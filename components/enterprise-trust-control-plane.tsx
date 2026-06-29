"use client";

import { useMemo, useState } from "react";
import {
  evaluateTrustPolicy,
  validateTrustPolicy,
  type PolicyEvaluationInput,
  type TrustPolicy,
} from "@/lib/policy-engine";

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function routeTone(route: string) {
  if (route === "continue_with_oversight") return "border-emerald-800 text-emerald-200";
  if (route === "governance_review") return "border-cyan-800 text-cyan-100";
  if (route === "high_assurance_review") return "border-amber-800 text-amber-200";
  return "border-red-900 text-red-200";
}

export function EnterpriseTrustControlPlane({
  initialPolicies,
}: {
  initialPolicies: TrustPolicy[];
}) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [selectedId, setSelectedId] = useState(initialPolicies[0]?.id ?? "");
  const [workflow, setWorkflow] = useState<PolicyEvaluationInput>({
    workflowId: "control-plane-preview",
    workflowType: initialPolicies[0]?.workflowType ?? "candidate",
    trustScore: 64,
    providerConfidence: 69,
    sessionIntegrity: 71,
    daysSinceLastEvidence: 12,
    anomalyCount: 1,
    evidenceReferences: [
      "Provider evidence preview",
      "Session integrity preview",
      "Replay chronology preview",
    ],
  });
  const selected =
    policies.find((policy) => policy.id === selectedId) ?? policies[0];
  const validation = selected
    ? validateTrustPolicy(selected)
    : { valid: false, errors: ["No policy selected."] };
  const evaluation = useMemo(() => {
    if (!selected || !validation.valid) return null;
    return evaluateTrustPolicy(selected, {
      ...workflow,
      workflowType: selected.workflowType,
    });
  }, [selected, validation.valid, workflow]);

  function updatePolicy(patch: Partial<TrustPolicy>) {
    setPolicies((current) =>
      current.map((policy) =>
        policy.id === selectedId ? { ...policy, ...patch } : policy
      )
    );
  }

  if (!selected) {
    return <p className="text-sm text-zinc-400">No policy templates are available.</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          Trust policies
        </p>
        <div className="mt-4 grid gap-2">
          {policies.map((policy) => (
            <button
              key={policy.id}
              type="button"
              onClick={() => {
                setSelectedId(policy.id);
                setWorkflow((current) => ({
                  ...current,
                  workflowType: policy.workflowType,
                }));
              }}
              className={`rounded-lg border p-4 text-left ${
                selectedId === policy.id
                  ? "border-cyan-700 bg-cyan-950/20"
                  : "border-zinc-800 bg-black hover:border-zinc-600"
              }`}
            >
              <span className="text-sm font-semibold text-zinc-100">{policy.name}</span>
              <span className="mt-2 block text-xs leading-5 text-zinc-400">
                {policy.description}
              </span>
              <span className="mt-3 block text-xs capitalize text-cyan-200">
                {policy.assuranceLevel} assurance / {policy.reviewerQueue}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Policy draft controls
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{selected.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Preview explainable routing before publishing. Draft changes remain in this browser session; durable policy storage requires an approved enterprise schema and RLS policy.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={selected.enabled}
                onChange={(event) => updatePolicy({ enabled: event.target.checked })}
              />
              Enabled
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Escalation threshold", "escalationThreshold", selected.escalationThreshold],
              ["High-assurance threshold", "highAssuranceThreshold", selected.highAssuranceThreshold],
              ["Provider confidence minimum", "providerConfidenceMinimum", selected.providerConfidenceMinimum],
              ["Session integrity minimum", "sessionIntegrityMinimum", selected.sessionIntegrityMinimum],
            ].map(([label, key, value]) => (
              <label key={String(key)} className="grid gap-2 text-sm text-zinc-300">
                <span className="flex justify-between gap-3">
                  {label}
                  <span className="font-mono text-cyan-200">{value}</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Number(value)}
                  onChange={(event) =>
                    updatePolicy({
                      [String(key)]: numberValue(event.target.value),
                    } as Partial<TrustPolicy>)
                  }
                  className="accent-cyan-400"
                />
              </label>
            ))}
            <label className="grid gap-2 text-sm text-zinc-300">
              Trust decay timing
              <input
                type="number"
                min="1"
                max="365"
                value={selected.trustDecayDays}
                onChange={(event) =>
                  updatePolicy({ trustDecayDays: numberValue(event.target.value) })
                }
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-zinc-100"
              />
              <span className="text-xs text-zinc-500">Days until evidence freshness review</span>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Replay retention
              <select
                value={selected.replayRetentionDays}
                onChange={(event) =>
                  updatePolicy({ replayRetentionDays: numberValue(event.target.value) })
                }
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-zinc-100"
              >
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
                <option value={730}>2 years</option>
                <option value={2555}>7 years</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Reviewer queue
              <input
                value={selected.reviewerQueue}
                onChange={(event) => updatePolicy({ reviewerQueue: event.target.value })}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-zinc-100"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Workflow review owner
              <input
                value={selected.assignedReviewer}
                onChange={(event) => updatePolicy({ assignedReviewer: event.target.value })}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-zinc-100"
              />
            </label>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Provider trust weighting
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {Object.entries(selected.providerWeights).map(([provider, weight]) => (
                <div key={provider} className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs capitalize text-zinc-500">{provider}</p>
                  <p className="mt-2 text-xl font-semibold text-zinc-100">{weight}%</p>
                </div>
              ))}
            </div>
          </div>
          {!validation.valid ? (
            <div className="mt-5 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
              {validation.errors.join(" ")}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Workflow threshold preview
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Trust posture", "trustScore", workflow.trustScore],
              ["Provider confidence", "providerConfidence", workflow.providerConfidence],
              ["Session integrity", "sessionIntegrity", workflow.sessionIntegrity],
              ["Evidence age (days)", "daysSinceLastEvidence", workflow.daysSinceLastEvidence],
              ["Anomaly events", "anomalyCount", workflow.anomalyCount],
            ].map(([label, key, value]) => (
              <label key={String(key)} className="grid gap-2 text-xs text-zinc-400">
                {label}
                <input
                  type="number"
                  min="0"
                  max={key === "daysSinceLastEvidence" ? 365 : 100}
                  value={Number(value)}
                  onChange={(event) =>
                    setWorkflow((current) => ({
                      ...current,
                      [String(key)]: numberValue(event.target.value),
                    }))
                  }
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            ))}
          </div>
        </section>

        {evaluation ? (
          <section className="rounded-lg border border-cyan-950 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                  Explainable trust routing
                </p>
                <h2 className="mt-2 text-xl font-semibold">Policy evaluation preview</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs capitalize ${routeTone(evaluation.route)}`}>
                {evaluation.route.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-zinc-300">{evaluation.explanation}</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="text-sm font-semibold text-zinc-100">Governance routing</h3>
                <dl className="mt-3 grid gap-2 text-sm text-zinc-400">
                  <div>Queue: {evaluation.governanceRouting.reviewerQueue}</div>
                  <div>Owner: {evaluation.governanceRouting.assignedReviewer}</div>
                  <div>Human review: required</div>
                </dl>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="text-sm font-semibold text-zinc-100">Replay continuity</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {evaluation.replayContext.resolutionRequired}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Policy: {evaluation.replayContext.policyTriggered}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {evaluation.triggers.length ? (
                evaluation.triggers.map((trigger) => (
                  <article key={trigger.code} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {trigger.code.replaceAll("_", " ")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{trigger.explanation}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Threshold {trigger.threshold} / observed {trigger.observed}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">
                  No configured review threshold crossed. Oversight and replay retention continue.
                </p>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
