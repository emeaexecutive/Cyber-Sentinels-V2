# Enterprise Onboarding

## Seven-step checklist

| Step | Required input | State or evidence | Completion rule |
| --- | --- | --- | --- |
| Welcome | Pilot scope and data boundary | Controlled pilot | Administrator acknowledges scope |
| Organization setup | Organization name and reviewer contacts | Configured | Workspace administrator and first case are created |
| Identity Provider selection | Supabase Auth, SAML, OIDC or SCIM | Configured, Optional or Awaiting Credentials | Choice is retained in audit metadata |
| Provider configuration status | Adapter readiness | Configured, Optional or Awaiting Credentials | State is retained without implying Live health |
| Trust Policy selection | One of seven enterprise templates | Configured | Thresholds, escalation, review and evidence rules are visible |
| Admin confirmation | Named accountable administrator | Live for the submitted request | Required declaration is submitted |
| First verification walkthrough | Case, evidence and purpose | Live, Configured or Simulated per step | Decision, Replay and next action can be inspected |

## Policy templates

Available templates are AI Operations, Financial Services, Insurance, Healthcare, Critical Infrastructure, General Enterprise and Hiring. Hiring is one workflow template only. Every template keeps a named human reviewer authoritative.

## First verification walkthrough

Create the case, upload only approved evidence, initiate verification, inspect why/evidence/authority/policy/confidence/provider participation, open Replay, review Evidence Graph relationships, inspect the Trust Memory update boundary, record governance ownership, and return to the Enterprise Dashboard.

## Failure handling

If workspace creation fails, no successful onboarding state should be reported. If provider credentials are missing, retain `Awaiting Credentials`. If a real health check is absent, retain `Unknown` even when credentials are present. If Replay or Trust Memory persistence fails, block any claim that the lifecycle is complete and follow the displayed next action.
