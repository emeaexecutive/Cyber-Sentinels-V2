import { AgentPassportCard, VerificationTimeline } from "@/components/phase-one-trust";
import { verificationTimeline } from "@/lib/trusted-layer/phase1";

export const dynamic = "force-dynamic";

export default function AgentRegisterPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Agent Identity</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Register Agent</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Create an agent passport with owner, model context, declared purpose, permission scope and review status.
          </p>
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
          <form action="/api/agents/register" method="POST" className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Agent Passport Intake</h2>
            <input name="name" required placeholder="Agent name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="model_provider" placeholder="Model provider" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="model_name" placeholder="Model name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <textarea name="purpose" rows={4} placeholder="Declared purpose" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <select name="permission_scope" defaultValue="review_only" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
              <option value="review_only">Review only</option>
              <option value="observe">Observe</option>
              <option value="advise">Advise</option>
              <option value="approval_required">Approval required</option>
            </select>
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">Register Agent</button>
          </form>
          <div className="grid gap-5">
            <AgentPassportCard name="Example Review Agent" purpose="Assists with evidence summarization under human review." owner="registered owner" score={72} />
            <VerificationTimeline events={verificationTimeline("agent")} />
          </div>
        </section>
      </div>
    </main>
  );
}

