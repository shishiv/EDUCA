# P0 security board (R0)

Ordered for the **1 municipality · ~900 students** pilot.  
Source issues live on GitHub; this board is the execution order.

| Order | Issue | Title | Why first |
|------:|-------|-------|-----------|
| 1 | [#28](https://github.com/shishiv/EDUCA/issues/28) | Add RLS write policies for multi-tenant tables | Tenant isolation on writes |
| 2 | [#30](https://github.com/shishiv/EDUCA/issues/30) | Enforce auth + role checks on attendance server actions | Attendance is daily pilot path |
| 3 | [#29](https://github.com/shishiv/EDUCA/issues/29) / [#32](https://github.com/shishiv/EDUCA/issues/32) / [#33](https://github.com/shishiv/EDUCA/issues/33) | Unify `tipo_usuario` vs `role` | Wrong role checks = wrong auth |
| 4 | [#35](https://github.com/shishiv/EDUCA/issues/35) | Critical dependency vulnerabilities | Supply-chain baseline |
| 5 | [#34](https://github.com/shishiv/EDUCA/issues/34) | Harden `/api/health` information exposure | Avoid leaking internals |
| 6 | [#37](https://github.com/shishiv/EDUCA/issues/37) | Consolidate Supabase server client usage | One safe client path |

## Done definition (each item)

- [ ] Fix merged to `main`  
- [ ] Issue closed with short note  
- [ ] If data model changed: migration reviewed for pilot impact  
- [ ] No PII in logs  

## Out of this board

- Educacenso export → R1  
- Demo sandbox → R2  
- Provider-agnostic → R3+  

## Status

| Order | Status |
|------:|--------|
| 1–6 | Open — start after OSS apply surface (README/roadmap) ships |

Last updated: 2026-07-18
