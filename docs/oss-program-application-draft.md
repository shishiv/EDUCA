# OSS program application draft (EN)

**For:** Claude for Open Source · Codex for Open Source  
**Repo:** https://github.com/shishiv/EDUCA  
**Site:** https://geteduca.vercel.app  
**Role:** Sole maintainer  
**Date prepared:** 2026-07-18  

Copy/paste and adjust. Do **not** invent stars, municipalities served, or downloads.

---

## Short project summary

EDUCA is MIT-licensed open-source school management for Brazilian municipal education networks (Next.js, Supabase/PostgreSQL, multi-tenant design).

**Problem:** Municipal school networks need modern tools for enrollment, attendance, grades, and compliance (INEP/Educacenso, Bolsa Família frequency rules, LGPD). Much of that work still runs on fragile or paper-based processes; proprietary stacks are expensive and often a poor fit for local rules.

**Today:** We are running an **MVP pilot with one municipality and approximately 900 students**, validating core flows and Brazil-specific domain rules (attendance immutability, multi-tenant isolation, compliance fields). We are **not** claiming national production scale.

**Ask:** Six months of Claude Max 20x / ChatGPT Pro would accelerate hardening security and RLS for real student data, finishing Educacenso export, expanding automated tests on pilot-critical paths, and improving self-host documentation—so we can responsibly move from this pilot toward broader open adoption.

---

## How we will use the grant (next 6 months ≈ R0–R1)

1. Multi-tenant **RLS write policies** and **auth/role checks** on attendance and related server actions (pilot handles real student data).  
2. Finish **INEP/Educacenso export** (fields mapped; export still partial).  
3. **CI + unit/E2E tests** on attendance and auth paths.  
4. **LGPD / multi-tenant assumptions** documentation for operators.  
5. Close pilot-blocking product gaps discovered with ~900 students in daily use.  
6. Self-host and contributor docs so others can adopt without the founder on call.

Full roadmap: [ROADMAP.md](./ROADMAP.md).

---

## Evidence checklist (for form fields)

| Field | Value |
|-------|--------|
| GitHub | https://github.com/shishiv/EDUCA |
| Homepage | https://geteduca.vercel.app |
| License | MIT |
| Stars / forks | 0 / 0 (early public OSS — be honest) |
| Traction | 1 municipality · ~900 students · MVP pilot |
| Community | Telegram + GitHub Discussions (early) |
| Demo | Public site; pilot data private (LGPD); synthetic seed under `supabase/seed-demo/` |
| Activity | Active sole maintainer; public OSS launch prep mid-2026 |

---

## Claude-specific note

Best use of Max 20x: multi-file security/domain refactors, compliance docs, Educacenso work, ADR-quality reasoning on multi-tenant design.

## Codex-specific note

Best use of ChatGPT Pro + Codex: high-throughput PRs for tests, CI, dependency fixes, small auth/RLS patches on the pilot cadence.

---

## Links to open

- Claude for Open Source: https://claude.com/contact-sales/claude-for-oss  
- Codex for Open Source: OpenAI rolling application form (from OpenAI Dev / Codex OSS announcement)

After submit: save confirmation email/screenshot and date here or in your private notes.
