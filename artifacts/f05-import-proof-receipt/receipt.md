# Governed pilot CSV proof receipt

This evidence was generated against a disposable PostgreSQL cluster and one database named educa_pilot_proof_936779. The CSV contained synthetic rows only. No demo or production endpoint was used.

| Check | Observed |
| --- | --- |
| runId | 20260917T091328Z-ttOJHC |
| Source commit SHA | 492da58becd059dfc4b30e4a9ab12268dae99205 |
| Source working tree dirty | false |
| Selection manifest | selection.sha256 |
| Selection SHA-256 | 34f47a0969346537eb65e767a81f3ea26311638c0dcb39bdf3894da4d5c12c5f |
| PostgreSQL stopped and workspace removed | true |
| Target | isolated-proof |
| Source mode | synthetic |
| Batch | f5dec6e0-2876-4378-814c-7d88a6aa511b |
| CSV rows | 1 |
| Canonical rows | 1 student, 1 guardian, 1 relationship, 1 enrollment |
| Storage objects owned before rollback | 1 |
| Storage object fingerprint | bf4d803071702661a6c6d10640614d395cd4a9dc364765f88436dbced29b1845 |
| Source SHA-256 | 668ec2f25eb2b8f743c4e1995222e266c2444f6ddc38fbe9efde244b1aa702d5 |
| Canonical SHA-256 | 1e87cc7f4637d193c5a94c2918736629e1572e00a7d4c5824166d425e8aa96f5 |
| Database SHA-256 | 59463dfcf240a31202f82a7c3999d32865858294790daa8f32a3090b6bcc4b1e |
| Governance manifest version | educa-synthetic-pilot-governance-v1 |
| Governance SHA-256 | 3d72d4d6bd0aa7d1ff1a7215b66ea1f13d954e71ffb72cd45cb00d9884baff4d |
| Ciphertext at rest before retention cleanup | true |
| Plaintext payload stored | false |
| Owner and agreement recorded | true |
| Receipt contains no CSV or PII | true |
| Safety deliberate breaks: target, host, demo, demo reference, real mode, missing marker, missing data mode, pilot disabled | red, no batch mutation |
| Deliberate break without owner | red |
| Governance change fingerprint mismatch | red |
| Deliberate break without encryption key | red |
| Raw payload retention cleanup | true |
| Rollback removed ciphertext, IV, tag, canonical rows, and Storage object | true |
| Tombstone and redacted audit | true |
| Other batch remained unchanged | true |
| Idempotent rollback replay | true |

This is a synthetic isolated proof receipt. It is not evidence of municipal readiness.
