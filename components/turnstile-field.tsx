import Script from "next/script";

type TurnstileFieldProps = {
  siteKey?: string | null;
};

export function TurnstileField({ siteKey }: TurnstileFieldProps) {
  if (!siteKey) return null;

  return (
    <div className="grid gap-2">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} />
      <p className="text-xs text-zinc-500">Protected by Cloudflare Turnstile.</p>
    </div>
  );
}