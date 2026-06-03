import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const requestTypes = [
  "Request access to my data",
  "Request deletion",
  "Request correction",
  "Request export",
  "Contact privacy team",
];

async function submitDataRightsRequest(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/data-rights");
  }

  const requestType = String(formData.get("request_type") ?? "").trim();
  const requesterEmail = String(formData.get("requester_email") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();

  if (!requestTypes.includes(requestType) || !requesterEmail) {
    redirect("/data-rights?error=invalid");
  }

  const { data: request, error } = await supabase
    .from("data_rights_requests")
    .insert({
      request_type: requestType,
      requester_email: requesterEmail,
      requester_user_id: user.id,
      details,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !request) {
    console.error("data rights request insert failed", error);
    redirect("/data-rights?error=submit_failed");
  }

  const actor = user.email ?? user.id;
  const metadata = {
    data_rights_request_id: request.id,
    request_type: requestType,
    requester_email: requesterEmail,
    requester_user_id: user.id,
    actor,
  };

  await createAuditLog(
    supabase,
    "data_rights_request_created",
    actor,
    metadata
  );
  await createSignal(supabase, "Data rights request created", metadata);

  redirect("/data-rights?submitted=1");
}

export default async function DataRightsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requesterEmail = user?.email ?? "";

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
            Draft - requires legal review.
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Data Rights</h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            Request access, deletion, correction or export of data associated
            with Cyber Sentinels trust workflows. Requests are reviewed before
            action is taken.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {requestTypes.map((type) => (
            <article
              key={type}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <h2 className="font-semibold text-zinc-100">{type}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Submit this request for privacy-team review. Identity and
                authorization checks may be required before fulfillment.
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                Submit a Data Rights Request
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Sign in before submitting so the request can be linked to your
                account.
              </p>
            </div>
            {params?.submitted ? (
              <span className="rounded-full border border-emerald-800 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200">
                Request submitted
              </span>
            ) : null}
          </div>

          {params?.error ? (
            <p className="mt-4 rounded-lg border border-red-900 bg-red-950/20 p-3 text-sm text-red-200">
              Could not submit this request. Check the required fields and try
              again.
            </p>
          ) : null}

          <form action={submitDataRightsRequest} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-zinc-300">
              Request type
              <select
                name="request_type"
                required
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
              >
                {requestTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Requester email
              <input
                name="requester_email"
                type="email"
                required
                defaultValue={requesterEmail}
                placeholder="name@example.com"
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white placeholder:text-zinc-600"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Details
              <textarea
                name="details"
                rows={5}
                placeholder="Tell the privacy team what you need reviewed."
                className="rounded-lg border border-zinc-800 bg-black p-3 text-white placeholder:text-zinc-600"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black"
            >
              Submit Request
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
