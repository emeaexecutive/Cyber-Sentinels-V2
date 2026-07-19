import Link from "next/link";
import { redirect } from "next/navigation";
import { VerificationDetail } from "@/components/identity-signals/verification-detail";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";

export const dynamic = "force-dynamic";

export default async function IdentityVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, workspace } = await resolveIdentityUiEnterprise();
  if (!user) redirect(`/login?next=/dashboard/identity/verifications/${id}`);
  return <main className="operational-shell min-h-screen px-4 py-10 text-zinc-100 sm:px-6 md:px-8"><div className="mx-auto max-w-7xl"><Link href="/dashboard/identity" className="text-sm text-cyan-300 underline-offset-4 hover:underline">← Identity Signals</Link><header className="mt-5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Enterprise Identity Intelligence</p><h1 className="mt-2 text-4xl font-semibold">Verification detail</h1><p className="mt-2 break-all font-mono text-xs text-zinc-500">{id}</p></header>{workspace ? <VerificationDetail enterpriseId={workspace.id} verificationId={id} /> : <section data-state="blocked" className="mt-8 rounded-xl border border-amber-800 bg-amber-950/20 p-6"><h2 className="text-xl font-semibold">Enterprise workspace required</h2></section>}</div></main>;
}
