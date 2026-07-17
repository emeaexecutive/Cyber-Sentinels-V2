# Release Readiness

Release 1.2.3 exposes six evidence-linked indicators in the existing protected Enterprise Readiness Center.

| Indicator | Canonical evidence | Production boundary |
| --- | --- | --- |
| Release readiness | `/admin/readiness-gate` | Repository and deployment checks are not certification. |
| Provider readiness | `/admin/provider-status` | Configuration is not successful provider health. |
| ML readiness | `/admin/benchmarking` | Accuracy claims require reviewed dataset thresholds. |
| Security readiness | `/dashboard/session-security` | Source controls require deployed denial-path evidence. |
| Documentation readiness | `/docs/RELEASE_READINESS.md` | Named operator and customer sign-off remains external. |
| Pilot readiness | `/admin/pilot-overview` | A completed reviewed design-partner workflow is still required. |

States are `Ready`, `Review` and `Blocked`. Every state includes evidence, limitation and a link to its canonical owner. Missing evidence cannot resolve to `Ready` by configuration alone.

See `docs/RELEASE_1_READINESS_SCORECARD.md` for the evidence maturity scale and remaining Release 1.0 blockers.

## RC8 Operational Risk Intelligence evidence

Sprint 16.1A adds a controlled operational risk signal in shadow validation. Source implementation, local tests, and migration policy checks do not move release readiness to `Ready`: ORI defaults off, validation is incomplete, and deployed migration plus tenant A/B RLS evidence remains required. See `docs/epic-16/SPRINT_16_1A_ACCEPTANCE.md`.
