import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET - Get linen requirements and inventory for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId } = await params

    // Query property first without includes
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Try to get linen data - if tables don't exist, return empty
    let linenData: Array<{
      itemId: string
      itemName: string
      itemCode: string | null
      category: string
      defaultCost: number | null
      unitCost: number | null
      perFlip: number
      onHand: number
      room: string
    }> = []

    // Group by room for the response
    let byRoom: Record<string, typeof linenData> = {}

    try {
      // Get all linen items
      const allItems = await prisma.linenItem.findMany({
        orderBy: { name: 'asc' },
      })

      // Get categories separately
      let categories: Record<string, string> = {}
      try {
        const cats = await prisma.linenCategory.findMany()
        categories = Object.fromEntries(cats.map((c: { id: string; name: string }) => [c.id, c.name]))
      } catch {
        // Continue without categories
      }

      // Get requirements separately - now includes room
      interface Requirement {
        linenItemId: string
        perFlip: number
        unitCost: number | null
        room: string
      }
      let requirements: Requirement[] = []
      try {
        const reqs = await prisma.propertyLinenRequirement.findMany({
          where: { propertyId },
        })
        requirements = reqs.map((r: { linenItemId: string; perFlip: number; unitCost: number | null; room: string }) => ({
          linenItemId: r.linenItemId,
          perFlip: r.perFlip,
          unitCost: r.unitCost,
          room: r.room || 'General',
        }))
      } catch {
        // Continue without requirements
      }

      // Get inventory separately
      let inventory: Record<string, number> = {}
      try {
        const invs = await prisma.propertyLinenInventory.findMany({
          where: { propertyId },
        })
        inventory = Object.fromEntries(invs.map((i: { linenItemId: string; onHand: number }) => [i.linenItemId, i.onHand]))
      } catch {
        // Continue without inventory
      }

      // Create linen items lookup
      interface LinenItem {
        id: string
        name: string
        code: string | null
        categoryId: string
        unitCost: number | null
      }
      const itemsById = Object.fromEntries(allItems.map((item: LinenItem) => [item.id, item]))

      // Build linen data from requirements (items that have requirements for this property)
      for (const req of requirements) {
        const item = itemsById[req.linenItemId]
        if (!item) continue

        const linenEntry = {
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          category: categories[item.categoryId] || 'Unknown',
          defaultCost: item.unitCost,
          unitCost: req.unitCost,
          perFlip: req.perFlip,
          onHand: inventory[item.id] || 0,
          room: req.room,
        }
        linenData.push(linenEntry)

        // Group by room
        if (!byRoom[req.room]) byRoom[req.room] = []
        byRoom[req.room].push(linenEntry)
      }

      // Also return all available items for the admin UI to select from
      const allItemsFormatted = allItems.map((item: LinenItem) => ({
        itemId: item.id,
        itemName: item.name,
        itemCode: item.code,
        category: categories[item.categoryId] || 'Unknown',
        defaultCost: item.unitCost,
        onHand: inventory[item.id] || 0,
      }))

      return NextResponse.json({
        propertyId: property.id,
        propertyName: property.name,
        linens: linenData,
        byRoom,
        allItems: allItemsFormatted,
      })
    } catch {
      // LinenItem table doesn't exist - return empty linens
    }

    return NextResponse.json({
      propertyId: property.id,
      propertyName: property.name,
      linens: linenData,
      byRoom,
      allItems: [],
    })
  } catch (error) {
    console.error('Property linens GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch property linens' }, { status: 500 })
  }
}

// PUT - Update linen requirements and inventory for a property
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { propertyId } = await params
    const data = await request.json()

    // data.linens = [{ itemId, perFlip, onHand, room }, ...]
    if (!Array.isArray(data.linens)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    // Update requirements and inventory in a transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of data.linens) {
        const room = item.room || 'General'

        // Update or create requirement (includes perFlip, room, and property-specific unitCost)
        if (item.perFlip !== undefined || item.unitCost !== undefined) {
          await tx.propertyLinenRequirement.upsert({
            where: {
              propertyId_linenItemId_room: {
                propertyId,
                linenItemId: item.itemId,
                room,
              },
            },
            create: {
              propertyId,
              linenItemId: item.itemId,
              room,
              perFlip: parseInt(item.perFlip) || 0,
              unitCost: item.unitCost !== undefined && item.unitCost !== null
                ? parseFloat(item.unitCost)
                : null,
            },
            update: {
              perFlip: item.perFlip !== undefined ? parseInt(item.perFlip) || 0 : undefined,
              unitCost: item.unitCost !== undefined
                ? (item.unitCost !== null ? parseFloat(item.unitCost) : null)
                : undefined,
            },
          })
        }

        // Update or create inventory (still keyed by item only, not room)
        if (item.onHand !== undefined) {
          await tx.propertyLinenInventory.upsert({
            where: {
              propertyId_linenItemId: {
                propertyId,
                linenItemId: item.itemId,
              },
            },
            create: {
              propertyId,
              linenItemId: item.itemId,
              onHand: parseInt(item.onHand) || 0,
            },
            update: {
              onHand: parseInt(item.onHand) || 0,
            },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property linens PUT error:', error)
    return NextResponse.json({ error: 'Failed to update property linens' }, { status: 500 })
  }
}

// DELETE - Remove a linen requirement from a property room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { propertyId } = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const room = searchParams.get('room') || 'General'

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    await prisma.propertyLinenRequirement.delete({
      where: {
        propertyId_linenItemId_room: {
          propertyId,
          linenItemId: itemId,
          room,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property linens DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete linen requirement' }, { status: 500 })
  }
}
