import Link from "next/link";

type LegalDraftPageProps = {
  title: string;
  subtitle: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  links?: Array<[string, string]>;
};

export function LegalDraftPage({
  title,
  subtitle,
  sections,
  links = [],
}: LegalDraftPageProps) {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="pb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
            Draft policy — requires legal review before production use.
          </p>
          <h1 className="mt-4 text-4xl font-semibold">{title}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">{subtitle}</p>
        </header>

        <section aria-label="Policy sections" className="grid gap-8 border-t border-zinc-800 pt-8">
          {sections.map((section) => (
            <article
              key={section.title}
              id={section.title === "Responsible Disclosure" ? "responsible-disclosure" : undefined}
              className="grid gap-3 md:grid-cols-[14rem_1fr] md:gap-8"
            >
              <h2 className="text-lg font-semibold text-zinc-100">
                {section.title}
              </h2>
              <p className="text-sm leading-7 text-zinc-300">
                {section.body}
              </p>
            </article>
          ))}
        </section>

        {links.length ? (
          <section className="mt-10 border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold">Related Pages</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-11 items-center text-cyan-200 underline underline-offset-4 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
