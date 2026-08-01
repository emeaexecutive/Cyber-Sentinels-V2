import type { ScreeningResult, SeriousIncidentArtifacts, SeriousIncidentAssessmentInput } from "@/src/lib/serious-incident/types";

type Props = { assessment: SeriousIncidentAssessmentInput; screening: ScreeningResult; artifacts: SeriousIncidentArtifacts };

function format(value: string) { return value.replaceAll("_", " "); }
function Card({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-lg border border-zinc-800 bg-black/60 p-4" aria-label={`${label}: ${value}`}><p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p><p className="mt-2 font-semibold text-zinc-100">{value}</p><p className="mt-2 text-xs leading-5 text-zinc-400">{detail}</p></div>; }
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5" aria-labelledby={`incident-section-${number}`}><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">{String(number).padStart(2,"0")}</p><h2 id={`incident-section-${number}`} className="mt-2 text-xl font-semibold text-white">{title}</h2><div className="mt-4 text-sm leading-6 text-zinc-400">{children}</div></section>; }
function List({ values, empty = "Not yet recorded" }: { values: string[]; empty?: string }) { return values.length ? <ul className="space-y-2">{values.map((value) => <li key={value} className="rounded-md border border-zinc-800 bg-black px-3 py-2">{format(value)}</li>)}</ul> : <p>{empty}</p>; }

export function SeriousIncidentRegulatoryPanel({ assessment, screening, artifacts }: Props) {
  return <section aria-labelledby="serious-incident-title">
    <header className="mb-7 rounded-xl border border-cyan-950 bg-zinc-950 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Enterprise Trust Fabric™</p>
      <h1 id="serious-incident-title" className="mt-3 max-w-5xl text-3xl font-semibold text-white md:text-5xl">AI serious-incident evidence and reporting lineage</h1>
      <p className="mt-4 max-w-4xl text-base leading-7 text-zinc-300">Cyber Sentinels converts fragmented AI-agent incident evidence into an immutable, regulator-ready operational record.</p>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">Preserve what happened, when the organization became aware, what containment was attempted, what evidence supported the reporting decision and what corrective action followed.</p>
      <div className="mt-5 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm font-semibold text-amber-100">{screening.label}. Cyber Sentinels does not provide legal advice or determine legal reportability.</div>
    </header>

    <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card label="Incident state" value={format(assessment.state)} detail="Operational workflow state; not a legal conclusion." />
      <Card label="Category" value={format(assessment.regulatoryContext.incidentCategory)} detail="Cyber Sentinels technical classification." />
      <Card label="Screening" value={format(screening.outcome)} detail="Deterministic operational screening only." />
      <Card label="Awareness" value={assessment.clocks.organizationAwarenessAt ?? "Unknown"} detail="Explicit organizational timestamp, never inferred from detection." />
      <Card label="Containment" value="requested / unconfirmed" detail="Acknowledgement is not confirmation." />
      <Card label="Evidence" value={assessment.references.evidenceCompleteness} detail={`${assessment.references.evidenceLimitations.length} limitation(s) remain visible.`} />
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <Section number={1} title="Technical incident state"><p>{assessment.references.impactSummary}</p><p className="mt-3">Provider classification: {assessment.regulatoryContext.providerClassification ?? "not supplied"}. Technical classification: {format(assessment.regulatoryContext.technicalClassification)}.</p></Section>
      <Section number={2} title="Potential regulatory relevance"><p className="font-semibold text-amber-100">{screening.label}</p><List values={screening.reasonCodes} /><p className="mt-3">Missing evidence: {screening.missingEvidence.join(", ") || "none identified by this screening"}.</p></Section>
      <Section number={3} title="Authorized reporting decision"><p>No authorized reporting decision has been recorded. Automated logic cannot set <code>reporting_required</code> or <code>not_reportable</code>.</p></Section>
      <Section number={4} title="Responsibility lineage"><List values={assessment.responsibilityRoles.map((role) => `${role.roleType}: ${role.partyReference}`)} /><p className="mt-3">Model-provider attribution does not imply control of the harness, egress, identity, credentials, monitoring, or containment.</p></Section>
      <Section number={5} title="Evidence-at-incident snapshot"><p>Captured {assessment.evidenceSnapshot.capturedAt}; policy {assessment.evidenceSnapshot.policyVersion}.</p><p className="mt-3">Prompt/configuration is retained as a SHA-256 digest and masked reference. Credentials, tokens, exploit payloads, full prompts, and unnecessary raw telemetry are excluded.</p></Section>
      <Section number={6} title="Awareness and reporting timeline"><List values={[`Occurrence: ${assessment.clocks.firstOccurrenceAt ?? "unknown"}`, `Provider observation: ${assessment.clocks.firstProviderObservationAt ?? "unknown"}`, `Cyber Sentinels ingestion: ${assessment.clocks.firstCyberSentinelsIngestionAt}`, `Detection: ${assessment.clocks.firstDetectionAt}`, `Organization awareness: ${assessment.clocks.organizationAwarenessAt ?? "unknown"}`]} /><p className="mt-3">Jurisdiction-specific deadlines remain unknown until supplied by an authorized reviewer, approved policy, or external source.</p></Section>
      <Section number={7} title="Impact matrix"><List values={["No external impact independently confirmed", ...assessment.references.affectedSystems.map((value) => `Affected system under review: ${value}`)]} /><p className="mt-3">A provider alert, suspected target, or failed containment request is not treated as confirmed impact.</p></Section>
      <Section number={8} title="Environment and Scope Continuity"><List values={[`Declared: ${assessment.evidenceSnapshot.declaredEnvironmentReference ?? "missing"}`, `Configured: ${assessment.evidenceSnapshot.configuredEnvironmentReference ?? "missing"}`, `Observed: ${assessment.evidenceSnapshot.observedEnvironmentReferences.join(", ") || "missing"}`, `Authorized: ${assessment.evidenceSnapshot.scopeAuthorizationLeaseReference ?? "missing"}`, `Decision: ${assessment.references.scopeContinuityDecisionReference ?? "missing"}`]} /></Section>
      <Section number={9} title="Requested-versus-confirmed containment"><List values={["Containment requested", "Provider confirmation not recorded", "Independent confirmation not recorded", "Outcome remains uncertain"]} /><p className="mt-3">Requested containment is never displayed as completed.</p></Section>
      <Section number={10} title="Potential trigger panel"><List values={screening.potentialTriggers} empty="No known trigger identified from the supplied operational evidence." /><p className="mt-3">Recommended roles: {screening.recommendedReviewerRoles.map(format).join(", ") || "none"}.</p></Section>
      <Section number={11} title="Reviewer workflow"><p>Technical, security, compliance, data-protection, legal, executive, adviser, and regulator-liaison decisions remain separately attributed. Later decisions supersede; they never delete earlier decisions.</p></Section>
      <Section number={12} title="Submission package"><p>No approved package exists. <code>regulator_ready</code> means internally prepared and approved; it does not mean legally sufficient or regulator accepted.</p></Section>
      <Section number={13} title="External submission history"><p>No external submission is implied. The platform records externally performed transfers and acknowledgements without storing portal passwords, session tokens, cookies, or private API credentials.</p></Section>
      <Section number={14} title="Corrective-action tracker"><p>Corrective actions preserve owner, approver, completion evidence, separate validation evidence, residual risk, and supersession. A request or provider acknowledgement cannot mark an action complete.</p></Section>
      <Section number={15} title="Correction and supersession history"><p>No correction is present in this scenario. Later evidence creates linked correction records so historical packages remain reproducible and corrected attribution does not leave an unsupported permanent penalty.</p></Section>
      <Section number={16} title="Replay"><List values={artifacts.replay.map((event) => `${event.occurredAt} — ${event.classification} — ${event.summary}`)} /><p className="mt-3">Conflicting timestamps retain confidence and do not fabricate precise causal ordering.</p></Section>
      <Section number={17} title="Trust Memory"><List values={artifacts.trustMemory.map((event) => `${event.eventKind}: ${event.reason}`)} /><p className="mt-3">Material events use explainable canonical trust state; no arbitrary permanent numeric penalty is created.</p></Section>
    </div>
  </section>;
}
