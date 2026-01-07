import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateLinensSchema = z.object({
  requirements: z.array(z.object({
    linenItemId: z.string(),
    perFlip: z.number().min(0),
  })).optional(),
  inventory: z.array(z.object({
    linenItemId: z.string(),
    onHand: z.number().min(0),
  })).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get all linen items with their requirements and inventory for this property
    const linenCategories = await prisma.linenCategory.findMany({
      include: {
        items: {
          include: {
            requirements: {
              where: { propertyId: id },
            },
            inventory: {
              where: { propertyId: id },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Transform into a more useful format
    const result = linenCategories.map((category) => ({
      ...category,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        unitCost: item.unitCost,
        perFlip: item.requirements[0]?.perFlip || 0,
        target: (item.requirements[0]?.perFlip || 0) * 2,
        onHand: item.inventory[0]?.onHand || 0,
        status: (() => {
          const target = (item.requirements[0]?.perFlip || 0) * 2
          const onHand = item.inventory[0]?.onHand || 0
          if (target === 0) return 'not-required'
          if (onHand >= target) return 'ok'
          return 'low'
        })(),
        deficit: Math.max(0, ((item.requirements[0]?.perFlip || 0) * 2) - (item.inventory[0]?.onHand || 0)),
      })),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Property linens GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property linens' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateLinensSchema.parse(body)

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Update requirements
    if (validatedData.requirements) {
      for (const req of validatedData.requirements) {
        await prisma.propertyLinenRequirement.upsert({
          where: {
            propertyId_linenItemId: {
              propertyId: id,
              linenItemId: req.linenItemId,
            },
          },
          update: { perFlip: req.perFlip },
          create: {
            propertyId: id,
            linenItemId: req.linenItemId,
            perFlip: req.perFlip,
          },
        })
      }
    }

    // Update inventory
    if (validatedData.inventory) {
      for (const inv of validatedData.inventory) {
        await prisma.propertyLinenInventory.upsert({
          where: {
            propertyId_linenItemId: {
              propertyId: id,
              linenItemId: inv.linenItemId,
            },
          },
          update: { onHand: inv.onHand },
          create: {
            propertyId: id,
            linenItemId: inv.linenItemId,
            onHand: inv.onHand,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Property linens PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update property linens' },
      { status: 500 }
    )
  }
}
