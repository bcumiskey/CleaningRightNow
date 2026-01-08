import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface ShoppingListItem {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  unitCost: number
  properties: {
    propertyId: string
    propertyName: string
    perFlip: number
    onHand: number
    needed: number
    flipsRemaining: number
  }[]
  totalNeeded: number
  totalCost: number
}

// GET - Generate shopping list based on inventory levels
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetFlips = parseInt(searchParams.get('targetFlips') || '5')
    const propertyId = searchParams.get('propertyId') // Optional filter

    // Get all properties with their linen requirements and inventory
    const properties = await prisma.property.findMany({
      where: propertyId ? { id: propertyId } : undefined,
      select: {
        id: true,
        name: true,
        linenRequirements: {
          include: {
            linenItem: {
              include: { category: { select: { name: true } } },
            },
          },
        },
        linenInventory: true,
      },
    })

    // Build shopping list by item
    const itemMap = new Map<string, ShoppingListItem>()

    for (const property of properties) {
      for (const req of property.linenRequirements) {
        if (req.perFlip <= 0) continue // Skip items with no requirement

        const inv = property.linenInventory.find((i: { linenItemId: string; onHand: number }) => i.linenItemId === req.linenItemId)
        const onHand = inv?.onHand || 0
        const neededForTarget = req.perFlip * targetFlips
        const shortage = Math.max(0, neededForTarget - onHand)
        const flipsRemaining = req.perFlip > 0 ? Math.floor(onHand / req.perFlip) : 0

        if (shortage > 0 || flipsRemaining < 3) {
          // Add to shopping list
          let item = itemMap.get(req.linenItemId)

          if (!item) {
            item = {
              itemId: req.linenItemId,
              itemName: req.linenItem.name,
              itemCode: req.linenItem.code,
              category: req.linenItem.category.name,
              unitCost: req.linenItem.unitCost,
              properties: [],
              totalNeeded: 0,
              totalCost: 0,
            }
            itemMap.set(req.linenItemId, item)
          }

          item.properties.push({
            propertyId: property.id,
            propertyName: property.name,
            perFlip: req.perFlip,
            onHand,
            needed: shortage,
            flipsRemaining,
          })
          item.totalNeeded += shortage
          item.totalCost = item.totalNeeded * item.unitCost
        }
      }
    }

    // Convert to array and sort by category, then name
    const shoppingList = Array.from(itemMap.values())
      .sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category)
        }
        return a.itemName.localeCompare(b.itemName)
      })

    // Calculate totals
    const totalItems = shoppingList.reduce((sum, item) => sum + item.totalNeeded, 0)
    const totalCost = shoppingList.reduce((sum, item) => sum + item.totalCost, 0)

    // Group by category for easier display
    const byCategory: Record<string, ShoppingListItem[]> = {}
    for (const item of shoppingList) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = []
      }
      byCategory[item.category].push(item)
    }

    return NextResponse.json({
      targetFlips,
      propertyFilter: propertyId || 'all',
      items: shoppingList,
      byCategory,
      summary: {
        totalItems,
        totalCost,
        uniqueItems: shoppingList.length,
        propertiesWithNeeds: new Set(
          shoppingList.flatMap(i => i.properties.map(p => p.propertyId))
        ).size,
      },
    })
  } catch (error) {
    console.error('Shopping list GET error:', error)
    return NextResponse.json({ error: 'Failed to generate shopping list' }, { status: 500 })
  }
}
