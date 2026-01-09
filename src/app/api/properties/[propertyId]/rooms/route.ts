import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Room types for validation
const ROOM_TYPES = ['bedroom', 'bathroom', 'kitchen', 'living', 'laundry', 'outdoor', 'other'] as const

// Bed types for validation
const BED_TYPES = ['King', 'Queen', 'Full', 'Twin', 'California King', 'Bunk', 'Sofa Bed', 'Crib'] as const

interface BedConfig {
  type: string
  count: number
}

// GET /api/properties/[propertyId]/rooms - List all rooms for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params

    const rooms = await prisma.room.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
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

    // Also get legacy room strings that don't have Room entities yet
    const [legacyInstructions, legacyPhotos, legacyLinens] = await Promise.all([
      prisma.propertyInstruction.findMany({
        where: { propertyId, roomId: null },
        select: { room: true },
        distinct: ['room'],
      }),
      prisma.propertyPhoto.findMany({
        where: { propertyId, roomId: null },
        select: { room: true },
        distinct: ['room'],
      }),
      prisma.propertyLinenRequirement.findMany({
        where: { propertyId, roomId: null },
        select: { room: true },
        distinct: ['room'],
      }),
    ])

    // Collect legacy room names not yet migrated
    const migratedRoomNames = new Set(rooms.map((r: { name: string }) => r.name))
    const legacyRoomNames = new Set<string>()

    for (const item of [...legacyInstructions, ...legacyPhotos, ...legacyLinens]) {
      if (!migratedRoomNames.has(item.room)) {
        legacyRoomNames.add(item.room)
      }
    }

    return NextResponse.json({
      rooms,
      legacyRooms: Array.from(legacyRoomNames).sort(),
      roomTypes: ROOM_TYPES,
      bedTypes: BED_TYPES,
    })
  } catch (error) {
    console.error('Failed to fetch rooms:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

// POST /api/properties/[propertyId]/rooms - Create a new room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params
    const body = await request.json()

    const { name, type, beds, sortOrder } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    if (!ROOM_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid room type. Must be one of: ${ROOM_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate beds if provided
    if (beds && Array.isArray(beds)) {
      for (const bed of beds as BedConfig[]) {
        if (!bed.type || typeof bed.count !== 'number' || bed.count < 1) {
          return NextResponse.json(
            { error: 'Each bed must have a type and count >= 1' },
            { status: 400 }
          )
        }
      }
    }

    // Check if room name already exists for this property
    const existingRoom = await prisma.room.findUnique({
      where: {
        propertyId_name: { propertyId, name },
      },
    })

    if (existingRoom) {
      return NextResponse.json(
        { error: 'A room with this name already exists for this property' },
        { status: 409 }
      )
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder
    if (typeof finalSortOrder !== 'number') {
      const lastRoom = await prisma.room.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'desc' },
      })
      finalSortOrder = (lastRoom?.sortOrder ?? -1) + 1
    }

    const room = await prisma.room.create({
      data: {
        propertyId,
        name,
        type,
        beds: beds || null,
        sortOrder: finalSortOrder,
      },
    })

    // Migrate any legacy data with matching room name to use this Room entity
    await Promise.all([
      prisma.propertyInstruction.updateMany({
        where: { propertyId, room: name, roomId: null },
        data: { roomId: room.id },
      }),
      prisma.propertyPhoto.updateMany({
        where: { propertyId, room: name, roomId: null },
        data: { roomId: room.id },
      }),
      prisma.propertyLinenRequirement.updateMany({
        where: { propertyId, room: name, roomId: null },
        data: { roomId: room.id },
      }),
      prisma.propertySupplyRequirement.updateMany({
        where: { propertyId, room: name, roomId: null },
        data: { roomId: room.id },
      }),
    ])

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
