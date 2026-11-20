# Market intelligence baseline — 20 October 2026

## Scope and evidence standard

This is a dated desk-research baseline, not a market-size study. No search
volume, conversion, customer, pricing, market-share or competitor-ranking data
was available or inferred. Buyer-question opportunities below are hypotheses
based on standards and vendor material; validate them with customer interviews
and owner-authorized search-console data.

## Evidence reviewed

| Source | Date / checked | Relevant public evidence |
|---|---|---|
| [NIST AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative) | Checked 20 Oct 2026 | NIST describes technical convenings and gap analysis supporting voluntary guidance and industry-led standards for AI agents. |
| [NIST concept paper record](https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd) | Published 5 Feb 2026; checked 20 Oct 2026 | NIST's proposed identity-and-authorization work explicitly includes agent identification, authorization, auditing, non-repudiation and prompt-injection controls. It is a concept/project paper, not a completed standard or certification. |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | 2026 edition; checked 20 Oct 2026 | OWASP presents a peer-reviewed risk framework for agentic applications. Treat it as risk guidance, not product validation. |
| [OWASP MCP Top 10](https://owasp.org/projects/mcp-top-10) | Checked 20 Oct 2026 | The listed risk areas include token/secret management, privilege scope, tool poisoning, dependency tampering, command injection, contextual prompt injection, authentication/authorization gaps, audit/telemetry, shadow servers and context over-sharing. |
| [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) | Checked 20 Oct 2026 | Practical defensive guidance for securing agent systems; use as a checklist source, not evidence that a product implements each control. |
| [Microsoft Agent Governance Toolkit announcement](https://opensource.microsoft.com/blog/2026/04/02/introducing-the-agent-governance-toolkit-open-source-runtime-security-for-ai-agents/) | Published 2 Apr 2026; checked 20 Oct 2026 | Microsoft positions an open-source toolkit around runtime governance/security for agents. This is a public adjacent solution and not a verified like-for-like comparison. |
| [Microsoft Security: least privilege for AI agents](https://www.microsoft.com/en-us/security/blog/2026/07/16/least-privilege-for-ai-agents-identity-access-and-tool-binding/) | Published 16 Jul 2026; checked 20 Oct 2026 | Microsoft discusses agent identity, access, least privilege and tool binding as relevant access-control concerns. The article is guidance, not a measured product benchmark. |

## High-intent question hypotheses

These are editorial opportunities derived from the sources above, not search
volume measurements:

1. **What is AI agent authority, and how is it different from identity?**
   NIST's identity-and-authorization work makes this a clear buyer education
   question.
2. **How can an organisation authorize an agent for a specific action, purpose
   and target?** Relevant to current policy, least privilege and tool binding.
3. **Why is a one-time identity check not enough for agent execution?**
   Explain changes in action, target, scope and policy without implying a
   universal product feature.
4. **Who authorizes an MCP tool call, and how are target permissions checked?**
   Ground the answer in MCP authentication/authorization and audit risks.
5. **What evidence should be retained after an agent decision?** Separate
   decision evidence from downstream execution evidence.
6. **How should an organisation contain cooperating agents?** Focus on tested
   boundaries, provider controls, human response and verification—not a
   guaranteed remote kill switch.

## Public positioning observations

- Microsoft has public material around an open-source runtime-governance
  toolkit and least-privilege agent access. This demonstrates adjacent market
  language, not that Microsoft is a direct competitor in every Cyber Sentinels
  use case.
- NIST and OWASP provide standards/risk context rather than competing
  commercial products.
- Cyber Sentinels' approved customer message is narrower: determine whether
  AI agents are authorised under current policy and preserve evidence of the
  decision. Do not claim superiority, certification, customer proof or
  production availability without independent evidence.

## Next evidence to collect

- Interview at least five target buyers, with consent, and record their exact
  questions without attributing quotes publicly without permission.
- After founder approval and owner access, export Search Console and Bing
  impressions/clicks for the same query set and compare by page and period.
- Revisit the same queries monthly; record source URL, locale, result type and
  whether an AI answer visibly cites an exact Cyber Sentinels URL.
