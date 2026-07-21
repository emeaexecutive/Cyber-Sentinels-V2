# Vercel Production Runbook

This runbook is not evidence that Vercel or Production is configured.

Prerequisites: explicit Production deployment approval, clean quality gates, reviewed Supabase migration, confirmed Vercel project link, Production environment values, and rollback owner.

```powershell
npx vercel inspect
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

Stop on any failed command. After deployment verify `/`, `/api/health`, `/api/ready`, `/dashboard`, `/login`, and `/security` at `https://www.cybersentinels.com`. Check canonical redirects, TLS, CSP/HSTS/frame/content-type/referrer/permissions headers, mixed content, indexing controls, readiness failure behavior, and staging-domain leakage. Record direct evidence; do not infer Cloudflare, DNSSEC, WAF, bot or rate-limit configuration.
