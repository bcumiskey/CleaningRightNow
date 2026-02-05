import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get linens for a specific room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: propertyId, roomId } = await params

    // Verify room exists and belongs to property
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, propertyId: true },
    })

    if (!room || room.propertyId !== propertyId) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get all available linen items with categories
    const categories = await prisma.linenCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { name: 'asc' },
        },
      },
    })

    // Get existing requirements for this room
    const requirements = await prisma.propertyLinenRequirement.findMany({
      where: { roomId },
      select: {
        linenItemId: true,
        perFlip: true,
        unitCost: true,
      },
    })

    // Create a map of requirements by item ID
    const requirementsMap = new Map<string, { perFlip: number; unitCost: number | null }>(
      requirements.map(r => [r.linenItemId, { perFlip: r.perFlip, unitCost: r.unitCost }])
    )

    // Format response with categories and items
    const formattedCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      items: cat.items.map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        unitCost: item.unitCost,
        perFlip: requirementsMap.get(item.id)?.perFlip || 0,
        customCost: requirementsMap.get(item.id)?.unitCost || null,
      })),
    }))

    return NextResponse.json({
      roomId: room.id,
      roomName: room.name,
      categories: formattedCategories,
    })
  } catch (error) {
    console.error('Failed to fetch room linens:', error)
    return NextResponse.json({ error: 'Failed to fetch room linens' }, { status: 500 })
  }
}

// PUT - Update linens for a specific room
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roomId: string }> }
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

    const { id: propertyId, roomId } = await params
    const data = await request.json()

    // Verify room exists and belongs to property
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, propertyId: true },
    })

    if (!room || room.propertyId !== propertyId) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // data.linens = [{ itemId, perFlip }, ...]
    if (!Array.isArray(data.linens)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    // Delete all existing requirements for this room
    await prisma.propertyLinenRequirement.deleteMany({
      where: { roomId },
    })

    // Create new requirements for items with perFlip > 0
    const newRequirements = data.linens
      .filter((item: { perFlip: number }) => item.perFlip > 0)
      .map((item: { itemId: string; perFlip: number }) => ({
        propertyId,
        roomId,
        room: room.name, // Keep legacy field in sync
        linenItemId: item.itemId,
        perFlip: item.perFlip,
      }))

    if (newRequirements.length > 0) {
      await prisma.propertyLinenRequirement.createMany({
        data: newRequirements,
      })
    }

    return NextResponse.json({ success: true, count: newRequirements.length })
  } catch (error) {
    console.error('Failed to update room linens:', error)
    return NextResponse.json({ error: 'Failed to update room linens' }, { status: 500 })
  }
}
