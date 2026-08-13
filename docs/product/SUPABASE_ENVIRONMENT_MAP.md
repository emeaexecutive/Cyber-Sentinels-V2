# Supabase environment map

Last verified: 2026-08-13. This document is the release-owner classification record; names alone are not authority.

| Project ref | Classification | Observed state | Permitted use |
| --- | --- | --- | --- |
| `kecgtsfibkypjuaxqbjx` | **PRODUCTION** | `ACTIVE_HEALTHY` | Read-only release checks unless the owner gives separate, explicit Production authority. Never use for Preview qualification. |
| `agpyhygpfmppjkxwcpac` | **STAGING** | `ACTIVE_HEALTHY`, locally linked, default branch only | Canonical non-Production integration and qualification environment. |
| `hoxcqzeqnflebwrqupue` | **PREVIEW (disposed)** | Management API returns `404` | Former disposable PR #56 database. No runtime may depend on it. |
| `xicwnshrnzpjrpgjqcao` | **PREVIEW (disposed)** | Management API returns `404` | Former disposable PR #55 database. No runtime may depend on it. |
| `qkubvouilwggilabwpzp` | **UNKNOWN / OUT OF SCOPE** | `INACTIVE`; named TracFace | Not a Cyber Sentinels release target. Do not mutate or reference. |

## Guardrails

- Preview and staging configuration must use `agpyhygpfmppjkxwcpac` only when a long-lived staging dependency is intended.
- Disposable PR databases must be classified as PREVIEW and may not silently replace STAGING.
- Production is `kecgtsfibkypjuaxqbjx`; scripts and CI guards must fail closed if its ref appears in a non-Production operation.
- Secrets, SMTP credentials, tokens, and password material never belong in this map or qualification output.
- A project absent from this table is `UNKNOWN` until the release owner verifies it.

## Transactional email truth

Staging currently uses Supabase default SMTP. Real provider handoff and one controlled recovery-email receipt were observed, but the complete password-change journey was not proven. Custom non-Production SMTP cannot be configured without provider credentials and verified DNS ownership. This is not a request-endpoint defect and must not be worked around in application code.
