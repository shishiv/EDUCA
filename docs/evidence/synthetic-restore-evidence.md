# Synthetic restore evidence

This is an isolated application-level portable restore with synthetic data only. It is not evidence of municipal production readiness or legal approval. Provider-managed PITR remains a separate operational control.

| Evidence | Observed |
|---|---:|
| Backup timestamp (UTC) | 2026-07-27T05:29:19Z |
| Artifact format | `educa-portable-csv-v1`, encrypted tar |
| Schema source | repository migrations |
| Intentionally excluded | owners, ACLs, roles, extensions, managed session settings, provider PITR metadata |
| Source/restore topology | local Supabase -> migrated isolated database `educa_pilot_restore_3235252` |
| Encrypted artifact SHA-256 | `a6a43efc58b16011251445c171098fef3c0baebc9a8bd036ece386ab8c67472d` |
| RPO observed | 1s (target <= 86400s / 24h) |
| RTO observed | 1s (target <= 14400s / 4h) |
| Schools / profiles / Auth manifest users | 2 / 7 / 7 |
| Students | 3 |
| Student checksum source/restore | `42e50c1c5eae63e926bc04442f7f7064` / `42e50c1c5eae63e926bc04442f7f7064` |
| Attendance checksum source/restore | `0198ed29e5303f6288308d34568d2d6b` / `0198ed29e5303f6288308d34568d2d6b` |
| Attendance RLS write rehearsal | t |
| Relationships valid | t |
| Audit rows source/restore | 34 / 58 |
| Storage metadata objects | 1 |
| Storage byte checksum | `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460` |
| Pilot policies | 37 |
| Grants / security-invoker view / dashboard RPC | t / t / t |
| Tombstone prevents silent resurrection | t |

The isolated database and decrypted temporary artifacts were removed by the rehearsal trap after evidence collection.
