# Email And Bot Security

This pass adds a basic pilot-ready account and public-form security layer without introducing major infrastructure.

## Email Verification Model

Cyber Sentinels requires verified email before protected workflows can be accessed. Middleware checks Supabase user email confirmation state and redirects unverified users to `/verify-email`.

Protected areas include:

- Dashboard routes
- Passport routes
- Workspace routes
- Admin and Back Office routes
- Verification workflows
- Trust workflow routes such as receipts, replay, posture and session review

The `/verify-email` page explains:

> Please verify your email before continuing.

## Email Verification Copy

Use this copy in the Supabase email template or production email provider.

**Subject:** Verify your Cyber Sentinels email

**Body:**

Verify your email address

Click the button below to verify your email address and secure your Cyber Sentinels account.

If you did not request this, you can safely ignore this email.

**Button:** Verify email

**Footer:** Visit the Help Centre to learn more or contact support.

Best,  
Cyber Sentinels

## Turnstile Setup

Cloudflare Turnstile is the first bot-protection provider. Google reCAPTCHA remains a fallback option for later if customer requirements demand it.

Set these environment variables in production:

```env
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is used by browser forms. `TURNSTILE_SECRET_KEY` is used server-side to verify submitted tokens. Provider secrets must never be returned to clients or logs.

If Turnstile is not configured, the app does not crash. Runtime validation reports this as a warning, not a blocker.

## Protected Routes And Forms

Server-side bot verification and in-memory rate limiting are applied to:

- `/api/enterprise-access`
- `/api/waitlist`

Client-side practical protection is applied to `/login` for:

- Password login
- Account creation
- Magic-link requests
- Password reset requests

The login page still uses Supabase client auth directly, so this is intentionally a practical guard rather than a replacement for Supabase Auth provider-side limits.

## Public Form Protection

Protected public forms collect a Turnstile token when a public site key is configured. API routes verify that token with Cloudflare when `TURNSTILE_SECRET_KEY` is present.

Invalid or missing configured-provider tokens return a safe error message:

> Security check failed. Please try again.

Provider error details and secrets are not exposed to users.

## Rate Limiting Notes

A lightweight in-memory fallback rate limiter is used for pilot readiness. It is suitable for basic abuse reduction on a single runtime instance but is not a durable distributed control.

Current limits:

- Enterprise access: 6 requests per minute per source IP hash.
- Waitlist: 10 requests per minute per source IP hash.
- Login/signup/password reset: client-side throttling, 8 attempts per minute per action.

A persistent store can replace the fallback later without changing the public form contract.

## Runtime Validation

`/admin/runtime-validation` and `/admin/deployment-readiness` show:

- Email verification
- Bot protection
- Rate limiting
- Public forms protected

Missing Turnstile is a warning so pilot environments remain usable while production configuration is completed.