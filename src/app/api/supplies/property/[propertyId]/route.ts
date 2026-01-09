import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface SupplyRequirement {
  supplyItemId: string
  supplyItem: {
    name: string
    code: string
    brand: string | null
    unitCost: number
    category: { name: string }
  }
  unitCost: number | null
  perFlip: number
  room: string
}

interface SupplyItem {
  id: string
  name: string
  code: string
  brand: string | null
  unitCost: number
  categoryId: string
  scope: string
  owner?: { name: string } | null
}

// GET - Get supply requirements for a property
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

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true, ownerId: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Get all supply items (filtered by scope)
    const allItems = await prisma.supplyItem.findMany({
      where: {
        OR: [
          { scope: 'global' },
          { scope: 'owner', ownerId: property.ownerId },
          // Property-specific would be handled separately if needed
        ],
      },
      orderBy: { name: 'asc' },
      include: {
        category: { select: { name: true } },
        owner: { select: { name: true } },
      },
    })

    // Get categories
    const categories = await prisma.supplyCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    const categoryMap = Object.fromEntries(categories.map((c: { id: string; name: string }) => [c.id, c.name]))

    // Get requirements
    const requirements = await prisma.propertySupplyRequirement.findMany({
      where: { propertyId },
      include: {
        supplyItem: {
          include: {
            category: { select: { name: true } },
          },
        },
      },
    })

    // Build supply data from requirements
    const supplyData = requirements.map((req: SupplyRequirement) => ({
      itemId: req.supplyItemId,
      itemName: req.supplyItem.name,
      itemCode: req.supplyItem.code,
      brand: req.supplyItem.brand,
      category: req.supplyItem.category.name,
      defaultCost: req.supplyItem.unitCost,
      unitCost: req.unitCost,
      perFlip: req.perFlip,
      room: req.room,
    }))

    // Group by room
    const byRoom: Record<string, typeof supplyData> = {}
    for (const supply of supplyData) {
      const room = supply.room || 'General'
      if (!byRoom[room]) byRoom[room] = []
      byRoom[room].push(supply)
    }

    // Format all items for selection
    const allItemsFormatted = allItems.map((item: SupplyItem) => ({
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      brand: item.brand,
      category: categoryMap[item.categoryId] || 'Unknown',
      defaultCost: item.unitCost,
      scope: item.scope,
      ownerName: item.owner?.name,
    }))

    return NextResponse.json({
      propertyId: property.id,
      propertyName: property.name,
      supplies: supplyData,
      byRoom,
      allItems: allItemsFormatted,
    })
  } catch (error) {
    console.error('Property supplies GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch property supplies' }, { status: 500 })
  }
}

// PUT - Update supply requirements for a property
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

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const data = await request.json()

    if (!Array.isArray(data.supplies)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of data.supplies) {
        const room = item.room || 'General'

        await tx.propertySupplyRequirement.upsert({
          where: {
            propertyId_supplyItemId_room: {
              propertyId,
              supplyItemId: item.itemId,
              room,
            },
          },
          create: {
            propertyId,
            supplyItemId: item.itemId,
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
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property supplies PUT error:', error)
    return NextResponse.json({ error: 'Failed to update property supplies' }, { status: 500 })
  }
}

// DELETE - Remove a supply requirement from a property room
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

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const room = searchParams.get('room') || 'General'

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    await prisma.propertySupplyRequirement.delete({
      where: {
        propertyId_supplyItemId_room: {
          propertyId,
          supplyItemId: itemId,
          room,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property supplies DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete supply requirement' }, { status: 500 })
  }
}
