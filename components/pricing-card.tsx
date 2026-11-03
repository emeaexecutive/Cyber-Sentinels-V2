import Link from "next/link";

export function PricingCard({ name, offer, description, features, href, action, preferred = false }: {
  name: string; offer: string; description: string; features: string[]; href: string; action: string; preferred?: boolean;
}) {
  return <article className={`pricing-card flex h-full min-w-0 flex-col rounded-xl border p-6 ${preferred ? "border-cyan-700 bg-cyan-950/15" : "border-zinc-800 bg-[#0b0e14]"}`}>
    <div className="pricing-card__body flex-1">
      <h2 className="text-xl font-semibold text-white">{name}</h2>
      <p className="mt-3 text-base font-medium leading-6 text-cyan-200">{offer}</p>
      <p className="mt-5 text-sm leading-6 text-zinc-400">{description}</p>
      <ul className="my-6 grid gap-3 text-sm leading-6 text-zinc-300">
        {features.map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden="true" className="text-cyan-400">·</span>{feature}</li>)}
      </ul>
    </div>
    <Link href={href} className="pricing-card__cta mt-auto flex h-16 min-h-[3.25rem] w-full items-center justify-center rounded-lg bg-white px-3 py-3 text-center text-sm font-semibold leading-5 text-black hover:bg-cyan-100">{action}</Link>
  </article>;
}
