# Security Policy

## Supported versions

ColorSense is pre-release software. Security fixes target the latest release and the `main` branch.

## Reporting a vulnerability

Do not disclose vulnerabilities in public Issues, Discussions, PRs, or logs. Use GitHub private
vulnerability reporting:

`https://github.com/AlvinHsieh/colorsense/security/advisories/new`

Include the affected version or commit, impact, minimal reproduction, and any known mitigation.
Remove credentials, personal data, page content, and unrelated logs.

The maintainer will acknowledge a valid report as soon as practical, coordinate remediation and
disclosure, and credit reporters who want attribution. Do not test against systems or data you do not
own or have permission to access.

## Security boundaries

- The extension must remain local-first.
- Page DOM, form values, screenshots, browsing history, and credentials must never be uploaded.
- Remote code and dynamic evaluation are prohibited.
- Host permissions require an explicit privacy and threat-model review.
- Workflow permissions must remain least-privilege; fork PRs receive no secrets.
