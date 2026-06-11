import "server-only";

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

export type OpenAIJsonOptions = {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

const openAIRequestTimeoutMs = 12_000;

export function hasOpenAIKey() {
  return Boolean(String(process.env.OPENAI_API_KEY ?? "").trim());
}

export function getOperationalOpenAIModel() {
  return process.env.OPENAI_GOVERNANCE_MODEL ?? "gpt-5.2";
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
}

export async function createOpenAIJsonResponse<T>({
  instructions,
  input,
  schemaName,
  schema,
}: OpenAIJsonOptions): Promise<T> {
  const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), openAIRequestTimeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOperationalOpenAIModel(),
        input: [
          {
            role: "developer",
            content: instructions,
          },
          {
            role: "user",
            content: input,
          },
        ],
        max_output_tokens: 1200,
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI governance request failed: ${response.status}`);
    }

    const payload = (await response.json().catch(() => null)) as OpenAIResponsePayload | null;

    if (!payload) {
      throw new Error("OpenAI governance request returned an invalid response.");
    }

    const outputText = extractOutputText(payload);

    if (!outputText) {
      throw new Error("OpenAI governance request returned an empty response.");
    }

    try {
      return JSON.parse(outputText) as T;
    } catch {
      throw new Error("OpenAI governance request returned invalid JSON.");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI governance request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
