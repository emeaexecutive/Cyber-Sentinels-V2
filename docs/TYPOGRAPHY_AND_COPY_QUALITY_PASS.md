# Typography and Copy Quality Pass

## Purpose

This pass makes Cyber Sentinels easier to scan, read and explain without changing product behavior, routes, data structures, authentication or row-level security.

## Typography system

- The interface uses a restrained system sans-serif stack with Inter as the preferred face when available.
- Headings use tighter spacing and balanced wrapping.
- Paragraphs use readable wrapping, consistent line height and practical content widths.
- Small interface text is large enough for operational metadata.
- Wide uppercase labels are limited to modest letter spacing.
- Dark-surface body copy, helper text, borders and placeholders maintain clear contrast.

## Copy principles

- Lead with workflow trust, evidence, replay, governance and session integrity.
- Describe what an operator can inspect or decide.
- Prefer short sentences and one idea per paragraph.
- Use `verification receipt` for the retained outcome.
- Use `trust memory` when describing retained historical context.
- Reserve autonomous-system language for the relevant governed capability.
- Avoid repetitive infrastructure claims, vague orchestration language and unsupported certainty.

## CTA hierarchy

Primary actions:

- View Demo
- Request Enterprise Access
- Sign in

Secondary actions:

- Create account
- Become a Design Partner

Tertiary account actions:

- Magic link
- Forgot password
- Administrative access, available only as a discreet footer link for public discovery

## Reviewed surfaces

- Homepage and global navigation
- Account access
- Demo
- Enterprise
- Hiring Security
- Session Integrity
- Governance
- Verification Receipt
- Replay
- Protected Validation Test Lab

## Auth verification

The account access page retains:

- visible Sign in and Create account modes
- password confirmation during account creation
- magic-link access
- password recovery
- verified-email guidance

No auth handler, callback, middleware, admin protection or RLS behavior changed in this pass.
