/**
 * One-time migration script: Convert split sheet items (Top/Bottom) to sets.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage: npx ts-node scripts/fix-sheets-to-sets.ts
 *   or:  npx tsx scripts/fix-sheets-to-sets.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEPRECATED_CODES = [
  'K-Top', 'K-Bottom',
  'Q-Top', 'Q-Bottom',
  'F-Top', 'F-Bottom',
  'T-Top', 'T-Bottom',
]

const NEW_SETS = [
  { name: 'King Set', code: 'K-Set', unitCost: 26.66 },
  { name: 'Queen Set', code: 'Q-Set', unitCost: 23.34 },
  { name: 'Full Set', code: 'F-Set', unitCost: 20.00 },
  { name: 'Twin Set', code: 'T-Set', unitCost: 6.66 },
]

async function main() {
  console.log('=== Fix Sheets to Sets ===\n')

  // Step 1: Find and delete deprecated split items
  const deprecated = await prisma.linenItem.findMany({
    where: { code: { in: DEPRECATED_CODES } },
  })

  if (deprecated.length > 0) {
    console.log(`Found ${deprecated.length} deprecated split sheet items:`)
    for (const item of deprecated) {
      console.log(`  - ${item.name} (${item.code})`)
    }

    // Delete related records first (requirements, inventory, vendor products)
    const deprecatedIds = deprecated.map(d => d.id)

    const reqCount = await prisma.propertyLinenRequirement.deleteMany({
      where: { linenItemId: { in: deprecatedIds } },
    })
    console.log(`  Deleted ${reqCount.count} related requirements`)

    const invCount = await prisma.propertyLinenInventory.deleteMany({
      where: { linenItemId: { in: deprecatedIds } },
    })
    console.log(`  Deleted ${invCount.count} related inventory records`)

    const vpCount = await prisma.vendorProduct.deleteMany({
      where: { linenItemId: { in: deprecatedIds } },
    })
    console.log(`  Deleted ${vpCount.count} related vendor products`)

    // Now delete the items themselves
    const deleteCount = await prisma.linenItem.deleteMany({
      where: { id: { in: deprecatedIds } },
    })
    console.log(`  Deleted ${deleteCount.count} deprecated items\n`)
  } else {
    console.log('No deprecated split sheet items found (already cleaned up).\n')
  }

  // Step 2: Ensure the Sheets category exists
  const sheetsCategory = await prisma.linenCategory.findUnique({
    where: { name: 'Sheets' },
  })

  if (!sheetsCategory) {
    console.log('ERROR: Sheets category not found. Run the seed first.')
    process.exit(1)
  }

  // Step 3: Create new set items if they don't exist
  for (const set of NEW_SETS) {
    const existing = await prisma.linenItem.findUnique({
      where: { code: set.code },
    })

    if (existing) {
      console.log(`  ${set.name} (${set.code}) already exists — skipping`)
    } else {
      await prisma.linenItem.create({
        data: {
          name: set.name,
          code: set.code,
          unitCost: set.unitCost,
          categoryId: sheetsCategory.id,
        },
      })
      console.log(`  Created ${set.name} (${set.code}) — $${set.unitCost}`)
    }
  }

  console.log('\nDone!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
