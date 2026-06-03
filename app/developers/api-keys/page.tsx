import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type ApiKeyRow = {
  id: string;
  owner_user_id: string | null;
  label: string | null;
  key_hash: string | null;
  key_prefix?: string | null;
  status: string | null;
  last_used_at: string | null;
  created_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function hashKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

async function createApiKey(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/developers/api-keys");

  const label = String(formData.get("label") ?? "Developer API key")
    .trim()
    .slice(0, 80);
  const rawKey = `cs_${randomBytes(24).toString("hex")}`;
  const keyPrefix = `${rawKey.slice(0, 10)}****`;
  const actor = user.email ?? user.id;

  const { data: key, error } = await supabase
    .from("api_keys")
    .insert({
      owner_user_id: user.id,
      user_id: user.id,
      user_email: user.email,
      label: label || "Developer API key",
      key_hash: hashKey(rawKey),
      key_prefix: keyPrefix,
      status: "active",
      usage_count: 0,
      rate_limit_status: "normal",
    })
    .select("id,label,key_prefix")
    .single();

  if (error || !key) {
    console.error("developer api key insert failed", error);
    redirect("/developers/api-keys?error=create_failed");
  }

  await createAuditLog(supabase, "api_key_created", actor, {
    api_key_id: key.id,
    key_prefix: key.key_prefix,
    actor,
  });
  await createSignal(supabase, "API key created", {
    api_key_id: key.id,
    key_prefix: key.key_prefix,
    actor,
  });

  redirect("/developers/api-keys?created=1");
}

async function revokeApiKey(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/developers/api-keys");

  const keyId = String(formData.get("key_id") ?? "").trim();
  if (!keyId) redirect("/developers/api-keys?error=missing_key");

  const { error } = await supabase
    .from("api_keys")
    .update({ status: "revoked" })
    .eq("id", keyId)
    .or(`owner_user_id.eq.${user.id},user_id.eq.${user.id}`);

  if (error) {
    console.error("developer api key revoke failed", error);
    redirect("/developers/api-keys?error=revoke_failed");
  }

  const actor = user.email ?? user.id;
  await createAuditLog(supabase, "api_key_revoked", actor, {
    api_key_id: keyId,
    actor,
  });
  await createSignal(supabase, "API key revoked", {
    api_key_id: keyId,
    actor,
  });

  redirect("/developers/api-keys?revoked=1");
}

export default async function DeveloperApiKeysPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/developers/api-keys");

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id,owner_user_id,label,key_hash,key_prefix,status,last_used_at,created_at")
    .or(`owner_user_id.eq.${user.id},user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<ApiKeyRow[]>();

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Developer Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold">API Keys</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            Create, label and revoke API keys for server-side integrations. Raw
            keys are not exposed after creation; store secrets securely.
          </p>
        </section>

        {params?.created || params?.revoked || params?.error ? (
          <p
            className={`mt-6 rounded-lg border p-4 text-sm ${
              params?.error
                ? "border-red-900 bg-red-950/20 text-red-200"
                : "border-emerald-800 bg-emerald-950/20 text-emerald-200"
            }`}
          >
            {params?.error
              ? "Could not complete that API key action."
              : params?.created
                ? "API key created. Raw keys are not displayed after creation."
                : "API key revoked."}
          </p>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.4fr]">
          <form action={createApiKey} className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Generate API Key</h2>
            <label className="grid gap-2 text-sm text-zinc-300">
              Label
              <input
                name="label"
                placeholder="Production trust events"
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
              />
            </label>
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Create Key
            </button>
            <p className="text-xs leading-5 text-zinc-500">
              V1 stores only a key hash and masked prefix. SDKs and webhook
              support are planned for future releases.
            </p>
          </form>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Your Keys</h2>
            {!error && (keys ?? []).length ? (
              <div className="mt-5 grid gap-3">
                {(keys ?? []).map((key) => (
                  <article key={key.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {key.label ?? "Developer API key"}
                        </p>
                        <p className="mt-1 font-mono text-sm text-zinc-500">
                          {key.key_prefix ?? "cs_********"}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-100">
                        {key.status ?? "active"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-zinc-500 md:grid-cols-2">
                      <p>Created: {formatDate(key.created_at)}</p>
                      <p>Last used: {formatDate(key.last_used_at)}</p>
                    </div>
                    {key.status !== "revoked" ? (
                      <form action={revokeApiKey} className="mt-4">
                        <input type="hidden" name="key_id" value={key.id} />
                        <button className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-200 hover:text-white">
                          Revoke Key
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No API keys yet. Create a key to start building with Cyber
                Sentinels trust infrastructure.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
