# EDUCA product roadmap

**North star:** A municipal education secretary can run the school year on EDUCA (enrollment → attendance → grades → social-program alerts → INEP export) with multi-tenant/LGPD confidence, and a second municipality can self-host or onboard without the founder on call.

**Today:** MVP pilot — **1 municipality · ~900 students**.  
**Site:** https://geteduca.vercel.app  
**Code:** https://github.com/shishiv/EDUCA

This roadmap is honest about scale. The national problem (fragile tooling across many municipalities) is the **mission**; the pilot is the **traction**.

---

## Phases

| Phase | Horizon | Goal |
|-------|---------|------|
| **R0** Stabilize pilot | weeks 1–4 | Daily ops safe for ~900 students |
| **R1** Trust & compliance | months 2–3 | Educacenso + tests + LGPD docs |
| **R2** Multi-school ops | months 4–6 | Network views, sandbox, release discipline |
| **R3** Adoption & OSS depth | months 6–9 | Self-host playbook, 2nd install or external contrib |

### Metrics (simple)

| Metric | R0 | R1 | R2 | R3 |
|--------|----|----|----|-----|
| Pilot students | ~900 | stable | natural growth | 2nd mun or 2nd install |
| Open P0 security | triaged | zero | zero | response process |
| Educacenso export | — | usable | validated | public docs |
| Critical tests in CI | spot | attendance + auth | E2E smoke | required green |
| Stranger time-to-login | claim ~30m | measured | &lt;1h | playbook proven |

---

## R0 — Stabilize the pilot

**Out:** WhatsApp, i18n, provider-agnostic, blog, second municipality.

### Work

1. P0 security & tenancy (see [P0-SECURITY-BOARD.md](./P0-SECURITY-BOARD.md))
2. Pilot top pains only (what blocks weekly use)
3. Minimal observability (safe health, backups)
4. OSS program applications (Claude / Codex) in parallel

### Exit

- [ ] No known P0 security without issue + owner  
- [ ] Attendance + enrollment stable for 2 school weeks without daily hotfixes  
- [ ] Backup restore tested once  
- [ ] OSS applications submitted  

---

## R1 — Trust & compliance

**Out:** Multi-municipality SaaS, native mobile, marketplace.

### Work

1. INEP/Educacenso **export** (fields already mapped)  
2. Bolsa Família reports usable by the secretary (not only UI flags)  
3. School calendar editing enough for the school year  
4. Unit tests + CI (#22, #31); E2E smoke: teacher login → attendance → lock  
5. LGPD pack: RLS review + `docs` assumptions  
6. Selective type/API hygiene on auth/data paths  

### Exit

- [ ] Educacenso export used or validated with the pilot secretary  
- [ ] CI green with attendance + auth tests  
- [ ] LGPD & multi-tenant assumptions doc published  
- [ ] Zero open P0 security  

---

## R2 — Multi-school ops & product depth

### Work

1. Secretary multi-school views + school onboarding checklist  
2. Guardian role if the pilot asks (read-only grades/attendance)  
3. Notifications only if prioritized (else in-app)  
4. Performance for ~900–2k students  
5. Public **synthetic** sandbox (never pilot data)  
6. Semver releases + CHANGELOG notes for the municipality  

### Exit

- [ ] Multi-school architecture validated in the pilot network  
- [ ] Public sandbox without real student data  
- [ ] School onboarding time documented  
- [ ] One “secretaria-ready” release (v0.y)  

---

## R3 — Adoption path & OSS depth

### Work

1. Self-host playbook (Docker, municipal env, go-live checklist)  
2. Real good-first-issues; contributor ladder  
3. One pilot case study (anonymized if needed) + site “Today” honest  
4. Second municipality **or** second install with light support  
5. i18n / provider-agnostic only if demand appears  
6. Security response process (SECURITY.md SLAs that we can keep)  

### Exit

- [ ] Stranger time-to-login &lt;1h with playbook  
- [ ] ≥1 external contribution merged **or** second real install  
- [ ] Public case + site aligned  

---

## Priority backlog (summary)

**P0 (R0):** RLS write, attendance auth, `tipo_usuario` unify, deps/health, pilot pains, OSS apply  
**P1 (R1):** Educacenso export, CI/tests, BF secretary report, calendar edit, LGPD docs  
**P2 (R2–R3):** sandbox, multi-school aggregates, WhatsApp if demanded, self-host, case, second adoption  

**Rule:** if it does not help the ~900-student pilot **or** the compliance/self-host path, it is P2+.

---

## Cadence (sole maintainer)

| Ritual | When |
|--------|------|
| Pilot sync (secretary/school) | weekly 30m |
| Security/correctness ship | continuous in R0 |
| Internal release notes | biweekly |
| Roadmap prune | monthly |

---

## Related docs

- [P0-SECURITY-BOARD.md](./P0-SECURITY-BOARD.md)  
- [PROVIDER-AGNOSTIC-ROADMAP.md](./PROVIDER-AGNOSTIC-ROADMAP.md) (later phase)  
- [ADR-002-repo-boundaries.md](./ADR-002-repo-boundaries.md)  
- [SECURITY.md](../SECURITY.md)  
