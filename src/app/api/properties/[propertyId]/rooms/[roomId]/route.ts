import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Room types for validation
const ROOM_TYPES = ['bedroom', 'bathroom', 'kitchen', 'living', 'laundry', 'outdoor', 'other'] as const

// GET /api/properties/[propertyId]/rooms/[roomId] - Get a single room with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string; roomId: string }> }
) {
  try {
    const { propertyId, roomId } = await params

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        instructions: {
          orderBy: { sortOrder: 'asc' },
          include: { linkedPhoto: true },
        },
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
        linenRequirements: {
          include: { linenItem: true },
        },
        supplyRequirements: {
          include: { supplyItem: true },
        },
      },
    })

    if (!room || room.propertyId !== propertyId) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json(room)
  } catch (error) {
    console.error('Failed to fetch room:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

// PATCH /api/properties/[propertyId]/rooms/[roomId] - Update a room
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string; roomId: string }> }
) {
  try {
    const { propertyId, roomId } = await params
    const body = await request.json()

    const { name, type, beds, sortOrder } = body

    // Check room exists and belongs to this property
    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId },
    })

    if (!existingRoom || existingRoom.propertyId !== propertyId) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Validate type if provided
    if (type && !ROOM_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid room type. Must be one of: ${ROOM_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // If renaming, check for conflicts
    if (name && name !== existingRoom.name) {
      const conflictingRoom = await prisma.room.findUnique({
        where: {
          propertyId_name: { propertyId, name },
        },
      })

      if (conflictingRoom) {
        return NextResponse.json(
          { error: 'A room with this name already exists for this property' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (beds !== undefined) updateData.beds = beds
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const room = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    })

    // If name changed, update legacy room strings in related tables
    if (name && name !== existingRoom.name) {
      await Promise.all([
        prisma.propertyInstruction.updateMany({
          where: { roomId },
          data: { room: name },
        }),
        prisma.propertyPhoto.updateMany({
          where: { roomId },
          data: { room: name },
        }),
        prisma.propertyLinenRequirement.updateMany({
          where: { roomId },
          data: { room: name },
        }),
        prisma.propertySupplyRequirement.updateMany({
          where: { roomId },
          data: { room: name },
        }),
      ])
    }

    return NextResponse.json(room)
  } catch (error) {
    console.error('Failed to update room:', error)
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
  }
}

// DELETE /api/properties/[propertyId]/rooms/[roomId] - Delete a room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string; roomId: string }> }
) {
  try {
    const { propertyId, roomId } = await params

    // Check room exists and belongs to this property
    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        _count: {
          select: {
            instructions: true,
            photos: true,
            linenRequirements: true,
            supplyRequirements: true,
          },
        },
      },
    })

    if (!existingRoom || existingRoom.propertyId !== propertyId) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const totalRelated =
      existingRoom._count.instructions +
      existingRoom._count.photos +
      existingRoom._count.linenRequirements +
      existingRoom._count.supplyRequirements

    // Warn if there's related data (it will be cascade deleted)
    if (totalRelated > 0) {
      const forceDelete = request.nextUrl.searchParams.get('force') === 'true'
      if (!forceDelete) {
        return NextResponse.json(
          {
            error: 'Room has related data',
            message: `This room has ${totalRelated} related items (instructions, photos, linens, supplies). Add ?force=true to delete anyway.`,
            counts: existingRoom._count,
          },
          { status: 400 }
        )
      }
    }

    await prisma.room.delete({
      where: { id: roomId },
    })

    return NextResponse.json({ success: true, deleted: existingRoom.name })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
  }
}
