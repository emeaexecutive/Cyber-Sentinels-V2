import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

type DraftTarget = "trust_assistant" | "help";

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as {
      question_id?: unknown;
      question_text?: unknown;
      target?: unknown;
    };

    return {
      questionId: String(payload.question_id ?? "").trim(),
      questionText: String(payload.question_text ?? "").trim(),
      target: String(payload.target ?? "").trim(),
      json: true,
    };
  }

  const formData = await req.formData();

  return {
    questionId: String(formData.get("question_id") ?? "").trim(),
    questionText: String(formData.get("question_text") ?? "").trim(),
    target: String(formData.get("target") ?? "").trim(),
    json: false,
  };
}

function redirectWithError(req: Request, code: string, target: DraftTarget) {
  const hash = target === "help" ? "activity" : "trust-assistant";

  return NextResponse.redirect(
    new URL(`/back-office?ai_draft=${code}#${hash}`, req.url),
    { status: 303 }
  );
}

function getArticleContext(
  articles: Array<{
    title: string | null;
    category: string | null;
    summary: string | null;
    body: string | null;
  }>
) {
  return articles
    .map((article, index) =>
      [
        `Source ${index + 1}: ${article.title ?? "Untitled"}`,
        `Category: ${article.category ?? "Uncategorized"}`,
        article.summary ? `Summary: ${article.summary}` : "",
        `Body: ${article.body ?? ""}`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n---\n\n");
}

async function generateDraft(questionText: string, articleContext: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_DRAFT_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You draft admin-reviewed help answers for Cyber Sentinels. Use only the approved knowledge base context. If the context does not support an answer, say: No approved knowledge source available for this specific answer. Do not use general knowledge. Do not claim final approval.",
        },
        {
          role: "user",
          content: [
            "Approved knowledge base context:",
            articleContext,
            "",
            "Question:",
            questionText,
            "",
            "Draft a concise answer for an admin to review before publication.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI draft request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return String(payload.choices?.[0]?.message?.content ?? "").trim();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const payload = await readPayload(req);
  const questionId = payload.questionId;
  const questionText = payload.questionText;

  if (!questionId || !questionText) {
    return payload.json
      ? NextResponse.json(
          { ok: false, error: "Question id and text are required." },
          { status: 400 }
        )
      : redirectWithError(req, "missing_question", "trust_assistant");
  }

  if (!process.env.OPENAI_API_KEY) {
    const message = "AI drafting unavailable — missing OPENAI_API_KEY.";

    return payload.json
      ? NextResponse.json({ ok: false, error: message }, { status: 503 })
      : redirectWithError(
          req,
          "missing_openai_key",
          payload.target === "help" ? "help" : "trust_assistant"
        );
  }

  const { data: articles } = await supabase
    .from("knowledge_articles")
    .select("title,category,summary,body")
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (!articles?.length) {
    const message = "No approved knowledge source available.";

    return payload.json
      ? NextResponse.json({ ok: false, error: message }, { status: 409 })
      : redirectWithError(
          req,
          "no_approved_source",
          payload.target === "help" ? "help" : "trust_assistant"
        );
  }

  const target: DraftTarget =
    payload.target === "help" ? "help" : "trust_assistant";
  const actor = access.user.email ?? access.user.id;
  const now = new Date().toISOString();
  const articleContext = getArticleContext(articles);
  const draft = await generateDraft(questionText, articleContext);

  if (!draft) {
    return payload.json
      ? NextResponse.json(
          { ok: false, error: "No draft was generated." },
          { status: 500 }
        )
      : redirectWithError(req, "empty_draft", target);
  }

  const updateResult =
    target === "help"
      ? await supabase
          .from("help_questions")
          .update({
            answer: draft,
            status: "drafted",
            admin_answered_by: actor,
            updated_at: now,
          })
          .eq("id", questionId)
      : await supabase
          .from("trust_assistant_questions")
          .update({
            answer: draft,
            answer_source: "ai_draft_from_knowledge_base",
            status: "drafted",
            answered_by: actor,
            updated_at: now,
          })
          .eq("id", questionId);

  if (updateResult.error) {
    console.error("AI answer draft update failed", updateResult.error);

    return payload.json
      ? NextResponse.json(
          { ok: false, error: "Could not store answer draft." },
          { status: 500 }
        )
      : redirectWithError(req, "store_failed", target);
  }

  const metadata = {
    question_id: questionId,
    target,
    answer_source: "ai_draft_from_knowledge_base",
    actor,
  };

  await createAuditLog(supabase, "ai_answer_draft_created", actor, metadata);
  await createSignal(supabase, "AI answer draft created", metadata);

  return payload.json
    ? NextResponse.json({ ok: true, draft })
    : NextResponse.redirect(
        new URL(
          `/back-office?ai_draft=created#${
            target === "help" ? "activity" : "trust-assistant"
          }`,
          req.url
        ),
        { status: 303 }
      );
}
