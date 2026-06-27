export function EvidenceDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300 ${className}`}>
      Cyber Sentinels orchestrates provider-backed verification signals, workflow evidence,
      governance review and replay. It does not claim perfect real/fake detection.
    </p>
  );
}

