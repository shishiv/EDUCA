# EDUCA Supabase migration history reconciliation receipt

- Operation: `educa-supabase-migration-history-reconcile`
- Project ref: `bkaitckpzfyztueiygmp`
- Project name and status: `EDUCA`, `ACTIVE_HEALTHY`
- Worktree: `/home/shiv/.treehouse/EDUCA-027bb4/1/EDUCA`
- CLI: Supabase `2.111.0`
- Result: **completed, one history record reconciled**
- Target migration SQL run by this operation: none
- Secrets: the existing `SUPABASE_ACCESS_TOKEN` was loaded from `/home/shiv/.pi/agent/.env`; its value was never printed, logged, or written to this receipt

## Ordered inspection and link

1. Current CLI help was read for `migration`, `migration list`, `migration repair`, `db`, `db query`, and `link`. The repair flags confirmed the narrow `--linked --status applied <version>` path.
2. `supabase link --project-ref bkaitckpzfyztueiygmp` completed before the first remote read. The local link metadata was written at approximately `2026-08-13T11:42:56-03:00` under ignored `supabase/.temp/` files.
3. `pnpm --dir app exec supabase --workdir .. migration list --linked` at `2026-08-13T11:43:06-03:00` listed 24 local migrations and zero remote migration versions. Every `remote` value was empty.
4. `pnpm --dir app exec supabase projects list --output-format json` at `2026-08-13T11:43:18-03:00` confirmed the exact project ref, `EDUCA`, `ACTIVE_HEALTHY`, region `sa-east-1`, and PostgreSQL `17.6.1.155`.
5. A metadata-only `supabase db query --linked` at `2026-08-13T11:43:30-03:00` returned PostgreSQL `17.6`, with `supabase_migrations` schema and `schema_migrations` table both absent.
6. The current read-only security proof at `2026-08-13T11:44:14-03:00` confirmed the PR121 hardening state before repair. All eight RLS, deny-policy, and grant checks were true; both views were security-invoker; target counts were aggregate-only.
7. A non-history catalog fingerprint at `2026-08-13T11:46:31-03:00` returned 1,981 catalog items and MD5 `67b083147837161e8648c80d70ce5c71`.

The worker did not run `db push`, `apply_migration`, reset, `migration repair --repair-all`, or direct schema/data SQL.

## Evidence and exact decision

- Repository migration: `supabase/migrations/20260812192111_public_security_advisor_error_hardening.sql`
- Expected version: `20260812192111`
- Expected name: `public_security_advisor_error_hardening`
- Local file: 142 lines; SHA-256 `ab42af7e338f521427034d1ad8692962d9ddec3df7f39eb7c19aa300a4ad5889`
- Local CLI-compatible statement count: 32
- Local CLI-compatible statements SHA-256: `a710313553ded1987172f8b3fe5b06b1aa5087f277dd91e4680b3adbfc3bece7`
- Independent recorded file digest: `.pilot-evidence/educa-supabase-security-errors-20260812/migration-sha256.txt`
- Migration commit: `a07680cc680bd6e5e9acb93a7c8067712af02011`
- PR121 receipt: `https://github.com/shishiv/EDUCA/pull/121`, merged `2026-08-12T20:10:37Z`

PR121 states that only this versioned migration was applied through the authenticated Supabase Management API. Its independent artifacts record the hardening proof, zero rows in the eight target tables, zero rows in `audit_summary`, and 26 rows in the legacy Bolsa Familia view. The earlier migration-history probe recorded that `supabase_migrations.schema_migrations` did not exist. These facts identify one exact missing history tuple without asserting that any other local migration ran.

Relevant evidence paths:

- `.pilot-evidence/educa-supabase-security-errors-20260812/live-migrations.json`
- `.pilot-evidence/educa-supabase-security-errors-20260812/live-migration-catalog.json`
- `.pilot-evidence/educa-supabase-security-errors-20260812/live-postapply-proof.json`
- `.pilot-evidence/educa-supabase-security-errors-20260812/remote-apply.json`
- `.pilot-evidence/educa-supabase-security-errors-20260812/live-post-view-definitions-hashes.txt`

## Exact history-only action

- Started: `2026-08-13T11:47:04-03:00`
- Finished: `2026-08-13T11:47:07-03:00`
- Command: `pnpm --dir app exec supabase --workdir .. migration repair --linked --status applied 20260812192111`
- CLI result: `versions=[20260812192111]`, `status=applied`, `repairAll=false`

This documented repair path created the missing `supabase_migrations` history metadata and inserted one record using the local migration file. It did not execute the migration SQL. No other version was supplied.

## Post-repair verification

- `supabase migration list --linked` at `2026-08-13T11:47:17-03:00` listed 24 local versions and exactly one remote version: `20260812192111`.
- A metadata-only history query at `2026-08-13T11:47:27-03:00` returned:
  - `history_count=1`
  - `target_record_count=1`
  - `non_target_record_count=0`
  - `target_version=20260812192111`
  - `target_name=public_security_advisor_error_hardening`
  - `target_statement_count=32`
  - `target_statements_sha256=a710313553ded1987172f8b3fe5b06b1aa5087f277dd91e4680b3adbfc3bece7`
- The stored version, name, statement count, and statements digest match the repository file using the CLI-compatible statement split. The file SHA also matches the independent recorded digest.
- The `supabase_migrations` catalog at `2026-08-13T11:48:02-03:00` contains only `schema_migrations` and its primary-key index. The table columns are `version`, `statements`, and `name`.
- The non-history catalog fingerprint at `2026-08-13T11:47:43-03:00` remained 1,981 items with MD5 `67b083147837161e8648c80d70ce5c71`, exactly matching the pre-repair fingerprint.
- The read-only security proof at `2026-08-13T11:47:53-03:00` matched the pre-repair proof: all hardening checks remained true, all eight target table counts remained zero, `audit_summary` remained zero rows, and the legacy Bolsa Familia view remained at 26 rows.

The before and after checks show no change outside migration-history metadata in the non-history catalog fingerprint and inspected target-row scope. No application objects, target security state, or inspected rows changed.

## Remaining caveats

- The remote history now contains one intentional record, not a complete authoritative history. The other 23 local migration files remain absent from remote history, and this receipt does not infer that they ran.
- The PR121 receipt and current hardening proof establish that the target SQL was already applied before repair. This operation only reconciled history.
- Future migration work must not use this one-record history as proof that the full repository chain is applied. Any broader history repair needs a separate inspection and authorization.
- No Auth, Storage, application SQL, demo resources, DNS, deploy configuration, generated types, schema migration files, or public product behavior were changed by this operation. The RLS state and inspected rows remained unchanged.
