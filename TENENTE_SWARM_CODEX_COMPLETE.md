# NEXT CODEX — TENENTE™ SWARM AUTHORITY CONTROL

## Cyber Sentinels | Multi-Agent Execution Security

**Priority: HIGH — IMPLEMENT NOW**

**Role:** Act as CPTO, principal Zero Trust architect and senior implementation engineer for Cyber Sentinels.

**Objective:** Implement production-grade swarm authority enforcement for autonomous AI agents operating individually, collaboratively, hierarchically and concurrently.

Do not stop at a specification, implementation map or dashboard.

## 1. EXISTING BASELINE

Repository:

`C:\Users\emeae\Desktop\cyber-sentinels-v2-release`

Existing TENENTE branch:

`feat/authority-of-record-tenente`

Existing TENENTE commit:

`cb1a0820177fd59a441f0145e25b67ca127e95f9`

Qualified Core RC:

`5e7b9ed8670f87b8df5884f5c880660125fc4be7`

Read the existing implementation report, Authority of Record specification, TENENTE code, Authority Graph, Trust Gateway, Policy Engine, Receipt, Replay and Trust Memory before editing.

Verify the actual current branch, HEAD, working tree and deployed state.

Preserve all existing functionality.

**Do not alter the frozen Core RC or deploy Production.**

Create an isolated branch from the verified TENENTE implementation, for example:

`feat/tenente-swarm-authority-control`

Preserve any newer committed TENENTE work.

## 2. PRODUCT PRINCIPLE

Cyber Sentinels is the:

**Authority of Record™ for Autonomous Execution.**

TENENTE™ is the guardian of delegated authority.

Extend TENENTE to govern autonomous agent swarms.

Core rule:

**A swarm cannot exercise more authority than its legitimate principals have delegated.**

A swarm must not acquire additional permissions simply by:

- creating more agents;
- splitting tasks;
- running actions in parallel;
- transferring tasks between agents;
- changing orchestration frameworks;
- switching tools or providers;
- combining individual permissions into an unauthorised collective capability.

Identity is not authority.

Authentication is not authorisation.

Swarm membership is not authority.

## 3. PRESERVE THE CANONICAL ARCHITECTURE

Extend:

Identity → Authority → Policy → Runtime Trust Signals → Decision → Execution → Outcome → Receipt → Replay → Trust Memory™

Do not introduce a parallel trust engine.

Reuse existing:

- Agent Registry
- Authority Graph
- TENENTE
- Trust Gateway
- Policy Engine
- ALLOW / REVIEW / DENY
- controlled HTTP/MCP execution
- approval workflow
- canonical receipts
- evidence
- Replay
- Trust Memory™.

Swarm governance is a capability of the existing Cyber Sentinels control plane.

## 4. SWARM IDENTITY AND MEMBERSHIP

Implement canonical swarm context using existing structures wherever possible.

Support:

- tenant ID
- swarm ID
- orchestrator identity
- responsible human/organisation
- participating agents
- agent roles
- parent/child relationships
- task identifiers
- delegation references
- correlation/trace identifiers
- swarm lifecycle state
- environment
- authorised resources and tools.

Support controlled membership changes.

A newly spawned agent must not automatically inherit authority.

Verify its identity, tenant, delegation and permitted capabilities before participation in consequential actions.

Reject forged membership, cross-tenant joins and unknown agents.

## 5. SWARM AUTHORITY GRAPH

Support hierarchical and multi-agent delegation.

Example:

Organisation\
→ Human Principal\
→ Orchestrator Agent\
→ Specialist Agent A\
→ Specialist Agent B\
→ MCP Tool\
→ Resource.

Also support parallel agents sharing the same parent authority.

Every execution must resolve its valid authority path.

Where an actor receives multiple independent grants, use only explicitly valid grants that authorise the exact action. Do not silently combine unrelated partial grants into a broader permission.

Prevent cycles, forged delegation edges, excessive delegation depth and privilege expansion.

Enforce:

- capability restrictions;
- resource restrictions;
- permitted tools;
- environment restrictions;
- transaction limits;
- expiry;
- revocation;
- delegation rights;
- cumulative constraints.

## 6. SHARED SWARM BUDGETS

This is a mandatory security control.

A parent with an aggregate €500 spending limit must not enable five agents to spend €500 each.

Implement shared authority budgets where the parent grant defines aggregate constraints.

Support applicable limits on:

- financial transactions;
- API operations;
- data records exported;
- sensitive-resource access;
- tool executions;
- task execution counts;
- time-window quotas.

Distinguish per-action limits from cumulative limits.

Do not invent a cumulative limit when a grant defines only a per-action threshold; require explicit policy semantics.

Use atomic reservations or equivalent concurrency-safe controls.

