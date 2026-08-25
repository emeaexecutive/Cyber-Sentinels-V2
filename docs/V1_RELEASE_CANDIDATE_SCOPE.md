# Cyber Sentinels V1 Release-Candidate Scope

Classification: `V1 PRODUCTIZATION / RELEASE ENGINEERING`

Architecture status: **FROZEN**

This release candidate consolidates the existing Canonical Trust Fabric, Authority Integrity, Track + Block, Trust Forecast, Trust Twin, Trust Pressure, Trust Budget, Counterfactual Simulation, Adaptive Verification, Sentinel Agents, VALE, provider-neutral evidence, AI Deployment Trust Gate, Evidence Graph, Replay, Trust Memory, and Canonical Receipt.

It introduces no parallel evaluator, graph, replay system, memory system, receipt system, identity model, evidence store, or Sentinel decision engine. Only the canonical evaluator may issue `ALLOW`, `REVIEW`, or `DENY`.

## Included source groups

- Authority Integrity and authorization-propagation evidence.
- Trust Forecast and canonical decision-time integration.
- Derived Trust Twin, Trust Pressure, Trust Budget, and counterfactual simulation.
- Adaptive Verification proof requirements and read-only coverage API.
- Sentinel Agent observation, investigation, recommendation, lifecycle, API, and UI surfaces.
- Provider-neutral evidence context and canonical receipt projection.
- Deterministic unit, integration, security, migration-contract, deny-path, and allow-control tests.
- V1 architecture-freeze documentation.

## Explicitly excluded

- Production-proof file changes or generated proof artifacts.
- Dependency or Dependabot upgrades.
- Production deployment, migration application, provider activation, or production data writes.
- Any merge to `main`.

## Migration plan

Apply only after hosted qualification and explicit production authorization:

1. `20260824181053_authority_integrity_authorization_propagation.sql`
2. `20260824184543_trust_forecast_operational_intelligence.sql`

Both migrations replace the same three canonical graph, replay, and memory functions. They create no tables, enable no new public API surface, use `SECURITY DEFINER` with an empty `search_path`, qualify `extensions.digest`, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution only to `service_role`.

The functions are expected to remain owned by the migration owner (`postgres` in the current production baseline), so they bypass RLS by design. Tenant isolation therefore depends on both the explicit `enterprise_id` predicates in every read/write and the existing authenticated server boundary that controls the service-role caller. Migration qualification must test wrong-tenant identifiers, function ACLs, function owner/search path, graph/replay/memory linkage, and transactional rollback on any failure.

These migrations are forward-only `CREATE OR REPLACE FUNCTION` changes. Recovery requires restoring the previously captured function definitions with a separately reviewed repair migration; neither file should be reversed by deleting data or rewriting the migration ledger.
