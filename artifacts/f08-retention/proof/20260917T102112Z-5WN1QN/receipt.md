# Governed pilot CSV proof receipt

This evidence was generated against a disposable PostgreSQL cluster and one database named educa_pilot_proof_3376127. The CSV contained synthetic rows only. No demo or production endpoint was used.

| Check | Observed |
| --- | --- |
| runId | 20260917T102112Z-5WN1QN |
| Source commit SHA | b9e147fe2818ec1664deace5916100089528f48f |
| Source working tree dirty | false |
| Selection manifest | selection.sha256 |
| Selection SHA-256 | 057a651361a6e492ebcc00d19fee0044ab1bf52db6773d0a1f6876ba5f56f0a9 |
| PostgreSQL stopped and workspace removed | true |
| Target | isolated-proof |
| Source mode | synthetic |
| Batch | 74b48de9-7eec-4347-b7ad-ba79e55b5ad3 |
| CSV rows | 1 |
| Canonical rows | 1 student, 1 guardian, 1 relationship, 1 enrollment |
| Storage objects owned before rollback | 1 |
| Storage object fingerprint | efb1d4932d4c2c6c062b991df590102931ccd4cb3fb62952cc2aee6a8763e4db |
| Source SHA-256 | 668ec2f25eb2b8f743c4e1995222e266c2444f6ddc38fbe9efde244b1aa702d5 |
| Canonical SHA-256 | 1e87cc7f4637d193c5a94c2918736629e1572e00a7d4c5824166d425e8aa96f5 |
| Database SHA-256 | 59463dfcf240a31202f82a7c3999d32865858294790daa8f32a3090b6bcc4b1e |
| Governance manifest version | educa-synthetic-pilot-governance-v1 |
| Governance SHA-256 | d12e6f60a976fea1552767abc9fea1cef21f349653ba4cbe8370e1247161a38b |
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
| Retention CLI: expired blocked and removable batches | preserved_dependency + deleted, raw cleanup = 2 |
| Retention CLI retry | preserved_dependency only, raw cleanup = 0, no duplicate tombstone |
| Storage after retention | blocked batch kept, removable batch removed by exact association |
| Retention SQL: school B and real-mode sentinel | unchanged, synthetic fixture only |
| Retention SQL: finalized report, source links, Vivências, attendance and shared guardian | preserved |
| Retention SQL: injected mid-delete failure and ownership gap | failed, no partial canonical deletion |
| Retention SQL: existing deadlines, policy and purpose | unchanged |

This is a synthetic isolated proof receipt. It is not evidence of municipal readiness.
