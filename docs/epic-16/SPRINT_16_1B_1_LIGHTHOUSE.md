# Sprint 16.1B.1 Lighthouse Results

Date: 2026-07-18

Tool: Lighthouse 13.4.0 against `next start` on `127.0.0.1:3107`, using Microsoft Edge headless and the production Next.js build.

## Final scores

| Route / emulation | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Buyer Documentation / mobile 412 x 823 | 79 | 100 | 100 | 100 | 0.9s | 2.4s | 0.007 | 770ms |
| Buyer Documentation / desktop 1350 x 940 | 100 | 100 | 100 | 100 | 0.3s | 0.6s | 0 | 60ms |
| Pilot Checklist / mobile 412 x 823 | 83 | 100 | 100 | 100 | 1.0s | 2.5s | 0 | 590ms |
| Pilot Checklist / desktop 1350 x 940 | 99 | 100 | 100 | 100 | 0.3s | 0.7s | 0 | 80ms |

The existing Enterprise page baseline measured 84 mobile and 100 desktop performance, with Accessibility, Best Practices and SEO at 100. The new pages are within five mobile points and one desktop point of that measured baseline; no critical accessibility, metadata or route failure was reported.

## Findings and resolution

The first audit identified:

- two console `503`s caused by public navigation prefetching admin-gated Enterprise routes;
- an accessible-name mismatch on the mobile Menu button;
- desktop CLS of 0.223 caused by a global adoption rail hydrating beneath pages with their own CTA treatment.

Public navigation now uses public destinations, the button label matches visible text and the two purpose-built pages are excluded from the redundant adoption rail. Final reports record zero console errors, zero accessible-name mismatches and zero desktop CLS.

## Tool limitation

Lighthouse wrote valid JSON reports, then its Windows Chrome launcher emitted `EPERM` while cleaning its temporary profile directory. Scores were extracted from reports with final fetch times after the last production build. Temporary JSON files remain under `.next` and are not committed.
