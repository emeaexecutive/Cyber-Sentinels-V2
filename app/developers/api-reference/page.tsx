import type { Metadata } from "next";
import Link from "next/link";
import { publicApiOpenApi } from "@/lib/public-api/v1/openapi";

const methods = ["get", "put", "post", "patch", "delete", "options", "head"] as const;
const methodStyles: Record<string, string> = {
  get: "border-cyan-800 text-cyan-200",
  post: "border-emerald-800 text-emerald-200",
  put: "border-amber-800 text-amber-200",
  patch: "border-fuchsia-800 text-fuchsia-200",
  delete: "border-rose-800 text-rose-200",
  options: "border-zinc-700 text-zinc-200",
  head: "border-zinc-700 text-zinc-200",
};

function summarizeSchema(schema: Record<string, unknown> | undefined): string {
  if (!schema) {
    return "No schema";
  }

  if (typeof schema === "string") {
    return schema;
  }

  if (schema.$ref) {
    const ref = String(schema.$ref).split("/").pop();
    return ref ? `Reference: ${ref}` : "Reference";
  }

  if (schema.type === "array") {
    return `array of ${summarizeSchema(schema.items as Record<string, unknown> | undefined)}`;
  }

  if (schema.type === "object") {
    const properties = Object.keys((schema.properties as Record<string, unknown>) ?? {});
    const required = Array.isArray(schema.required) ? schema.required : [];
    const preview = properties.slice(0, 4).join(", ");
    const suffix = properties.length > 4 ? ", …" : "";
    return `object${preview ? ` (${preview}${suffix})` : ""}${required.length ? ` · required: ${required.join(", ")}` : ""}`;
  }

  if (schema.enum) {
    return `enum: ${String(schema.enum).slice(0, 120)}`;
  }

  if (schema.const) {
    return `const: ${String(schema.const)}`;
  }

  return typeof schema.type === "string" ? schema.type : "value";
}

function getExampleValue(example: unknown): string {
  if (!example) {
    return "";
  }

  if (typeof example === "string") {
    return example;
  }

  return JSON.stringify(example, null, 2);
}

function getRequestExample(operation: Record<string, unknown>): string {
  const requestBody = operation.requestBody as Record<string, unknown> | undefined;
  const content = requestBody?.content as Record<string, unknown> | undefined;
  const jsonContent = content?.["application/json"] as Record<string, unknown> | undefined;
  const example = jsonContent?.example;
  const examples = jsonContent?.examples as Record<string, unknown> | undefined;
  if (example) {
    return getExampleValue(example);
  }

  if (examples) {
    const firstExample = Object.values(examples)[0] as Record<string, unknown> | undefined;
    return getExampleValue(firstExample?.value ?? firstExample);
  }

  return "";
}

function getResponseExample(operation: Record<string, unknown>): string {
  const responses = operation.responses as Record<string, any> | undefined;
  if (!responses) {
    return "";
  }

  const successResponse = Object.entries(responses).find(([status]) => /^2\d\d$/.test(status));
  if (!successResponse) {
    return "";
  }

  const content = successResponse[1]?.content?.["application/json"] as Record<string, unknown> | undefined;
  const example = content?.example;
  const examples = content?.examples as Record<string, unknown> | undefined;
  if (example) {
    return getExampleValue(example);
  }

  if (examples) {
    const firstExample = Object.values(examples)[0] as Record<string, unknown> | undefined;
    return getExampleValue(firstExample?.value ?? firstExample);
  }

  return "";
}

export const metadata: Metadata = {
  title: "API Reference | Cyber Sentinels",
  description: "Human-readable reference for the canonical Cyber Sentinels V1 OpenAPI contract.",
  alternates: { canonical: "/developers/api-reference" },
};

