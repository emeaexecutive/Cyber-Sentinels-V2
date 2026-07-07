import { getVerificationProviderRegistry } from "@/lib/providers/registry";

export type OrchestratedProviderState = "Live" | "Simulated" | "Awaiting Credentials" | "Timeout" | "Failed" | "Disabled";

export type ProviderOrchestrationResult = {
  id: string;
  name: string;
  state: OrchestratedProviderState;
  latency_ms: number;
  weight: number;
  confidence: number;
  evidence: string[];
  limitations: string[];
};

const providerWeights: Record<string, number> = {
  hopae_connect: 0.9,
  cloudflare_turnstile: 0.65,
  stripe_identity: 0.55,
  world_id: 0.55,
};

function normalizeState(provider: ReturnType<typeof getVerificationProviderRegistry>[number]): OrchestratedProviderState {
  if (provider.status === "configured" && provider.implementationState === "active") return "Live";
  if (provider.status === "configured") return "Simulated";
  if (provider.status === "safely_disabled") return "Disabled";
  if (provider.missingEnv.length) return "Awaiting Credentials";
  return "Disabled";
}

async function withTimeout<TValue>(work: Promise<TValue>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      work,
      new Promise<TValue>((_, reject) => {
        timer = setTimeout(() => reject(new Error("provider_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function orchestrateProviders(options: { timeoutMs?: number; includeDisabled?: boolean } = {}) {
  const timeoutMs = options.timeoutMs ?? 250;
  const providers = getVerificationProviderRegistry().filter((provider) => options.includeDisabled || normalizeState(provider) !== "Disabled");
  const started = Date.now();
  const settled = await Promise.allSettled(
    providers.map((provider) =>
      withTimeout(
        Promise.resolve().then<ProviderOrchestrationResult>(() => {
          const state = normalizeState(provider);
          const live = state === "Live";
          return {
            id: provider.id,
            name: provider.name,
            state,
            latency_ms: Math.max(1, Date.now() - started),
            weight: providerWeights[provider.id] ?? 0.35,
            confidence: live ? 0.85 : state === "Simulated" ? 0.45 : 0.15,
            evidence: live ? [provider.evidenceReference] : [],
            limitations: live
              ? ["Provider is configured; output remains one governed signal."]
              : [`Provider state is ${state}; do not treat as production detection.`],
          };
        }),
        timeoutMs
      )
    )
  );

  return settled.map((result, index): ProviderOrchestrationResult => {
    if (result.status === "fulfilled") return result.value;
    const provider = providers[index];
    return {
      id: provider.id,
      name: provider.name,
      state: result.reason instanceof Error && result.reason.message === "provider_timeout" ? "Timeout" : "Failed",
      latency_ms: timeoutMs,
      weight: providerWeights[provider.id] ?? 0.35,
      confidence: 0,
      evidence: [],
      limitations: ["Provider did not return in the runtime window and was isolated from the decision path."],
    };
  });
}
