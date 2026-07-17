import type { ReactNode } from "react";
import Link from "next/link";

export type VisualStep = {
  label: string;
  detail?: string;
};

export type BuyerJourney = {
  id: string;
  role: string;
  answers: Array<{ question: string; answer: string }>;
  actions: Array<{ href: string; label: "Request Demo" | "Book Pilot" | "Buyer Documentation" }>;
};

export function VisualFrame({
  eyebrow,
  title,
  caption,
  children,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <div className="story-frame">
      <div className="story-frame-heading">
        <p className="operational-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        {caption ? <p>{caption}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function TrustFlow({
  steps,
  ariaLabel,
  compact = false,
}: {
  steps: VisualStep[];
  ariaLabel: string;
  compact?: boolean;
}) {
  return (
    <ol aria-label={ariaLabel} className={`story-flow ${compact ? "story-flow-compact" : ""}`}>
      {steps.map((step, index) => (
        <li key={`${step.label}-${index}`}>
          <span className="story-node-index">{String(index + 1).padStart(2, "0")}</span>
          <strong>{step.label}</strong>
          {step.detail ? <span>{step.detail}</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function LifecycleDiagram({ steps }: { steps: VisualStep[] }) {
  return <TrustFlow steps={steps} ariaLabel="Operational Trust Lifecycle" />;
}

export function DecisionFlow({ steps }: { steps: VisualStep[] }) {
  return <TrustFlow steps={steps} ariaLabel="Trust decision flow" compact />;
}

export function ComparisonCard({
  left,
  right,
}: {
  left: { title: string; items: string[] };
  right: { title: string; items: string[] };
}) {
  return (
    <div className="story-comparison" aria-label={`${left.title} compared with ${right.title}`}>
      {[left, right].map((column, index) => (
        <article key={column.title} className={index === 1 ? "story-comparison-active" : ""}>
          <p>{index === 0 ? "Access moment" : "Operational lifecycle"}</p>
          <h3>{column.title}</h3>
          <ul>
            {column.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function Timeline({ events, ariaLabel }: { events: VisualStep[]; ariaLabel: string }) {
  return (
    <ol className="story-timeline" aria-label={ariaLabel}>
      {events.map((event, index) => (
        <li key={`${event.label}-${index}`}>
          <span aria-hidden="true" />
          <strong>{event.label}</strong>
          {event.detail ? <p>{event.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function SignalCard({
  kind,
  label,
  state,
  detail,
}: {
  kind: string;
  label: string;
  state: string;
  detail?: string;
}) {
  return (
    <article className="story-signal-card">
      <p>{kind}</p>
      <h3>{label}</h3>
      <strong>{state}</strong>
      {detail ? <span>{detail}</span> : null}
    </article>
  );
}

export function EvidenceCard(props: { label: string; state: string; detail?: string }) {
  return <SignalCard kind="Evidence" {...props} />;
}

export function ProviderCard(props: { label: string; state: string; detail?: string }) {
  return <SignalCard kind="Provider" {...props} />;
}

export function ArchitectureBlock({
  inputs,
  core,
  outputs,
}: {
  inputs: string[];
  core: string;
  outputs: string[];
}) {
  return (
    <div className="story-architecture" aria-label={`${core} architecture`}>
      <div>
        <p>Actors and workflows</p>
        <ul>{inputs.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="story-architecture-core">
        <p>Shared control layer</p>
        <strong>{core}</strong>
        <span>Identity · Authority · Runtime · Policy</span>
      </div>
      <div>
        <p>Accountable outcome</p>
        <ul>{outputs.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  );
}

export function BuyerJourneyGrid({ journeys }: { journeys: BuyerJourney[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {journeys.map((journey) => (
        <article id={journey.id} key={journey.id} className="scroll-mt-28 story-frame">
          <p className="operational-eyebrow">Buyer journey</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{journey.role}</h2>
          <dl className="mt-5 grid gap-3">
            {journey.answers.map((item) => (
              <div key={item.question} className="grid gap-1 border-l border-cyan-900 pl-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-200">{item.question}</dt>
                <dd className="text-sm leading-6 text-zinc-400">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {journey.actions.map((action, index) => (
              <Link
                key={action.label}
                href={action.href}
                className={index === 0 ? "brand-primary-action text-sm" : "brand-secondary-action text-sm"}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
