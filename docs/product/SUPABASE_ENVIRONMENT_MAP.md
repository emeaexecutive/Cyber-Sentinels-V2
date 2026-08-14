# Supabase environment map

Last verified: 2026-08-14. This document is the release-owner classification record; names alone are not authority.

| Project ref | Classification | Observed state | Permitted use |
| --- | --- | --- | --- |
| `kecgtsfibkypjuaxqbjx` | **PRODUCTION** | `ACTIVE_HEALTHY` | Read-only release checks unless the owner gives separate, explicit Production authority. Never use for Preview qualification. |
| `agpyhygpfmppjkxwcpac` | **STAGING** | `ACTIVE_HEALTHY`, locally linked, default branch only | Canonical non-Production integration and qualification environment. |
| `hoxcqzeqnflebwrqupue` | **PREVIEW — PR #56** | `ACTIVE_HEALTHY`; branch reports `MIGRATIONS_FAILED` | Password-recovery Preview only. Do not promote while the branch migration gate is red. |
| `xicwnshrnzpjrpgjqcao` | **PREVIEW — PR #55** | `ACTIVE_HEALTHY`; functions deployed | External-agent trust SDK Preview only. Its successful checks do not qualify another branch. |
| `qkubvouilwggilabwpzp` | **UNKNOWN / OUT OF SCOPE** | `INACTIVE`; named TracFace | Not a Cyber Sentinels release target. Do not mutate or reference. |

## Guardrails

- Each Preview deployment must have branch-scoped Supabase URL and keys. A global Preview variable currently falls back to Production, so an unscoped Preview deployment is a release blocker until its own branch overrides exist.
- Staging uses `agpyhygpfmppjkxwcpac` only when a long-lived staging dependency is intended. It is not interchangeable with a disposable Preview database.
- Disposable PR databases must be classified as PREVIEW and may not silently replace STAGING or Production.
- Production is `kecgtsfibkypjuaxqbjx`; scripts and CI guards must fail closed if its ref appears in a non-Production operation.
- Secrets, SMTP credentials, tokens, and password material never belong in this map or qualification output.
- A project absent from this table is `UNKNOWN` until the release owner verifies it.

## Transactional email truth

The repository and Vercel environment inventory do not establish a custom non-Production SMTP host, port, TLS mode, sender, or username. Those settings must be verified in the Supabase Auth provider configuration without exposing credentials. The end-to-end known-account recovery journey—including inbox receipt, single-use link, password update, old-password rejection, and new-password acceptance—remains **NOT PROVEN** as of this verification. This is not an application-code success claim.
