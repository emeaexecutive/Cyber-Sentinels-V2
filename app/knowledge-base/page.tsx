import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type KnowledgeBasePageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    article_id?: string;
    created?: string;
    updated?: string;
  }>;
};

type Article = {
  id: string;
  title: string | null;
  category: string | null;
  summary: string | null;
  body: string | null;
  status: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const categories = [
  "Trust Passport",
  "Evidence",
  "Decisions",
  "Signals",
  "Audit Logs",
  "Trust Graph",
  "Workforce Trust",
  "Intent Verification",
  "Autonomy Governance",
  "Security",
  "Admin Guide",
];

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function createOrEditArticle(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const user = await requireAdminPageAccess(supabase, {
    path: "/knowledge-base",
    action: "save_knowledge_article",
  });
  const actor = user.email ?? user.id;
  const articleId = textValue(formData, "article_id");
  const title = textValue(formData, "title");
  const category = textValue(formData, "category");
  const summary = textValue(formData, "summary");
  const body = textValue(formData, "body");

  if (!title || !body) {
    redirect("/knowledge-base");
  }

  const payload = {
    title,
    category: category || null,
    summary: summary || null,
    body,
    status: textValue(formData, "status") || "draft",
    created_by: actor,
    updated_at: new Date().toISOString(),
    metadata: {
      actor,
      category: category || null,
    },
  };
  const result = articleId
    ? await supabase
        .from("knowledge_articles")
        .update(payload)
        .eq("id", articleId)
        .select("id")
        .single()
    : await supabase
        .from("knowledge_articles")
        .insert(payload)
        .select("id")
        .single();

  if (!result.error) {
    const metadata = {
      knowledge_article_id: result.data?.id ?? articleId,
      actor,
      category: category || null,
    };

    await createAuditLog(
      supabase,
      "knowledge_article_created",
      actor,
      metadata
    );
    await createSignal(supabase, "Knowledge article created", metadata);
  }

  redirect("/knowledge-base?created=1");
}

async function updateArticleStatus(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const user = await requireAdminPageAccess(supabase, {
    path: "/knowledge-base",
    action: "update_knowledge_article_status",
  });
  const actor = user.email ?? user.id;
  const articleId = textValue(formData, "article_id");
  const action = textValue(formData, "action");

  if (!articleId || !["approve", "archive"].includes(action)) {
    redirect("/knowledge-base");
  }

  const now = new Date().toISOString();
  const values =
    action === "approve"
      ? {
          status: "approved",
          approved_by: actor,
          approved_at: now,
          updated_at: now,
        }
      : { status: "archived", updated_at: now };
  const { error } = await supabase
    .from("knowledge_articles")
    .update(values)
    .eq("id", articleId);

  if (!error) {
    const metadata = {
      knowledge_article_id: articleId,
      actor,
    };
    const eventType =
      action === "approve"
        ? "knowledge_article_approved"
        : "knowledge_article_archived";
    const event =
      action === "approve"
        ? "Knowledge article approved"
        : "Knowledge article archived";

    await createAuditLog(supabase, eventType, actor, metadata);
    await createSignal(supabase, event, metadata);
  }

  redirect(`/knowledge-base?article_id=${encodeURIComponent(articleId)}&updated=1`);
}

function StatusChip({ status }: { status?: string | null }) {
  const value = status ?? "draft";
  const styles =
    value === "approved"
      ? "border-emerald-800 bg-emerald-950/20 text-emerald-200"
      : value === "archived"
        ? "border-zinc-700 bg-zinc-900 text-zinc-400"
        : "border-amber-800 bg-amber-950/20 text-amber-200";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${styles}`}>
      {value}
    </span>
  );
}

export default async function KnowledgeBasePage({
  searchParams,
}: KnowledgeBasePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/knowledge-base");
  }

  const adminCheck = await checkAdminAccess(supabase);
  const isAdmin = adminCheck.ok;
  let query = supabase
    .from("knowledge_articles")
    .select("*");

  if (!isAdmin) {
    query = query.eq("status", "approved");
  }

  if (params?.category) {
    query = query.eq("category", params.category);
  }

  const { data: articleRows } = await query
    .order("updated_at", { ascending: false })
    .limit(80)
    .returns<Article[]>();
  const searchNeedle = String(params?.q ?? "").trim().toLowerCase();
  const articles = (articleRows ?? []).filter((article) => {
    if (!searchNeedle) return true;
    return [article.title, article.category, article.summary, article.body]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchNeedle);
  });
  const selectedArticle =
    articles.find((article) => article.id === params?.article_id) ?? articles[0];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Knowledge Base
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Admin Knowledge Base
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Store approved Cyber Sentinels explanations, policies and workflow
            guidance.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                  Articles
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Search governed guidance.
                </h2>
              </div>
              {isAdmin ? (
                <Link
                  href="/knowledge-base"
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  New Article
                </Link>
              ) : null}
            </div>
            <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                name="q"
                defaultValue={params?.q ?? ""}
                placeholder="Search articles"
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              />
              <select
                name="category"
                defaultValue={params?.category ?? ""}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 md:col-span-2 md:w-fit"
              >
                Search
              </button>
            </form>
            <div className="mt-5 grid gap-3">
              {articles.length ? (
                articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/knowledge-base?article_id=${encodeURIComponent(article.id)}${params?.category ? `&category=${encodeURIComponent(params.category)}` : ""}${params?.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                    className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-medium text-zinc-100">
                        {article.title}
                      </h3>
                      <StatusChip status={article.status} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      {article.category ?? "Uncategorized"} /{" "}
                      {formatDate(article.updated_at)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm text-zinc-500">
                      {article.summary ?? article.body}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No knowledge articles available yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                  Article Detail
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedArticle?.title ?? "No article selected"}
                </h2>
              </div>
              <StatusChip status={selectedArticle?.status} />
            </div>
            {selectedArticle ? (
              <>
                <p className="mt-3 text-sm text-zinc-600">
                  {selectedArticle.category ?? "Uncategorized"} / Approved by{" "}
                  {selectedArticle.approved_by ?? "n/a"} /{" "}
                  {formatDate(selectedArticle.approved_at)}
                </p>
                {selectedArticle.summary ? (
                  <p className="mt-5 rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                    {selectedArticle.summary}
                  </p>
                ) : null}
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                  {selectedArticle.body}
                </p>
                {isAdmin ? (
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-900 pt-4">
                    <form action={updateArticleStatus}>
                      <input type="hidden" name="article_id" value={selectedArticle.id} />
                      <input type="hidden" name="action" value="approve" />
                      <button className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400">
                        Approve Article
                      </button>
                    </form>
                    <form action={updateArticleStatus}>
                      <input type="hidden" name="article_id" value={selectedArticle.id} />
                      <input type="hidden" name="action" value="archive" />
                      <button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-400">
                        Archive Article
                      </button>
                    </form>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-5 text-sm text-zinc-500">
                Select an article to view its approved guidance.
              </p>
            )}
          </div>
        </section>

        {isAdmin ? (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
              Admin Actions
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Create or edit an article.
            </h2>
            {params?.created === "1" || params?.updated === "1" ? (
              <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                Knowledge article saved.
              </p>
            ) : null}
            <form action={createOrEditArticle} className="mt-5 grid gap-4 lg:grid-cols-2">
              <input
                type="hidden"
                name="article_id"
                value={params?.article_id ?? ""}
              />
              <label className="grid gap-2 text-sm text-zinc-400">
                Title
                <input
                  name="title"
                  required
                  defaultValue={selectedArticle?.title ?? ""}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                />
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Category
                <select
                  name="category"
                  defaultValue={selectedArticle?.category ?? "Trust Passport"}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Status
                <select
                  name="status"
                  defaultValue={selectedArticle?.status ?? "draft"}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="draft">draft</option>
                  <option value="approved">approved</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Summary
                <textarea
                  name="summary"
                  rows={3}
                  defaultValue={selectedArticle?.summary ?? ""}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                />
              </label>
              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Body
                <textarea
                  name="body"
                  required
                  rows={8}
                  defaultValue={selectedArticle?.body ?? ""}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 lg:w-fit"
              >
                Save Article
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
