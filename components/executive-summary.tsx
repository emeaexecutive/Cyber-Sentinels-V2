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
  headingLevel = "h1",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  bullets: string[];
  primary: SummaryAction;
  secondary?: SummaryAction;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  return (
    <section className="executive-summary py-4 md:py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{eyebrow}</p>
      <Heading className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">{title}</Heading>
      {description ? <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">{description}</p> : null}
      <details className="mt-5 max-w-4xl text-sm leading-6 text-zinc-300">
        <summary className="w-fit cursor-pointer text-cyan-200">At a glance</summary>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      </details>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={primary.href} className="brand-primary-action brand-action-large text-sm">{primary.label}</Link>
        {secondary ? secondary.download
          ? <a href={secondary.href} download className="brand-secondary-action brand-action-large text-sm">{secondary.label}</a>
          : <Link href={secondary.href} className="inline-flex min-h-11 items-center px-2 text-sm text-cyan-200 underline underline-offset-4">{secondary.label}</Link>
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