Prevent double spending, duplicate reservations and limit bypass through parallel requests.

Record reservations, commitments, releases and failed attempts.

Do not silently release an execution reservation when the downstream outcome is unknown. Reconcile uncertain outcomes before making budget available again.

## 7. PARALLEL EXECUTION AND RACE CONDITIONS

Prove that simultaneous actions cannot exceed aggregate authority.

Use database transactions, locking, atomic updates or another justified concurrency-safe design.

Test:

- two agents racing for the final available budget;
- ten agents executing concurrently;
- duplicate action IDs;
- repeated execution attempts;
- timeout and retry behaviour;
- process interruption between authorisation and execution;
- revoked authority during an in-flight action.

For external side effects, use durable execution state and idempotency where supported.

Do not claim exactly-once downstream execution where the external provider cannot guarantee it.

## 8. SWARM-WIDE REVIEW AND DENY

Maintain canonical decisions:

**ALLOW / REVIEW / DENY**

An unresolved REVIEW must not execute automatically.

A DENY must not execute.

Define and enforce how a blocked parent task affects dependent child tasks.

Do not automatically block unrelated independent tasks unless policy requires it.

Authorised human approval must specify exact scope, limits, expiry and affected tasks.

No blanket approval that silently expands the entire swarm's authority.

## 9. REVOCATION PROPAGATION

Implement effective revocation across delegated authority chains.

When an orchestrator loses authority:

- descendants cannot initiate new actions using that authority;
- pending authorisations are invalidated or re-evaluated;
- queued tasks are blocked where required;
- in-flight tasks are handled according to their actual cancellation capabilities;
- evidence records what could and could not be stopped.

Do not claim an external side effect was cancelled if the downstream provider already completed it.

Re-evaluate authority immediately before consequential execution.

## 10. SWARM KILL SWITCH

Implement an authorised, tenant-scoped emergency stop for controlled swarm execution.

Required:

- authorised operator identity;
- reason;
- timestamp;
- affected swarm and scope;
- durable stop state;
- rejection of subsequent controlled executions;
- treatment of queued and in-flight work;
- evidence and Replay links.

The kill switch must not permit cross-tenant interference.

Restart/resume must require explicit authorised action and revalidation.

## 11. SWARM RECEIPTS AND TRUST MEMORY™

Extend canonical evidence rather than creating a competing receipt system.

Record:

- swarm and orchestrator;
- responsible principal;
- actor and delegation chain;
- task and parent task;
- action and resource;
- policy/version;
- runtime trust signals;
- shared budget reservation;
- decision;
- approval where applicable;
- execution attempt;
- actual downstream outcome;
- anomalies;
- evidence hash/reference;
- timestamps and correlation IDs.

Replay must reconstruct the causal order of actions, including parallel events, from recorded evidence.

Do not fabricate a total execution order where concurrency makes that order unknowable.

Trust Memory must preserve swarm authority and execution history, not conversational history.

## 12. PROVIDER NEUTRALITY

Support the existing provider-neutral architecture.

The enforcement model must work independently of whether agents use:

OpenAI, Anthropic, Google, Microsoft, Salesforce, Siena-style systems, LangChain, CrewAI, AutoGen, custom orchestrators, MCP clients or MCP servers.

Adapters are integration surfaces.

Do not claim an external framework is qualified until a real integration test passes.

Existing HTTP/MCP controlled execution must remain canonical.

## 13. TRUST OPERATIONS CONSOLE

Extend the existing console with a TENENTE Swarm view.

Show authorised users:

- swarm identity and status;
- orchestrator;
- participants;
- delegation relationships;
- effective authority;
- shared budget usage;
- active/pending/blocked tasks;
- REVIEW decisions;
- revocations;
- emergency stop state;
- recent execution receipts;
- Replay links.

Support authorised suspend/revoke/stop operations with audit evidence.

Never expose secrets or cross-tenant data.

The UI must reflect actual persisted runtime state, not mocked records.

## 14. REQUIRED TESTS

Implement real automated tests proving:

1. Valid swarm authority → ALLOW.
2. Unknown agent → DENY.
3. Cross-tenant swarm join → DENY.
4. Forged membership → DENY.
5. Invalid parent delegation → DENY.
6. Child exceeds parent scope → DENY.
7. Delegation cycle → REJECT.
8. Excessive delegation depth → REJECT.
9. Parent expiry → descendant DENY.
10. Parent revocation → descendant DENY.
11. Wrong tool/resource/environment → DENY.
12. Per-action limit enforced.
13. Aggregate shared budget enforced.
14. Ten parallel requests cannot exceed budget.
15. Duplicate request cannot double spend.
16. Retry cannot create duplicate downstream effects where idempotency is supported.
17. REVIEW produces zero automatic executions.
18. Unauthorised reviewer cannot approve.
19. Approval permits only exact approved scope.
20. DENY produces zero downstream effects.
21. Kill switch prevents new controlled execution.
22. Unauthorised kill-switch request rejected.
23. Cross-tenant kill-switch request rejected.
24. Resume requires authorised revalidation.
25. In-flight cancellation limitations recorded accurately.
26. Execution/outcome mismatch produces anomaly evidence.
27. Receipt persists and verification detects tampering.
28. Replay reconstructs delegated authority at decision time.
29. Trust Memory links the swarm lifecycle.
30. Existing TENENTE golden flow remains green.
31. Existing Core security regression remains green.
32. API/OpenAPI/SDK parity remains valid.

