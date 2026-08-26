# Synthetic school-schema canary

This slice creates one local-only synthetic schema named `school_ca000000000000000000000000000001`. It contains only `tenant_identity`, `anos_letivos`, and `configs`, with the latter restricted to the school Bolsa Familia visibility configuration. `public` remains authoritative. The setup copies public rows once and creates no reverse synchronization or application route.

The shared control plane is `public.school_schema_registry` plus `public.school_schema_versions`. A database constraint prevents any synthetic registry row from becoming `active`. The canary is omitted from `supabase/config.toml`, browser roles have no schema or table privileges, and no application code selects it.

## Deterministic commands

Apply all canonical migrations to a disposable local PostgreSQL database first. Then run the setup from `app/`:

```bash
CANARY_TARGET=local-synthetic CANARY_DATA_MODE=synthetic DB_URL='postgresql://postgres@127.0.0.1:5432/postgres' pnpm canary:schema:setup
```

Run the rollback against the same disposable database:

```bash
CANARY_TARGET=local-synthetic CANARY_DATA_MODE=synthetic DB_URL='postgresql://postgres@127.0.0.1:5432/postgres' pnpm canary:schema:rollback
```

The setup creates the fixed synthetic source school in `public`, where its academic year and Bolsa Familia configuration remain authoritative. The rollback drops only the canary schema and deletes only its version and registry rows. It verifies that the authoritative public synthetic source still exists.

Run the complete isolated proof from `app/`:

```bash
pnpm test:database:schema-canary
```

The proof creates a disposable PostgreSQL 15 cluster, applies canonical migrations, provisions the canary, checks catalog equivalence, ownership, grants, forced RLS, policy inventory, zero cross-tenant dependencies, no dual-write triggers, and absence from file-based and database PostgREST exposure configuration. It exports only the canary with `pg_dump`, checks the archive checksum after transfer, restores into a separately migrated database, compares normalized catalogs and row checksums, measures 1, 10, and 25-schema tenant-migration batches, executes rollback, and verifies the resulting catalog state.

## Unverified hosted constraints

This local proof does not verify whether a hosted Supabase project permits creation and ownership by the `educa_tenant_owner` no-login role. It does not verify a hosted mechanism for changing PostgREST exposed schemas, config reload behavior, schema-cache reload time or memory, allowed and denied API probes, or cache behavior as schema count grows. It does not measure hosted compute-tier migration, export, restore, or query latency. It does not establish a supported schema count or production capacity limit. Supabase dashboard backup and PITR remain whole-project operations and are not proven as school-scoped restore mechanisms.
