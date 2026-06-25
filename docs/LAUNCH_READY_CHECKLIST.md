# Launch Ready Checklist

## Build and deployment gates

- [ ] Supabase Preview passing - confirm in the hosted Supabase Preview dashboard after the latest migration push. Local schema and RLS sweep documentation is complete, but this checklist should be marked complete only after the hosted preview is visibly green.
- [ ] Build passing - run `npm run build` before launch and after any final copy or navigation change.
- [ ] Git status clean - confirm only intended launch-pack changes are committed.
- [ ] No `.env.local` committed.
- [ ] No service role key exposed client-side.
- [ ] No public admin data exposure.

## Navigation and public UX

- [ ] Dropdown navigation fixed - Platform and Enterprise groups close after menu selection, route change, outside click, and mobile route selection.
- [ ] Primary navigation is compressed to the intended public hierarchy.
- [ ] Public and protected pages are separated.
- [ ] Public informational pages do not unexpectedly demand login.
- [ ] Protected operational pages explain why login is required.
- [ ] No broken public CTA links.

## Demo readiness

- [ ] `/demo` presents the story clearly.
- [ ] `/demo/hiring-attack` shows fake candidate, verification start, Session Integrity failure, Governance Review, Replay Evidence, reviewer action, and Verification Receipt.
- [ ] `/demo/session-integrity` separates liveness, deepfake risk, injection risk, and channel integrity.
- [ ] Demo can be explained in under 90 seconds.
- [ ] Demo path leads naturally to Request Enterprise Access, Become a Design Partner, or Book Intro Call.

## Enterprise and design partner flow

- [ ] `/enterprise` explains Hiring Security, Session Integrity, Governance Review, Verification Replay, and Verification Receipts.
- [ ] `/enterprise-access` works and gives a useful safe response on failure.
- [ ] `/design-partner` explains pilot value and design partner expectations.
- [ ] `/enterprise/pilot` frames the pilot path clearly.
- [ ] Main CTA language is limited to View Demo, Request Enterprise Access, Become a Design Partner, and Book Intro Call.

## Security and RLS

- [ ] RLS checked for unsafe `user_metadata` and `raw_user_meta_data` authorization.
- [ ] Admin policies use `app_metadata` or a server-controlled admin source.
- [ ] No RLS policy references a missing ownership column.
- [ ] `usage_limits` ownership migration order is safe.
- [ ] `interview_sessions` ownership policy is safe.
- [ ] Admin, back-office, dashboard, workspace, and passport routes remain protected.
- [ ] Email verification remains enforced where intended.

## Runtime validation

- [ ] Missing Supabase URL is treated as a blocker.
- [ ] Missing Supabase anon key is treated as a blocker.
- [ ] Broken database connection is treated as a blocker.
- [ ] Admin auth failure is treated as a blocker.
- [ ] Stripe, Hopae, World ID, OpenAI, and Turnstile missing configuration are warnings only.
- [ ] Optional integrations do not block the public app.

## Known deferred items

- Hosted Supabase Preview status must be checked in the external dashboard after pushing the final branch.
- Optional provider integrations remain warning-level until production credentials are configured.
- Compliance and AI transparency surfaces should remain lightweight until a real design partner requires deeper workflow.
- Production analytics and CRM handoff can wait until launch traffic justifies them.
- More customer-specific replay examples should be created only after design partner feedback confirms the right evidence language.
