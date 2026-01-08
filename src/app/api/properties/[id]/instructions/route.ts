import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Type for instruction with optional room field (for backward compatibility)
interface InstructionData {
  id: string
  propertyId: string
  instruction: string
  sortOrder: number
  room?: string
  linkedPhotoId?: string | null
  linkedPhoto?: {
    id: string
    url: string
    caption: string | null
    notes: string | null
    room: string
  } | null
  createdAt: Date
}

// GET - Fetch all instructions for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: propertyId } = await params

    // Try with new schema fields, fallback to basic query if fields don't exist yet
    let instructions: InstructionData[] = []
    const byRoom: Record<string, InstructionData[]> = {}

    try {
      instructions = await prisma.propertyInstruction.findMany({
        where: { propertyId },
        orderBy: [{ room: 'asc' }, { sortOrder: 'asc' }],
        include: {
          linkedPhoto: {
            select: { id: true, url: true, caption: true, notes: true, room: true },
          },
        },
      }) as InstructionData[]

      // Group by room for easier display
      for (const instruction of instructions) {
        const room = instruction.room || 'General'
        if (!byRoom[room]) {
          byRoom[room] = []
        }
        byRoom[room].push(instruction)
      }
    } catch {
      // Fallback for older schema without room/linkedPhoto fields
      const basicInstructions = await prisma.propertyInstruction.findMany({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      })
      // Add default room for backward compatibility
      instructions = basicInstructions.map(inst => ({
        ...inst,
        room: 'General',
        linkedPhotoId: null,
        linkedPhoto: null,
      })) as InstructionData[]
      byRoom['General'] = instructions
    }

    return NextResponse.json({ instructions, byRoom })
  } catch (error) {
    console.error('Property instructions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch instructions' }, { status: 500 })
  }
}

// POST - Add a new instruction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: propertyId } = await params
    const data = await request.json()

    if (!data.instruction) {
      return NextResponse.json({ error: 'Instruction text is required' }, { status: 400 })
    }

    // Get max sort order
    const maxSort = await prisma.propertyInstruction.findFirst({
      where: { propertyId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    // Try with new schema fields, fallback if not available
    try {
      const instruction = await prisma.propertyInstruction.create({
        data: {
          propertyId,
          room: data.room || 'General',
          instruction: data.instruction,
          linkedPhotoId: data.linkedPhotoId || null,
          sortOrder: (maxSort?.sortOrder || 0) + 1,
        },
        include: {
          linkedPhoto: {
            select: { id: true, url: true, caption: true, notes: true, room: true },
          },
        },
      })
      return NextResponse.json(instruction)
    } catch {
      // Fallback for older schema
      const instruction = await prisma.propertyInstruction.create({
        data: {
          propertyId,
          instruction: data.instruction,
          sortOrder: (maxSort?.sortOrder || 0) + 1,
        },
      })
      return NextResponse.json({
        ...instruction,
        room: 'General',
        linkedPhotoId: null,
        linkedPhoto: null,
      })
    }
  } catch (error) {
    console.error('Property instructions POST error:', error)
    return NextResponse.json({ error: 'Failed to add instruction' }, { status: 500 })
  }
}

// PUT - Update instructions (bulk reorder or single update)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: propertyId } = await params
    const data = await request.json()

    // Single update
    if (data.id) {
      // Try with new schema fields
      try {
        const updateData: Record<string, unknown> = {}
        if (data.instruction !== undefined) updateData.instruction = data.instruction
        if (data.room !== undefined) updateData.room = data.room
        if (data.linkedPhotoId !== undefined) updateData.linkedPhotoId = data.linkedPhotoId || null
        if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

        const instruction = await prisma.propertyInstruction.update({
          where: { id: data.id },
          data: updateData,
          include: {
            linkedPhoto: {
              select: { id: true, url: true, caption: true, notes: true, room: true },
            },
          },
        })
        return NextResponse.json(instruction)
      } catch {
        // Fallback for older schema
        const updateData: Record<string, unknown> = {}
        if (data.instruction !== undefined) updateData.instruction = data.instruction
        if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

        const instruction = await prisma.propertyInstruction.update({
          where: { id: data.id },
          data: updateData,
        })
        return NextResponse.json({
          ...instruction,
          room: 'General',
          linkedPhotoId: null,
          linkedPhoto: null,
        })
      }
    }

    // Bulk reorder
    if (Array.isArray(data.instructions)) {
      await prisma.$transaction(
        data.instructions.map((item: { id: string; sortOrder: number }) =>
          prisma.propertyInstruction.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      )

      const instructions = await prisma.propertyInstruction.findMany({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      })

      return NextResponse.json(instructions)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Property instructions PUT error:', error)
    return NextResponse.json({ error: 'Failed to update instructions' }, { status: 500 })
  }
}

// DELETE - Remove an instruction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const instructionId = searchParams.get('instructionId')

    if (!instructionId) {
      return NextResponse.json({ error: 'instructionId is required' }, { status: 400 })
    }

    await prisma.propertyInstruction.delete({
      where: { id: instructionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property instructions DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete instruction' }, { status: 500 })
  }
}
