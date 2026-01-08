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

    // Get property with linen data
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
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
        linenInventory: {
          include: {
            linenItem: {
              include: { category: { select: { name: true } } },
            },
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Get all linen items for form
    const allItems = await prisma.linenItem.findMany({
      include: { category: { select: { name: true } } },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' },
      ],
    })

    // Combine data
    const linenData = allItems.map((item: { id: string; name: string; code: string; category: { name: string }; unitCost: number }) => {
      const req = property.linenRequirements.find((r: { linenItemId: string; perFlip: number; unitCost: number | null }) => r.linenItemId === item.id)
      const inv = property.linenInventory.find((i: { linenItemId: string }) => i.linenItemId === item.id)

      return {
        itemId: item.id,
        itemName: item.name,
        itemCode: item.code,
        category: item.category.name,
        defaultCost: item.unitCost, // Master catalog cost (for reference only)
        unitCost: req?.unitCost ?? null, // Property-specific cost
        perFlip: req?.perFlip || 0,
        onHand: inv?.onHand || 0,
      }
    })

    return NextResponse.json({
      propertyId: property.id,
      propertyName: property.name,
      linens: linenData,
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

    // data.linens = [{ itemId, perFlip, onHand }, ...]
    if (!Array.isArray(data.linens)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    // Update requirements and inventory in a transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of data.linens) {
        // Update or create requirement (includes perFlip and property-specific unitCost)
        if (item.perFlip !== undefined || item.unitCost !== undefined) {
          await tx.propertyLinenRequirement.upsert({
            where: {
              propertyId_linenItemId: {
                propertyId,
                linenItemId: item.itemId,
              },
            },
            create: {
              propertyId,
              linenItemId: item.itemId,
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

        // Update or create inventory
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
