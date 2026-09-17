# Partial synthetic portable restore proof

Este receipt registra uma prova técnica parcial, sintética e isolada. A allowlist v2 recupera configurações escolares, anos/períodos, conteúdo, Vivências, relatórios e reaberturas com seus snapshots e deadlines originais. Estrutura recriada por migrations não é dado recuperado. Auditoria histórica completa e demais módulos excluídos não são recuperados. Auth limita-se a um manifesto de identidade e a claims SQL, sem login GoTrue, senha, sessão, refresh token, MFA ou revogação. Bytes Storage são verificados em arquivos, não publicados em um serviço restaurado. Ele não demonstra prontidão municipal, aprovação legal, contrato, SLA comercial ou PITR gerenciado do provedor. O banco de origem local foi somente lido.

| Check | Observed |
|---|---:|
| Result | pass within partial coverage only |
| Coverage inventory | `restore-coverage-v2.tsv` / `e2b73c5a0a4f46894c49969adfe67b47d53b17ef980735e86f32d43e6e96de50` |
| Isolated synthetic target | `isolated-proof` |
| Database target identity | `isolated_proof` |
| Data mode and marker | `synthetic` / `SYNTHETIC-EDUCA-PILOT` |
| Portable artifact format | `educa-portable-csv-v2` encrypted tar |
| Portable public-table allowlist | 26 tables |
| Encrypted artifact SHA-256 | `c3451f482a194cf06721713af95400d4ea2a7f2034155c1385ca7dd87171315f` |
| Plaintext artifact lifecycle | removed before receipt |
| Temporary restore database | removed before receipt |
| Source database writes | none |
| Auth manifest count | 4 |
| Auth manifest fingerprint source/restore | `268bf134a47820d94a5ebfac3b2fb596990873db820075223b8fa9355b54aa36` / `268bf134a47820d94a5ebfac3b2fb596990873db820075223b8fa9355b54aa36` |
| Auth profile linkage | t |
| Repository migration files applied | 50 |
| Student count | 2 |
| Student fingerprint source/restore | `650c9b8ba6352b65da6c161aa2e6669b5751c11670dc8c9daa1f06905f9aeb72` / `650c9b8ba6352b65da6c161aa2e6669b5751c11670dc8c9daa1f06905f9aeb72` |
| Attendance count | 1 |
| Attendance fingerprint source/restore | `25c9a84551f57f2d10814063ac2f358e3b8e1d5f88e269b97740dc1d4ef49641` / `25c9a84551f57f2d10814063ac2f358e3b8e1d5f88e269b97740dc1d4ef49641` |
| Storage metadata count | 2 |
| Storage metadata fingerprint source/restore | `7a345d2b206622d6cd2009effb8ed2f498bcff9e199c499201daed4dc2f16907` / `7a345d2b206622d6cd2009effb8ed2f498bcff9e199c499201daed4dc2f16907` |
| Storage byte checksum source/restore | `274ccb9f60b60419f701453020cf95ef352a74f2a4151a9f6fd8312b4c23f754` / `274ccb9f60b60419f701453020cf95ef352a74f2a4151a9f6fd8312b4c23f754` |
| Restored policy count / fingerprint | 81 / `d66096695e38366d1a115770ed65a6cceda63cfa07dd8b2f28dbddeaf7d1f205` |
| Column grants and sensitive-read denial | t |
| Recreated catalog parity (qual, with_check, RLS, grants) | t |
| Security-invoker view | t |
| Dashboard RPC existence | t |
| Pilot gate | t |
| Relationships | t |
| Pedagogical foreign keys / PostgreSQL JSONB fingerprint / deadline consistency | t |
| Original snapshots / legacy reports / captured deadlines | 1 / 1 / 1 |
| Two-school pedagogical fixture, 60 sources, RLS and immutable legacy/deadline behavior | t |
| Snapshot and deadline preservation | exact per-table CSV fingerprints, no recapture |
| Legacy provenance | original NULL snapshot and links, no inferred provenance |
| Tombstone prevents resurrection | t |
| Synthetic teacher session within school scope | t |
| Storage policy session within school scope | t |
| Observed RPO / documented target | 0s / 24h |
| Observed RTO / documented target | 3s / 4h |
| Provider PITR | not exercised |
| Default deliberate-break contract | `PILOT_RESTORE_DELIBERATE_BREAK=student-checksum` must produce red |
| Receipt PII | none |

Focused failure probes are intentional and must fail visibly: `artifact`, `student-checksum`, `attendance-checksum`, `policy`, `auth`, `storage`, `cleanup`, `pedagogical-omission`, `snapshot`, and `deadline`. Run them only against the disposable local synthetic proof.
