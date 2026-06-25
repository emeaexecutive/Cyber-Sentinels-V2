# Account Access UX Refinement

## Purpose

The account access screen now presents a calmer enterprise operational access flow without changing authentication behavior, email verification, middleware, admin routes or RLS.

## CTA hierarchy

Primary action:

- `Sign in`

Secondary action:

- `Create account`

Tertiary text actions:

- `Use magic link`
- `Forgot password?`

The magic-link and password-reset flows still call the existing Supabase handlers. They are visually quieter so password sign-in remains the default path and create-account remains available without competing as an equal primary action.

## Copy updates

The main login copy now reads:

`Access protected verification workflows, operational evidence and governance review systems.`

Supporting line:

`Enterprise workspaces require verified email access.`

The protected-route explanation remains contextual, using the requested destination to explain why login is required before operational trust records are shown.

## Admin access visibility

The visible `Admin Access` link was removed from the public auth screen to reduce public exposure of internal access paths.

No admin routes were deleted. No admin auth logic changed. Admin-only pages remain protected by the existing middleware, admin allowlist and step-up access model.

## Runtime safety

Preserved flows:

- Password sign-in still calls Supabase `signInWithPassword`.
- Account creation still calls Supabase `signUp`.
- Email verification remains required before protected workflows.
- Magic link still calls Supabase `signInWithOtp`.
- Password reset still calls Supabase `resetPasswordForEmail`.
- Redirect behavior still preserves the requested `next` path.

## Manual verification checklist

- Sign in with a verified account.
- Create account with matching passwords.
- Confirm mismatched passwords show `Passwords do not match.`
- Confirm signup shows the email verification message.
- Use magic link from the text action.
- Use password reset from the text action.
- Confirm unverified users are routed to `/verify-email`.
- Confirm protected workflows still require verified email access.
