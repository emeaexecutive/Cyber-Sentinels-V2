# GitHub main protection specification

## Recommended ruleset for main

- Pull request required before merge.
- Branch must be up to date before merge.
- Required checks: Verify, tests, build, Gitleaks, CodeQL, release qualification for release branches.
- No force push.
- No branch deletion.
- Dismiss stale approvals after relevant changes.
- Require conversation resolution.
- Document merge method.
- Require deployment approval where supported.
- Include administrators only when an explicit emergency process exists.

## Current repository evidence

- Existing workflows cover verification, secret scanning, and CodeQL.
- The repository should not apply ruleset changes automatically without owner approval.
