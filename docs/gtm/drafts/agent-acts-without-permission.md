---
publication_status: founder-review
title: When an AI Agent Acts Without Permission
meta_description: A practical response starts by containing the action, preserving evidence, checking downstream effects and restoring appropriate authority.
question: What happens when an AI agent acts without permission?
internal_links:
  - /platform
  - /verification-replay
---

# What Happens When an AI Agent Acts Without Permission?

**Question:** What should an organisation do when an AI agent attempts an
unauthorised action?

Treat the event as an operational incident, not as proof that the agent
understood or accepted the organisation's rules. First, prevent additional
unapproved actions at a control boundary the organisation can actually
operate. If a request is still pending, hold or deny it. If an external system
may already have acted, verify the result there rather than assuming a policy
decision reversed it.

## A responsible response

1. **Contain further activity.** Pause the relevant workflow or restrict the
   affected authority using controls the organisation has tested. Do not rely
   on a remote shutdown feature unless the connected runtime and provider have
   been proven to support it.
2. **Preserve evidence.** Record the request, actor context, time, policy
   decision, human review and any downstream acknowledgement that is available.
   Keep evidence protected and retain only what policy permits.
3. **Check the effect.** Confirm whether the target system accepted, rejected
   or partially applied the request. A DENY response at one boundary does not
   prove what happened in another system.
4. **Restore appropriate authority.** Review the delegation, policy and
   credentials involved. If a credential is suspected to be exposed, follow
   the provider's approved response and rotation process; do not improvise a
   reset.
5. **Review and learn.** Identify whether the request, scope, monitoring or
   human escalation path needs improvement. Do not broaden permissions merely
   to make a workflow succeed.

The goal is a measured response: stop what can be stopped, verify what
happened, and keep responsibility with the organisation. [Replay](/verification-replay)
can help teams examine recorded decisions where the relevant evidence exists.
Cyber Sentinels describes a model for policy decisions and evidence on its
[platform page](/platform); selected local tests do not prove hosted or
Production readiness.

**Publication status: Founder review required — not published.**
