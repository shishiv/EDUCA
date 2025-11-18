#!/usr/bin/env tsx
/**
 * Development seed script for SRE Educational Management System
 * Run with: npm run seed:dev or tsx scripts/seed-dev.ts
 */

import { insertSeedData, clearSeedData } from '../lib/seed-data'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'insert'


  if (command === 'clear') {
    const result = await clearSeedData()

    if (result.success) {
    } else {
      process.exit(1)
    }
  } else {
    const result = await insertSeedData()

    if (result.success) {
    } else {
      process.exit(1)
    }
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((error) => {
    process.exit(1)
  })
}

export { main }