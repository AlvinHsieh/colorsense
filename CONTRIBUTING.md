# Contributing to ColorSense

Thank you for helping make color-dependent interfaces understandable without relying on color alone.

## Before starting

1. Search existing Issues.
2. Use an Issue Form to describe the user, observable problem, scope, non-goals, risk, and measurable
   acceptance criteria.
3. Wait for the Issue to receive `status/ready` before implementation.
4. Security vulnerabilities must follow [SECURITY.md](SECURITY.md), not the public Issue process.

Every code change must link one primary Issue, and every PR must have one primary purpose.

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm build:chrome
```

Use Node.js 22 LTS or newer and pnpm 10.13.1.

## Branches and worktrees

- Feature: `feat/<issue>-<slug>`
- Fix: `fix/<issue>-<slug>`
- Maintenance: `chore/<issue>-<slug>`

Optional isolated worktrees belong under `.worktrees/issue-<number>`.

## Required verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build:chrome
pnpm package:chrome
```

List the actual commands and results in the PR. Do not mark a check that was not run.

## Pull requests

- Use `Closes #<issue>`.
- Explain the problem, solution, non-goals, and user-visible behavior.
- Include test evidence, screenshots when applicable, residual risks, and rollback steps.
- Keep the diff focused. Do not mix unrelated refactoring.
- Resolve all review conversations and obtain required human and CODEOWNERS approval.

AI-generated changes are welcome, but the author remains responsible for correctness, licensing,
security, privacy, and review quality. AI review does not replace required human review.
