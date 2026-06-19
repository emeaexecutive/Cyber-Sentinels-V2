export const trustReportBoundaryCopy =
  "Identity verification is one signal. Cyber Sentinels adds governance, evidence, session integrity and human review.";

export function TrustReportBoundary() {
  return (
    <p className="mt-3 rounded-lg border border-cyan-950 bg-black p-4 text-sm leading-6 text-zinc-400">
      {trustReportBoundaryCopy}
    </p>
  );
}
