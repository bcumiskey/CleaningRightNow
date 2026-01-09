import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface PropertyInstruction {
  id: string
  propertyId: string
  instruction: string
  room: string | null
  sortOrder: number
  linkedPhotoId: string | null
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

    // Query instructions without includes
    interface InstructionWithPhoto {
      id: string
      propertyId: string
      instruction: string
      sortOrder: number
      room: string
      linkedPhotoId: string | null
      linkedPhoto: {
        id: string
        url: string
        caption: string | null
        notes: string | null
        room: string
      } | null
      createdAt: Date
    }

    let instructions: InstructionWithPhoto[] = []

    try {
      const rawInstructions = await prisma.propertyInstruction.findMany({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      })

      // Fetch linkedPhoto separately for each instruction
      instructions = await Promise.all((rawInstructions as PropertyInstruction[]).map(async (inst: PropertyInstruction) => {
        let linkedPhoto: InstructionWithPhoto['linkedPhoto'] = null

        if (inst.linkedPhotoId) {
          try {
            const photo = await prisma.propertyPhoto.findUnique({
              where: { id: inst.linkedPhotoId },
              select: { id: true, url: true, caption: true, notes: true, room: true },
            })
            linkedPhoto = photo
          } catch {
            // Continue without linkedPhoto
          }
        }

        return {
          id: inst.id,
          propertyId: inst.propertyId,
          instruction: inst.instruction,
          sortOrder: inst.sortOrder,
          room: inst.room || 'General',
          linkedPhotoId: inst.linkedPhotoId || null,
          linkedPhoto,
          createdAt: inst.createdAt,
        }
      }))
    } catch {
      // PropertyInstruction table might not exist - return empty
      return NextResponse.json({ instructions: [], byRoom: {} })
    }

    // Group by room for easier display
    const byRoom: Record<string, typeof instructions> = {}
    for (const instruction of instructions) {
      const room = instruction.room || 'General'
      if (!byRoom[room]) {
        byRoom[room] = []
      }
      byRoom[room].push(instruction)
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
    let maxSortOrder = 0
    try {
      const maxSort = await prisma.propertyInstruction.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      maxSortOrder = maxSort?.sortOrder || 0
    } catch {
      // Continue with default sort order
    }

    const instruction = await prisma.propertyInstruction.create({
      data: {
        propertyId,
        room: data.room || 'General',
        instruction: data.instruction,
        linkedPhotoId: data.linkedPhotoId || null,
        sortOrder: maxSortOrder + 1,
      },
    })

    // Fetch linkedPhoto separately if exists
    let linkedPhoto = null
    if (instruction.linkedPhotoId) {
      try {
        const photo = await prisma.propertyPhoto.findUnique({
          where: { id: instruction.linkedPhotoId },
          select: { id: true, url: true, caption: true, notes: true, room: true },
        })
        linkedPhoto = photo
      } catch {
        // Continue without linkedPhoto
      }
    }

    return NextResponse.json({ ...instruction, linkedPhoto })
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
      const updateData: Record<string, unknown> = {}
      if (data.instruction !== undefined) updateData.instruction = data.instruction
      if (data.room !== undefined) updateData.room = data.room
      if (data.linkedPhotoId !== undefined) updateData.linkedPhotoId = data.linkedPhotoId || null
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const instruction = await prisma.propertyInstruction.update({
        where: { id: data.id },
        data: updateData,
      })

      // Fetch linkedPhoto separately if exists
      let linkedPhoto = null
      if (instruction.linkedPhotoId) {
        try {
          const photo = await prisma.propertyPhoto.findUnique({
            where: { id: instruction.linkedPhotoId },
            select: { id: true, url: true, caption: true, notes: true, room: true },
          })
          linkedPhoto = photo
        } catch {
          // Continue without linkedPhoto
        }
      }

      return NextResponse.json({ ...instruction, linkedPhoto })
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
