---
publication_status: founder-review
title: AI Agent Identity vs Authority
meta_description: Identity answers who or what is acting; authority answers which actions are permitted, for what purpose and under which policy.
question: How is AI agent identity different from AI agent authority?
internal_links:
  - /developers
  - /platform
---

# AI Agent Identity vs AI Agent Authority

**Question:** How is AI agent identity different from AI agent authority?

Identity and authority solve different problems. Identity helps an organisation
recognise a person, service or agent. Authority describes what that identified
actor is permitted to do in a particular situation.

For example, knowing which agent requested a file export does not answer
whether that agent may export those records for this purpose, to this
destination, under the current policy. Authentication can establish an
identity claim; authorization must still assess the requested action and its
context.

## Why the distinction matters

Agent workflows can change as they run. A task may use another tool, address a
different target or require broader access than originally approved. A
permission that was appropriate for one step may not be appropriate for the
next. Organisations should make the delegation specific enough to be reviewed,
and provide a way to pause, deny or withdraw it when circumstances change.

Teams can use four questions to keep the concepts separate:

- **Identity:** Which agent or service is making this request?
- **Authentication:** What evidence supports that identity?
- **Authority:** Who delegated permission, and what boundaries apply?
- **Decision:** Does current policy allow this action now, require review, or
  deny it?

These questions also support accountability. A useful record links the
requested action to the responsible organisation, the applicable policy and
the decision. It should not suggest that an agent can create its own authority
or that a past ALLOW is permanent.

The Cyber Sentinels [developer overview](/developers) and
[platform page](/platform) explain the public product model. Hosted and
Production qualification are separate from local contract tests.

**Publication status: Founder review required — not published.**
