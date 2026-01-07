import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all properties with their linen requirements and inventory
    const properties = await prisma.property.findMany({
      include: {
        linenRequirements: {
          include: {
            linenItem: {
              include: {
                category: true,
              },
            },
          },
        },
        linenInventory: true,
      },
      orderBy: { name: 'asc' },
    })

    // Calculate shopping list
    const shoppingList: Array<{
      property: { id: string; name: string };
      linenItem: { id: string; name: string; code: string; unitCost: number; category: string };
      target: number;
      onHand: number;
      needed: number;
      totalCost: number;
    }> = []

    for (const property of properties) {
      for (const requirement of property.linenRequirements) {
        const target = requirement.perFlip * 2 // 2x target
        const inventory = property.linenInventory.find(
          (inv: { linenItemId: string; onHand: number }) => inv.linenItemId === requirement.linenItemId
        )
        const onHand = inventory?.onHand || 0
        const needed = Math.max(0, target - onHand)

        if (needed > 0) {
          shoppingList.push({
            property: { id: property.id, name: property.name },
            linenItem: {
              id: requirement.linenItem.id,
              name: requirement.linenItem.name,
              code: requirement.linenItem.code,
              unitCost: requirement.linenItem.unitCost,
              category: requirement.linenItem.category.name,
            },
            target,
            onHand,
            needed,
            totalCost: needed * requirement.linenItem.unitCost,
          })
        }
      }
    }

    // Group by item for summary
    const byItem = shoppingList.reduce((acc, item) => {
      const key = item.linenItem.id
      if (!acc[key]) {
        acc[key] = {
          linenItem: item.linenItem,
          totalNeeded: 0,
          totalCost: 0,
          properties: [],
        }
      }
      acc[key].totalNeeded += item.needed
      acc[key].totalCost += item.totalCost
      acc[key].properties.push({
        property: item.property,
        needed: item.needed,
      })
      return acc
    }, {} as Record<string, { linenItem: typeof shoppingList[0]['linenItem']; totalNeeded: number; totalCost: number; properties: Array<{ property: { id: string; name: string }; needed: number }> }>)

    // Calculate grand total
    const grandTotal = shoppingList.reduce((sum, item) => sum + item.totalCost, 0)

    return NextResponse.json({
      byProperty: shoppingList,
      byItem: Object.values(byItem),
      grandTotal,
      itemCount: Object.keys(byItem).length,
    })
  } catch (error) {
    console.error('Shopping list GET error:', error)
    return NextResponse.json(
      { error: 'Failed to generate shopping list' },
      { status: 500 }
    )
  }
}
