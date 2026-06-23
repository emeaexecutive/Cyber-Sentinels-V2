# Pilot Security Lockdown

Cyber Sentinels pilot access now uses the existing auth, middleware, Turnstile, rate limiting and admin validation surfaces to reduce account and public form abuse before wider rollout. This pass intentionally avoids new architecture and keeps the controls readable for operators.

## Email Verification Enforcement

Protected user workflows require a signed-in Supabase user with a confirmed email timestamp before continuing. Middleware redirects unverified users to `/verify-email` with the original destination preserved in `next`.

Protected boundaries include:

- `/dashboard` and dashboard subroutes
- `/passport` and `/passports`
- `/workspace`
- verification workflows such as `/verify/session`, `/verify/candidate`, `/verify/recruiter` and related trust routes
- admin and back-office paths after admin checks

The `/verify-email` page remains public, so unverified users do not loop back through the protected middleware gate. The page uses the pilot message: "Please verify your email before continuing."

## Bot Protection Reliability

Cloudflare Turnstile remains the first provider. Google reCAPTCHA remains a later fallback behind the provider abstraction.

Public request forms send Turnstile tokens when a site key is configured:

- `/enterprise-access`
- `/pro-waitlist`, which posts through `/api/enterprise-access`
- waitlist forms that post to `/api/waitlist`

API routes verify the token server-side through `verifyTurnstileToken(token, ip)`. Missing or invalid checks return the safe user-facing message: "Security check failed. Please try again."

If Turnstile secrets are missing, development can bypass the provider check so local work does not break. Production fails safely until `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are configured. Admin validation reports this as a warning rather than crashing the app.

## Rate Limiting

The existing lightweight in-memory limiter is applied to public API submissions and paired with client-side throttling for account actions.

Current coverage:

- `/api/enterprise-access`
- `/api/waitlist`
- login attempts
- signup attempts
- magic-link attempts
- password reset attempts

When a limit is exceeded, users see: "Too many attempts. Please wait and try again."

This is acceptable for pilot readiness. A persistent store can replace the in-memory fallback later if traffic volume or multi-region deployment requires durable counters.

## Admin Security

Admin and back-office routes remain admin-only through the existing middleware and server-side admin access checks.

Protected admin boundaries include:

- `/admin/*`
- `/back-office`
- `/admin/runtime-validation`
- `/admin/deployment-readiness`

Access still requires a valid Supabase session, an allowlisted admin email and the existing admin verification cookie where required.

## Runtime Validation

Admin validation now presents the pilot security controls as clear OK / Warning style checks:

- Email verification
- Bot protection
- Rate limiting
- Public forms protected

Missing Turnstile configuration is a warning because the app should not crash, but production public submissions fail safely until the secret and site key are present.

## Pilot Readiness Notes

The lockdown confirms the security posture needed for early pilot access without turning Cyber Sentinels into a large security infrastructure project. The controls focus on verified account access, public form abuse prevention, safe auth redirects, admin-only operational views and clear operator-readable validation.