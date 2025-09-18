#!/usr/bin/env tsx
/**
 * Development seed script for SRE Educational Management System
 * Run with: npm run seed:dev or tsx scripts/seed-dev.ts
 */

import { insertSeedData, clearSeedData } from '../lib/seed-data'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'insert'

  // console.log('🎓 SRE Educational Management System - Seed Script')
  // console.log('=' .repeat(60))

  if (command === 'clear') {
    // console.log('🧹 Clearing existing seed data...\n')
    const result = await clearSeedData()

    if (result.success) {
      // console.log('\n✅ Successfully cleared all seed data!')
    } else {
      // console.error('\n❌ Failed to clear seed data:', result.error)
      process.exit(1)
    }
  } else {
    // console.log('🌱 Inserting development seed data...\n')
    const result = await insertSeedData()

    if (result.success) {
      // console.log('\n🎉 Database seeded successfully!')
      // console.log('\n🚀 Ready to start development with realistic test data')
    } else {
      // console.error('\n❌ Seed insertion failed:', result.error)
      process.exit(1)
    }
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((error) => {
    // console.error('💥 Script execution failed:', error)
    process.exit(1)
  })
}

export { main }