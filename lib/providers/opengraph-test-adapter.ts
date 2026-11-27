import { hashCanonical } from "@/src/lib/trust-core/hash";
import type { OpenGraphExecution } from "@/lib/providers/opengraph-executor";
import type { normalizeOpenGraphTarget } from "@/src/lib/opengraph/workflow";

export function createOpenGraphTestAdapter(options: { now?: () => Date } = {}) {
  return async (target: ReturnType<typeof normalizeOpenGraphTarget>): Promise<OpenGraphExecution> => {
    const occurredAt = (options.now?.() ?? new Date()).toISOString();
    const normalizedResult = {
      title: "Staging deterministic test adapter",
      description: "No OpenGraph provider request was made.",
      siteName: "Cyber Sentinels Staging",
      type: "test_fixture",
      responseHost: target.domain,
      redirects: 0,
    };
    const digestContent = { provider: "test_adapter", tool: "opengraph.site", target: target.url, occurredAt, normalizedResult };

    return {
      configured: true,
      provider: "test_adapter",
      tool: "opengraph.site",
      requestedTarget: target.url,
      executionAttempted: true,
      providerResponseStatus: null,
      normalizedResult,
      providerNetworkBehaviorAssurance: "NOT_APPLICABLE_TEST_ADAPTER",
      outcomeCertainty: "UNVERIFIED",
      occurredAt,
      evidenceDigest: hashCanonical(digestContent),
      failureCode: null,
    };
  };
}