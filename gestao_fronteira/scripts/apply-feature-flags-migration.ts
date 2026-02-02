#!/usr/bin/env tsx
/**
 * Apply feature_flags migration to Supabase
 * Run: cd gestao_fronteira && npx tsx scripts/apply-feature-flags-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('Applying feature_flags migration...\n')

  // Read migration file
  const migrationPath = path.join(__dirname, '../../supabase/migrations/20260119_create_feature_flags.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8')

  // Split into statements (simple split on semicolon + newline)
  const statements = migrationSql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ')

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })

      if (error) {
        // Try direct execution via REST if rpc fails
        console.log(`Statement ${i + 1}: ${preview}...`)
        console.log(`  Warning: ${error.message}`)
      } else {
        console.log(`Statement ${i + 1}: OK - ${preview}...`)
      }
    } catch (err: any) {
      console.log(`Statement ${i + 1}: ${preview}...`)
      console.log(`  Error: ${err.message}`)
    }
  }

  // Verify tables exist
  console.log('\nVerifying tables...')

  const { data: flags, error: flagsError } = await supabase
    .from('feature_flags')
    .select('*')

  if (flagsError) {
    console.log('feature_flags table:', flagsError.message)
  } else {
    console.log('feature_flags table: OK -', flags?.length || 0, 'rows')
    flags?.forEach(f => console.log(`  - ${f.flag_name}: ${f.description}`))
  }

  const { data: escolaFlags, error: escolaFlagsError } = await supabase
    .from('escola_feature_flags')
    .select('*')

  if (escolaFlagsError) {
    console.log('escola_feature_flags table:', escolaFlagsError.message)
  } else {
    console.log('escola_feature_flags table: OK -', escolaFlags?.length || 0, 'rows')
  }

  console.log('\nDone!')
}

applyMigration().catch(console.error)
