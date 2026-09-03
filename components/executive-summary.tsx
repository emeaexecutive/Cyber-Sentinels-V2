import Link from "next/link";

type SummaryAction = {
  href: string;
  label: string;
  download?: boolean;
};

export function ExecutiveSummary({
  eyebrow,
  title,
  description,
  bullets,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  bullets: string[];
  primary: SummaryAction;
  secondary?: SummaryAction;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{eyebrow}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Executive Summary</p>
      <h1 className="mt-3 max-w-5xl text-4xl font-semibold leading-tight md:text-5xl">{title}</h1>
      {description ? <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">{description}</p> : null}
      <ul className="mt-6 grid max-w-5xl gap-3 text-sm leading-6 text-zinc-300 md:grid-cols-2">
        {bullets.slice(0, 4).map((bullet) => (
          <li key={bullet} className="border-l border-cyan-900 pl-4">{bullet}</li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={primary.href} className="brand-primary-action brand-action-large text-sm">{primary.label}</Link>
        {secondary ? secondary.download
          ? <a href={secondary.href} download className="brand-secondary-action brand-action-large text-sm">{secondary.label}</a>
          : <Link href={secondary.href} className="brand-secondary-action brand-action-large text-sm">{secondary.label}</Link>
        : null}
      </div>
    </section>
  );
}

export type DecisionSummaryItem = {
  label: "Current posture" | "Current risks" | "Recommended action" | "Evidence available" | "Confidence" | "Responsible owner";
  value: string;
};

export function DecisionSummary({ items }: { items: DecisionSummaryItem[] }) {
  return (
    <section aria-label="Decision summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.label} className="rounded-lg border border-zinc-800 bg-black p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{item.label}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-100">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
