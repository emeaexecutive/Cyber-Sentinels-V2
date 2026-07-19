# Test Data Management

**Status:** Approved policy; automated enforcement is partial

## Data classes

| Class | Permitted use | Production claim |
| --- | --- | --- |
| Synthetic fixture | Local/CI domain and UI tests | Never evidence of real-world accuracy |
| Approved Test Mode | Controlled provider-neutral workflow | Evidence of integration behavior only |
| Provider sandbox | Approved non-production provider account | Evidence of target contract, not Production |
| Reviewed pilot | Consented/approved, tenant-scoped and human-reviewed | May support scoped pilot metrics |
| Production | Customer operational data | Never copied into local/CI tests |

## Rules

- Store only the minimum fields required by the test.
- Never commit secrets, access tokens, raw biometrics, identity documents or customer evidence.
- Version manifests, schemas, expected outcomes and provenance.
- Separate tenants, users and provider accounts by environment.
- Use explicit `demo`, `synthetic`, `test`, `sandbox` or `live` source modes.
- Generated demo records must use deterministic ownership markers and a bounded cleanup procedure.
- Legal hold, retention and deletion policy applies to reviewed pilot data.
- Test artifacts redact email, IP, provider payload and free text unless explicitly approved.

## Provisioning and cleanup

CI creates an ephemeral database, applies every migration, seeds synthetic fixtures, runs tests, exports non-sensitive evidence and destroys the environment. Credentialed target tests create dedicated users/tenants and record cleanup. Cleanup failure is a release finding.

Production smoke tests are read-only by default. A mutating smoke test requires an approved synthetic Production tenant, unique correlation ID, rollback/cleanup owner and evidence retention period.

## Dataset promotion

No dataset moves from synthetic or pending to reviewed/eligible without provenance, consent or approval basis, reviewer attribution, disagreement handling, version lock and quality checks. ORI accuracy-like metrics remain blocked until the repository's reviewed-sample gate is met.

## Access and retention

The Data owner approves access. Security reviews sensitive fields and artifact storage. Test results use the shortest practical retention consistent with audit needs; raw provider responses are not retained when normalized evidence is sufficient.
