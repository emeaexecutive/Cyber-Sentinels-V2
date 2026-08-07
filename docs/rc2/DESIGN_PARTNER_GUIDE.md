# RC2 Design Partner Guide

## Purpose

RC2 supports a controlled enterprise pilot that demonstrates working trust operations without claiming Production certification, provider accuracy, legal compliance or an SLA.

**Production untouched.** Run the pilot in an isolated environment with synthetic, sandbox or explicitly approved data.

## Roles

| Role | Responsibility |
| --- | --- |
| Enterprise owner | Accepts scope, authority and success criteria |
| Admin | Configures workspace, membership and policy drafts |
| Operator | Runs the workflow and monitors operational status |
| Reviewer | Reviews evidence and records approval rationale |
| Auditor | Inspects immutable history, replay and exports |
| Integration admin | Owns provider credentials and webhook configuration |

Business authority is separate from application role. Record both.

## Controlled walkthrough

1. **Tenant creation** — create one Trust Workspace, record owner, environment, data boundary and correlation reference.
2. **User onboarding** — invite named users, assign least-privilege roles and demonstrate rejected access from a second tenant.
3. **Policy configuration** — create a version, submit it, review evidence, approve it and retain an explicit prior-version rollback reference.
4. **Verification** — run an approved provider or synthetic verification and retain the result, limitations and provider state.
5. **Operational Trust** — evaluate runtime evidence and show why the workflow is allowed, reviewed, escalated or blocked.
6. **Replay** — reconstruct the chronology and confirm the policy, authority, evidence and reviewer references.
7. **Trust Memory** — show the retained material change and reviewed outcome without claiming autonomous learning.
8. **Decision Intelligence** — produce a cited explanation with facts, unknowns, risk, confidence and recommended next action.
9. **Executive reporting** — export a bounded report and verify that it contains no new unsupported facts.

## Success evidence

For every material action retain:

- who acted and their tenant/application role;
- when the action occurred;
- why it was necessary;
- canonical evidence references;
- business authority reference;
- replay reference;
- correlation ID and release version.

The pilot passes when the complete transaction can be independently reconstructed and a second-tenant user cannot access it.

## Demonstration script

Begin at `/enterprise/operations`. Show that missing durable telemetry remains `UNKNOWN`, then move through workspace creation, pilot setup, policy governance, verification, TrustOps, Replay, Trust Memory, Enterprise Trust Platform and Trust Centre reporting.

For investors, answer “Can this run inside an enterprise?” with the working controls: authenticated tenant scope, least-privilege roles, append-only approval evidence, explicit provider state, traceable operations, replayable decisions, retained audit history and deployable runbooks. Do not answer with market claims.

## Stop conditions

Stop the pilot if tenant isolation fails, an admin or mutation route bypasses authorization/CSRF controls, required evidence is missing, a provider is misclassified, recovery cannot be rehearsed, or the release/build reference is unknown.

## Pilot closeout

Export the evidence pack, record open risks and unknowns, revoke temporary access and keys, process retained data according to the approved policy, preserve legal holds, and record the final go/no-go decision with accountable reviewers.
