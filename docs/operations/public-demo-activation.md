# Public Demo Activation Gate

Issue: #82
Status: BLOCKED — dependencies not yet satisfied
Dependencies: #76 (claims/mutability), #77 (privacy), #79 (journeys)

## Purpose

Repeatable gate checklist for activating or maintaining public traffic to the EDUCA demo.
Site and demo have independent activation decisions.

## Prerequisites

| # | Prerequisite | Owner | Status |
|---|-------------|-------|--------|
| P1 | Claims contract (#76) reconciled — README and site match | Human reviewer | ❌ Pending |
| P2 | Privacy contract (#77) decided — policy text stable | Human reviewer | ❌ Pending |
| P3 | Journeys contract (#79) satisfied — J1-J6 pass | This lane | ⚠️ Partial (J1 only without stack) |
| P4 | Deploy alias points to expected SHA | Deploy owner | ❌ Not verified |
| P5 | Demo credential authenticates successfully | Demo owner | ❌ Failing |
| P6 | Rollback rehearsed and owner named | Human | ❌ Not done |

## Gate: Site (geteduca.vercel.app)

### Checks

- [ ] **Deploy convergence:** `vercel inspect` or equivalent shows alias → SHA matching `main` HEAD
- [ ] **Claims match:** visible text matches `README.md` claims contract
- [ ] **Privacy link:** `/privacidade` or equivalent loads and matches #77 decision
- [ ] **Console clean:** no blocking errors in browser console (desktop + mobile)
- [ ] **Network clean:** no failed requests to critical resources
- [ ] **Links valid:** all navigation targets resolve (no 404 on internal links)
- [ ] **Accessibility baseline:** no critical WCAG violations on landing page
- [ ] **Mobile responsive:** key content visible on 375px viewport

### Decision

Site can be active independently of the demo CTA. If demo is not ready, remove or disable the demo CTA without taking down the site.

## Gate: Demo (educa-demo.vercel.app)

### Checks

- [ ] **Deploy convergence:** alias → SHA matches approved release
- [ ] **Credential works:** published demo credential authenticates
- [ ] **J1 passes:** public visitor smoke (non-destructive)
- [ ] **J2-J6 pass locally:** full journey suite against synthetic stack
- [ ] **Sandbox mode active:** `NEXT_PUBLIC_DEMO_SANDBOX=true` confirmed
- [ ] **Signup blocked:** no INSERT on users for authenticated, UI hidden
- [ ] **Destructive actions blocked:** DELETE revoked, UI hidden
- [ ] **Console clean:** no blocking errors
- [ ] **Network clean:** no failed auth or data requests
- [ ] **Rollback owner:** named person can restore last approved deploy

### Decision

Demo receives or maintains traffic ONLY when all checks pass. A single failure blocks activation or triggers rollback to last known-good state.

## Rollback procedure

1. Identify last approved deploy SHA (from activation receipt)
2. `vercel rollback <deployment-id>` or promote previous deployment
3. Verify rollback with J1 smoke
4. Notify stakeholders of rollback reason

**Rollback owner:** TBD (requires human assignment before activation)

## Activation receipt template

```
date: YYYY-MM-DD
surface: site | demo
sha: <commit hash>
alias: <verified URL>
gate_result: pass | fail
blocker: <if fail, description>
activated_by: <person>
rollback_owner: <person>
```

## Current blockers

1. **Deploy do site divergente** — alias público não corresponde ao SHA local
2. **Credencial pública do demo inválida** — login falha no endpoint público
3. **Contrato de privacidade não reconciliado** — #77 pendente
4. **Mutabilidade não reconciliada** — #76 pendente

## Verification methods

- Deploy inspection: `vercel ls` / `vercel inspect` with project access
- Credential test: Playwright login against public URL (non-destructive)
- Console/network: browser DevTools audit or Playwright `page.on('console')` / `page.on('requestfailed')`
- Accessibility: axe-core or Lighthouse on key pages
- Rollback rehearsal: documented dry-run with named owner
