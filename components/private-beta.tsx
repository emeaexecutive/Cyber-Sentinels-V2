import { BETA_MODE, betaNoticeText } from "@/lib/beta-mode";

export function PrivateBetaBadge({ className = "" }: { className?: string }) {
  if (!BETA_MODE) return null;

  return (
    <span
      className={`inline-flex rounded-full border border-cyan-800 bg-cyan-950/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100 ${className}`}
    >
      Controlled Preview
    </span>
  );
}

export function PrivateBetaNotice({ className = "" }: { className?: string }) {
  if (!BETA_MODE) return null;

  return (
    <p className={`text-sm leading-6 text-zinc-400 ${className}`}>
      {betaNoticeText}
    </p>
  );
}

export function FeedbackPrompt({ className = "" }: { className?: string }) {
  if (!BETA_MODE) return null;

  return (
    <div className={`rounded-lg border border-zinc-800 bg-black p-4 ${className}`}>
      <p className="text-sm font-medium text-zinc-100">Was anything unclear?</p>
      <a href="/feedback" className="mt-2 inline-flex text-sm text-cyan-200 hover:text-white">
        Share feedback
      </a>
    </div>
  );
}
