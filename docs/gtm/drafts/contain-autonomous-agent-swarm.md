---
publication_status: founder-review
title: How to Contain an Autonomous Agent Swarm
meta_description: Plan layered containment around authority, tool boundaries, provider credentials, evidence and tested human response—not a promised remote kill switch.
question: How can an organisation contain an autonomous agent swarm?
internal_links:
  - /platform
  - /trust
---

# How Can an Organisation Contain an Autonomous Agent Swarm?

**Question:** How can a team limit the impact when several agents are
coordinating work?

Containment should not depend on a single remote-stop promise. A swarm may
include separate runtimes, tools and providers, and an operator may not control
every component. Plan for several independent ways to prevent additional
unauthorised work and to verify what has already happened.

## Plan the response before deployment

**Keep authority bounded.** Define who may delegate work, which actions are
in scope and when human review is required. Do not let one agent's permission
silently become another agent's authority.

**Use controlled action boundaries.** Route consequential work through systems
the organisation can monitor and govern. Identify which controls can pause new
requests, deny a scope or require an accountable person to review.

**Know the provider controls.** Document how to disable or restrict a
credential, integration or runtime using the provider's approved process.
Confirm which actions are reversible and which may already have affected an
external system.

**Preserve evidence and verify effects.** Record the decision and review
context, then check the target system for accepted, rejected or partial
outcomes. A local cancellation signal does not prove that all remote work
stopped.

**Exercise the human plan.** Test roles, escalation paths and communications
with synthetic data in an authorized environment. Record limitations and
retest when dependencies change.

Cyber Sentinels does not describe TENENTE Swarm cancellation or emergency
containment as Production-qualified. Local tests are not proof of hosted
coverage or a guaranteed remote shutdown. The [platform page](/platform)
states this qualification boundary.

**Publication status: Founder review required — not published.**
