#!/usr/bin/env tsx
/** Feature flags are part of the canonical migration chain. */
console.error('Feature flags must be applied through the canonical Supabase migrations. From the repository root, use pnpm --dir app exec supabase --workdir . db push after reviewing the target project. For an isolated synthetic environment, run pnpm dev:local from app/.')
process.exitCode = 1
