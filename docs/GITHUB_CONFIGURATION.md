# GitHub Configuration Baseline

This file is the reviewable source of truth for settings that cannot be enforced by repository files.
Applying them requires an authenticated maintainer and explicit authorization.

## Repository

- Owner/name: `AlvinHsieh/colorsense`
- Visibility: public
- Default branch: `main`
- Issues: enabled
- Private vulnerability reporting: enabled
- Dependabot alerts and security updates: enabled
- Secret scanning and push protection: enabled when the GitHub plan supports them

## Milestone

Create `v0.1 Foundation` for the product/governance baseline, WXT skeleton, CI/security workflows, and
GitHub settings audit.

## Main ruleset

Apply only after the required workflows have completed successfully at least once:

- Require a pull request before merging.
- Require one human approval and CODEOWNERS review.
- Dismiss stale approvals when new commits are pushed.
- Require all review conversations to be resolved.
- Require `PR CI / quality`, `Dependency Review / dependency-review`, and
  `CodeQL / Analyze (javascript-typescript)`.
- Require linear history.
- Block force pushes and branch deletion.
- Do not allow bypass for Agents or bots.

## Planned Issues

1. `chore: establish product and governance baseline`
2. `chore: add WXT React extension foundation`
3. `ci: add PR, main, security and release workflows`
4. `chore: configure labels, milestone and main ruleset`
5. `feat: extract DOM color properties`
6. `feat: detect color-only indicators`
7. `feat: add semantic overlay transformations`
8. `feat: present scan findings in popup`

Issues 1–4 form v0.1 Foundation. Issues 5–8 are backlog only and must not be implemented as part of
the foundation change.
