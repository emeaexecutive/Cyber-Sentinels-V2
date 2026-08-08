# Provider-neutral evidence independence

Status: runtime domain and persistence wiring implemented; provider-specific collection remains configuration-dependent.

This extension stays inside the existing Enterprise Trust Runtime. External registry observations attach to an Operational Entity, responsibility and evidence-independence attach to the Canonical Trust Transaction, enforcement observations extend its chronology and Evidence Graph references, and material provider changes feed existing Replay and Trust Memory paths. It does not introduce an agent registry, IAM service, provider registry, Evidence Graph, decision engine, or control plane.

The canonical flow is:

`Operational Entity -> Authority Lineage + Responsibility Lineage -> Policy Decision -> Operator Request -> Provider Request -> Provider Claim -> Runtime Observation -> Destination Observation -> Business Outcome -> Replay / material Trust Memory`

External identity records are append-only observations. Their presence never grants authority or establishes trust. Owner, purpose, permission, lifecycle, conflict, duplicate and correction changes require canonical re-evaluation through the existing continuity path.

Evidence independence is based on distinct accountable source parties, not the number of systems or events. Operator/provider common ownership reduces independence. “Independently confirmed” requires a corroborating runtime, destination, independent or human-reviewed source owned by a party distinct from both the operator and technology provider.

Every decision persists an immutable snapshot of the entity version, external identities, accountable human, Authority Lineage, Responsibility Lineage, provider health and evidence, independence, policy and ruleset digest, enforcement state, contradictions and reviewer state. Later acknowledgements, observations, corrections and replacement-provider evidence append without changing that snapshot.

The Provider Exit Package builder exports canonical references, normalized evidence, digests, Replay links, history, contradictions and remediation while recursively excluding credential, secret, token, password, biometric and unnecessary raw-personal-data fields.

Known limitations:

- No native external IAM, MSSP, AI gateway or runtime adapter is claimed by this extension.
- The placeholder adapter returns `not_configured` with no evidence.
- Independent confirmation remains `insufficient`, `single_source`, or `multi_source` until genuinely distinct source-party evidence is collected.
- Applying the database migration and configuring real provider/export jobs are deployment steps; repository tests do not prove a live provider connection.

## Permanent architecture principle

IDENTITY PROVIDERS MAY CHANGE.

CONTROL PROVIDERS MAY CHANGE.

OPERATORS MAY CHANGE.

RUNTIME PROVIDERS MAY CHANGE.

THE CUSTOMER'S CANONICAL OPERATIONAL ENTITY AND HISTORICAL TRUST RECORD MUST SURVIVE.

Canonical Operational Entity identifiers are generated and governed by Cyber Sentinels. Okta, Microsoft, Hopae, World ID, Claude, Gemini and every other provider-native identifier may appear only as an external, attributable evidence reference; none may be the sole basis of the canonical identifier.

Provider relationships reuse the existing provider-governance boundary and retain provider type, organization, external relationship, service relationship, Operational Entity, role, effective dates, status, source, native reference, schema version, evidence and control responsibilities, and limitations. Authority Lineage continues to answer what was authorized. Responsibility Lineage separately records who owned, operated, supplied, observed and reviewed the control.
