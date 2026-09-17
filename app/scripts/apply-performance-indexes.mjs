#!/usr/bin/env node
/** Performance indexes are managed by the canonical Supabase migrations. */
console.error('Performance indexes must be applied through the canonical Supabase migration chain. Review the target project before applying migrations. For an isolated synthetic environment, run pnpm dev:local from app/. See CONTEXT.md for the supported database workflow.')
process.exitCode = 1