export default function DevelopersApiReferencePage() {
  const entries = Object.entries(publicApiOpenApi.paths).sort(([left], [right]) => left.localeCompare(right));

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Developer API reference</p>
              <h1 className="mt-3 text-4xl font-semibold">Canonical V1 API reference</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                This page renders the canonical OpenAPI contract for Cyber Sentinels V1 in a developer-readable format. The machine-readable JSON remains public at the raw endpoint below.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/api/v1/openapi.json" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100">
                View raw OpenAPI JSON
              </Link>
              <Link href="/developers/docs" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200">
                Back to developer docs
              </Link>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">OpenAPI</p>
              <p className="mt-2 text-lg font-semibold text-white">{publicApiOpenApi.openapi}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Paths</p>
              <p className="mt-2 text-lg font-semibold text-white">{entries.length}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Version</p>
              <p className="mt-2 text-lg font-semibold text-white">{publicApiOpenApi.info.version}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-5">
          {entries.map(([pathName, pathItem]) => (
            <article key={pathName} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-cyan-200">{pathName}</p>
              </div>
              <div className="mt-4 space-y-4">
                {methods.flatMap((method) => {
                  const operation = (pathItem as Record<string, unknown>)[method] as Record<string, unknown> | undefined;
                  if (!operation) {
                    return [];
                  }

                  const scopes = Array.isArray(operation["x-required-scopes"]) ? operation["x-required-scopes"] : [];
                  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
                  const requestBody = operation.requestBody as Record<string, unknown> | undefined;
                  const responseSchemas = operation.responses as Record<string, any> | undefined;
                  const successResponse = Object.entries(responseSchemas ?? {}).find(([status]) => /^2\d\d$/.test(status));
                  const errorCodes = Object.keys(responseSchemas ?? {}).filter((status) => /^(4|5)\d\d$/.test(status));
                  const requestExample = getRequestExample(operation);
                  const responseExample = getResponseExample(operation);
                  const description = typeof operation.description === "string" ? operation.description : undefined;
                  const summary = typeof operation.summary === "string" ? operation.summary : undefined;

                  return [
                    <div key={`${pathName}-${method}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${methodStyles[method]}`}>
                          {method.toUpperCase()}
                        </span>
                        <h2 className="text-xl font-semibold text-zinc-100">{summary ?? `${method.toUpperCase()} ${pathName}`}</h2>
                      </div>
                      {description ? <p className="mt-3 text-sm leading-7 text-zinc-400">{description}</p> : null}
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Authentication & scopes</h3>
                          <p className="mt-3 text-sm text-zinc-300">Authentication: Bearer API key</p>
                          <p className="mt-2 text-sm text-zinc-300">Required scopes: {scopes.length ? scopes.join(", ") : "none"}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Parameters</h3>
                          {parameters.length ? (
                            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                              {parameters.map((parameter) => {
                                const param = parameter as Record<string, unknown>;
                                const schema = param.schema as Record<string, unknown> | undefined;
                                return (
                                  <li key={String(param.name)} className="rounded border border-zinc-800 bg-black px-3 py-2">
                                    <span className="font-semibold text-white">{String(param.name)}</span> <span className="text-zinc-500">[{String(param.in)}]</span> — {summarizeSchema(schema)}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm text-zinc-400">No path, query, or header parameters.</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Request schema</h3>
                          {requestBody ? (
                            <div className="mt-3 space-y-3 text-sm text-zinc-300">
                              <p><span className="font-semibold text-white">Content type:</span> application/json</p>
                              <p><span className="font-semibold text-white">Schema:</span> {summarizeSchema((requestBody.content as Record<string, any>)?.["application/json"]?.schema as Record<string, unknown> | undefined)}</p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-zinc-400">No request body.</p>
                          )}
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Response schema</h3>
                          <p className="mt-3 text-sm text-zinc-300">{successResponse ? summarizeSchema(successResponse[1]?.content?.["application/json"]?.schema as Record<string, unknown> | undefined) : "No success schema declared"}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Error codes</h3>
                          <p className="mt-3 text-sm text-zinc-300">{errorCodes.length ? errorCodes.join(", ") : "No explicit error codes"}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Example response</h3>
                          {responseExample ? <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-black p-3 text-xs leading-6 text-cyan-100">{responseExample}</pre> : <p className="mt-3 text-sm text-zinc-400">No example response.</p>}
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Example request</h3>
                        {requestExample ? <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-black p-3 text-xs leading-6 text-cyan-100">{requestExample}</pre> : <p className="mt-3 text-sm text-zinc-400">No example request.</p>}
                      </div>
                    </div>,
                  ];
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
