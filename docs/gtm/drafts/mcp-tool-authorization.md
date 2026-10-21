---
publication_status: founder-review
title: "MCP Security: Who Authorises the Tool Call?"
meta_description: MCP tool availability is not action authority. Learn the questions teams should answer before an agent can affect a target.
question: Who authorizes an AI agent's MCP tool call?
internal_links:
  - /platform
  - /developers
---

# MCP Security: Who Authorises the Tool Call?

**Question:** Who authorises an AI agent's MCP tool call?

The organisation that owns the data and target system must define who may
authorize an action. Making a tool discoverable or reachable through the Model
Context Protocol (MCP) is not the same as granting every agent permission to
use it for every purpose.

A tool call has several distinct boundaries: the identity making the request,
the tool being invoked, the action it performs, the target it affects, and the
data it can read or change. A valid connection at one boundary does not
automatically settle the others.

## Questions for an MCP workflow

- Which agent or service is requesting this call, and under whose
  organisational context?
- What action will the tool perform, and on which target?
- Is the purpose covered by a current delegation and policy?
- Does the request need human review before it can proceed?
- What evidence will show the decision and, separately, the outcome?

Least-privilege access, clear ownership of tool servers, review of changes to
available tools and auditable decisions help reduce avoidable ambiguity. The
MCP security discussion should include both the tool provider and the
organisation deploying the agent; neither a tool description nor an agent's
own reasoning is an authorization policy.

OWASP's public MCP risk material discusses issues such as excessive privilege,
authentication and authorization gaps, inadequate auditability and
unapproved servers. Those categories are a starting point for governance, not
a substitute for reviewing a specific deployment.

Cyber Sentinels' [platform overview](/platform) explains how it positions
current authority, policy decisions and evidence. The public description does
not imply that every MCP integration is hosted or Production-qualified.

**Publication status: Founder review required — not published.**
