import type { CanonicalTrustDecision, CitedStatement } from "./types.ts";

export type RenderedNarrativeSentence = CitedStatement & {
  citations: Array<{ evidenceId: string; source: string; referenceId: string }>;
};

/** Resolves, but never invents, narrative claims against preserved supporting evidence. */
export function renderTrustDecisionNarrative(decision: CanonicalTrustDecision): RenderedNarrativeSentence[] {
  const evidence = new Map(decision.supportingEvidence.map((item) => [item.evidenceId, item]));
  return decision.decisionNarrative.map((sentence) => ({
    ...sentence,
    citations: sentence.evidenceIds.map((evidenceId) => {
      const item = evidence.get(evidenceId);
      if (!item) throw new TypeError(`Narrative citation ${evidenceId} does not resolve.`);
      return { evidenceId, source: item.source, referenceId: item.canonicalReference.id };
    }),
  }));
}
export function formatTrustDecisionNarrative(decision: CanonicalTrustDecision): string[] {
  return renderTrustDecisionNarrative(decision).map((sentence) =>
    `${sentence.text} ${sentence.citations.map((citation) => `[${citation.evidenceId}]`).join(" ")}`,
  );
}
