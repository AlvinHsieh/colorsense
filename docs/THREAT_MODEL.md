# Threat Model

## Assets

- Page content and user-entered data.
- Browser identity, sessions, and credentials.
- Extension integrity and update channel.
- Repository secrets, release artifacts, and contributor trust.

## Trust boundaries

1. Untrusted web pages to the isolated extension execution world.
2. Popup and injected code to the background service worker.
3. Untrusted Issues, PRs, logs, and dependencies to maintainers and Agents.
4. GitHub Actions to release artifacts and repository permissions.

## Primary threats and controls

| Threat                                   | Control                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Persistent access to sensitive sites     | Use user-triggered `activeTab`; no all-sites host permission                         |
| Malicious runtime message                | Validate discriminated message fields; ignore unknown input                          |
| Page data exfiltration                   | No external API, telemetry, remote code, or DOM transfer                             |
| Prompt injection through project content | Treat all external text as untrusted; never follow privilege-changing instructions   |
| Workflow token abuse                     | Default `contents: read`; elevate only the release or attestation job                |
| Fork PR secret exposure                  | Use `pull_request`, no secrets, no execution through `pull_request_target`           |
| Supply-chain substitution                | Exact dependencies, lockfile, full Action SHAs, Dependabot, CodeQL, SBOM, provenance |
| Tainted artifact                         | Build once, verify contents, checksum, attest, and release that same artifact        |

## Residual risks

Browser APIs may reject restricted URLs, enterprise policies may disable script injection, and future
semantic heuristics may produce false positives. These conditions must fail safely and remain
user-visible and reversible.
