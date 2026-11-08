export function EvidenceDisclaimer({ className = "", locale = "en" }: { className?: string; locale?: "en" | "es" }) {
  return (
    <p className={`rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300 ${className}`}>
      {locale === "es"
        ? "Cyber Sentinels coordina señales de verificación respaldadas por proveedores, pruebas del flujo de trabajo, revisión de gobernanza y Replay. No afirma detectar perfectamente lo real y lo falso."
        : "Cyber Sentinels orchestrates provider-backed verification signals, workflow evidence, governance review and replay. It does not claim perfect real/fake detection."}
    </p>
  );
}
