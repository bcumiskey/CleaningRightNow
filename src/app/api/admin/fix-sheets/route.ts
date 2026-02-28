import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/admin/fix-sheets
// Deletes deprecated split sheet items (Top/Bottom) and creates set items.
// Idempotent — safe to run multiple times.

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

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Step 1: Find and delete deprecated split items
    const deprecated = await prisma.linenItem.findMany({
      where: { code: { in: DEPRECATED_CODES } },
    })

    let deletedRequirements = 0
    let deletedInventory = 0
    let deletedVendorProducts = 0
    let deletedItems = 0

    if (deprecated.length > 0) {
      const deprecatedIds = deprecated.map(d => d.id)

      const reqCount = await prisma.propertyLinenRequirement.deleteMany({
        where: { linenItemId: { in: deprecatedIds } },
      })
      deletedRequirements = reqCount.count

      const invCount = await prisma.propertyLinenInventory.deleteMany({
        where: { linenItemId: { in: deprecatedIds } },
      })
      deletedInventory = invCount.count

      const vpCount = await prisma.vendorProduct.deleteMany({
        where: { linenItemId: { in: deprecatedIds } },
      })
      deletedVendorProducts = vpCount.count

      const deleteCount = await prisma.linenItem.deleteMany({
        where: { id: { in: deprecatedIds } },
      })
      deletedItems = deleteCount.count
    }

    // Step 2: Ensure the Sheets category exists
    const sheetsCategory = await prisma.linenCategory.findUnique({
      where: { name: 'Sheets' },
    })

    if (!sheetsCategory) {
      return NextResponse.json({
        error: 'Sheets category not found. Run the seed first.',
      }, { status: 404 })
    }

    // Step 3: Create new set items if they don't exist
    const created: string[] = []
    const skipped: string[] = []

    for (const set of NEW_SETS) {
      const existing = await prisma.linenItem.findUnique({
        where: { code: set.code },
      })

      if (existing) {
        skipped.push(`${set.name} (${set.code})`)
      } else {
        await prisma.linenItem.create({
          data: {
            name: set.name,
            code: set.code,
            unitCost: set.unitCost,
            categoryId: sheetsCategory.id,
          },
        })
        created.push(`${set.name} (${set.code})`)
      }
    }

    return NextResponse.json({
      success: true,
      deletedItems,
      deletedRequirements,
      deletedInventory,
      deletedVendorProducts,
      setsCreated: created,
      setsSkipped: skipped,
    })
  } catch (error) {
    console.error('Fix sheets error:', error)
    return NextResponse.json(
      { error: 'Failed to fix sheets', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
