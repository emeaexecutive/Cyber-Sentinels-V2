# RC4 Release Readiness Scorecard

States are evidence-derived: `Ready`, `Review` or `Blocked`. They are not percentages and do not imply certification.

> RC7 update (2026-07-17): the four controlled-pilot evidence blockers remain open. The RC4 scorecard is historical; the current decision is recorded in `docs/RC7_CONTROLLED_PILOT_DECISION.md`.

| Area | State | Evidence link | Release boundary / next proof |
| --- | --- | --- | --- |
| Architecture | Ready | `/platform`, `docs/TRUST_FABRIC_ARCHITECTURE.md` | Deployment and pilot evidence remain required |
| Validation | Blocked | `/dashboard/validation`, `docs/RC4_VALIDATION.md` | Current reviewed ground truth is 0/30; calibration is incomplete |
| Security | Review | `/dashboard/session-security`, `docs/RC4_SECURITY.md` | Verify target-environment RLS, denial paths, rotation and durable replay controls |
| Performance | Review | `/enterprise/readiness#performance-evidence`, `docs/RC4_PERFORMANCE.md` | Production APM and representative retained samples are outstanding |
| Provider Readiness | Review | `/admin/provider-status`, `docs/RC4_PROVIDER_REALITY.md` | Hopae is production-candidate but needs credentials, health and reviewed pilot evidence |
| Documentation | Ready | `/docs/RC4_RELEASE_SCORECARD.md` | Named operator and customer sign-off remains external |
| Demo | Ready | `/demo/trust-execution-flow`, `docs/RC4_ENTERPRISE_STORY.md` | Controlled Test evidence is not production traffic |
| Pilot Readiness | Review | `/admin/pilot-overview`, `docs/SPRINT_13_4_ACCEPTANCE.md` | Complete one retained, reviewed design-partner workflow |

The protected `/enterprise/readiness` dashboard renders these eight categories and links each status to its canonical evidence surface.

## Release conclusion

RC4 is suitable for controlled enterprise evaluation after the quality gates pass. It is not ready for production accuracy claims or a Live provider claim in an environment without successful real connection evidence.
