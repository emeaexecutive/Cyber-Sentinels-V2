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
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
            Draft policy — requires legal review before production use.
          </p>
          <h1 className="mt-4 text-4xl font-semibold">{title}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">{subtitle}</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <h2 className="text-lg font-semibold text-zinc-100">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {section.body}
              </p>
            </article>
          ))}
        </section>

        {links.length ? (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Related Pages</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-cyan-500 hover:text-white"
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