Use disposable local infrastructure and real controlled HTTP/MCP execution targets.

Report downstream execution counts, actual persisted database records and concurrency results.

No mocked PASS evidence for hosted or Production claims.

## 15. EXECUTION DISCIPLINE

Docker use for local development is already authorised.

Do not ask again for Docker permission.

Do not reset or delete unrelated containers or volumes.

Use forward-only migrations.

Do not edit previously applied migration files.

Do not mutate shared Staging or Production.

Do not contaminate the qualified Core RC.

Implement, run tests, fix defects and commit the verified changes on the isolated swarm branch.

If a security prerequisite is missing, implement it where feasible or clearly mark the affected functionality PARTIAL.

## 16. FINAL REPORT

Report:

A. Existing functionality reused

B. New swarm implementation

C. Authority Graph changes

D. Shared budget enforcement

E. Concurrency and race-condition proof

F. Revocation propagation

G. REVIEW/DENY enforcement

H. Kill-switch implementation

I. HTTP/MCP execution integration

J. Receipts and evidence

K. Replay and Trust Memory

L. Console changes

M. Database migrations

N. API/OpenAPI/SDK changes

O. Negative and concurrency tests

P. Regression/lint/typecheck/build results

Q. Hosted qualification status

R. Security limitations

S. Files changed and commit SHA

T. Core RC preservation proof

U. Production mutation count

V. Remaining release blockers

Finish with separate classifications:

**CORE PRODUCTION: GO / CONDITIONAL GO / NO-GO**

**TENENTE SWARM: WORKING_LOCAL / PARTIAL / PROVEN_STAGING / PROVEN_PRODUCTION / NOT_BUILT**

## FINAL ACCEPTANCE CRITERION

Demonstrate an orchestrator with an aggregate €500 authority budget delegating tasks to five agents.

Run all five agents concurrently.

Prove that the total committed authorised spending cannot exceed €500, including under retries, concurrency and failures.

Revoke the parent authority.

Prove all descendants are blocked from new controlled execution.

Preserve receipts and Replay evidence explaining every decision.

**A swarm may distribute work. It may not manufacture authority.**

Cyber Sentinels — Authority of Record™ for Autonomous Execution.

TENENTE™ — Swarm Authority Control.

---

## ADDENDUM — TWELVE MANDATORY ADVERSARIAL SWARM SCENARIOS

Implement deterministic automated tests in addition to the 32 tests above. Each must capture initial authority, requested action, actual decision, whether downstream execution occurred, evidence/receipt references, and PASS/FAIL.

1. Five agents distribute a prohibited action across sub-tasks; detect and prevent the aggregate violation.
2. An agent persuades another to act outside delegated scope; DENY.
3. Circular delegation creates a purported authority chain; REJECT.
4. Swarm consensus attempts to override a DENY; DENY remains binding.
5. Agent disappears during an unfinished transaction; mark UNKNOWN/UNREACHABLE and reconcile; never assume COMPLETED.
6. Revoked credentials are reused; reject.
7. REVIEW is bypassed by a cooperating agent; no execution before valid human approval.
8. Cross-tenant swarm evidence is accessed or shared; deny and preserve isolation.
9. A low-privilege agent recruits a privileged peer; recruitment conveys no authority.
10. Emergency suspension races an in-flight external call; block subsequent controlled calls and accurately account for uncancellable in-flight work.
11. Telemetry or policy dependency becomes unavailable; sensitive actions fail closed.
12. Human self-approval or circular approval attempt; reject.

Include positive tests proving legitimate scoped multi-agent execution continues to work.

## CODEX EXECUTION HANDOFF — NO FILE-LOOKUP BLOCKER

This document is the complete acceptance contract. Do not ask for a second attachment or the prior ten-section specification. Preserve the already-created `feat/tenente-swarm-authority-control` branch and its work. First inspect branch/HEAD/worktree, then implement remaining controls, run tests, fix failures, commit, and report evidence. Do not deploy or mutate Production or shared Staging. Do not modify frozen Core RC. No mock PASS claims.
