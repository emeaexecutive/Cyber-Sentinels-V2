export function TrustCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-sentinel-line bg-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-sentinel-muted">{label}</p>
      <p className={highlight ? "mt-1 text-3xl font-semibold text-sentinel-green" : "mt-1 text-lg font-medium text-sentinel-white"}>{value}</p>
    </div>
  );
}
