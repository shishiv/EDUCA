# Security Policy

## Reporting a vulnerability

Report security issues **privately** through GitHub's private vulnerability reporting. Do not open a public issue for a security problem.

1. Open the repository's **Security** tab and click **Report a vulnerability**, or go directly to:
   <https://github.com/shishiv/EDUCA/security/advisories/new>
2. Include what you found, how to reproduce it, and the impact you observed.

The report is visible only to repository maintainers until it is triaged. If you cannot use the form, email the maintainers at the address shown in commit history instead.

## What to expect

EDUCA is a small, pilot-stage project maintained on a best-effort basis. Response expectations, not guarantees:

- **Acknowledgment:** you will get an acknowledgment within a few business days of a complete report.
- **Triage:** the maintainer will assess severity and impact and reply with a plan or follow-up questions.
- **Fix:** fixes land on `main` as fast as the project's capacity allows. There is no committed SLA for a fix release.
- **Disclosure:** we practice coordinated disclosure. We will not publish a report publicly before a fix is available, and we ask reporters to give us a reasonable window (90 days by default) before public disclosure.

If a report is found to be out of scope or a false positive, we will close it with an explanation.

## Scope

This policy covers the code in this repository. Dependencies are covered through their own upstream security policies; report dependency vulnerabilities upstream first.

## Out of scope

- Data that belongs to a live municipality deployment - this project currently runs a synthetic-only pilot foundation and does not hold real student data.
- General configuration or usage questions - open a GitHub Discussion instead.
