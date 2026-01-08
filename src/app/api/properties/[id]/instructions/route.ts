import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    const instructions = await prisma.propertyInstruction.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(instructions)
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

    const instruction = await prisma.propertyInstruction.create({
      data: {
        propertyId,
        instruction: data.instruction,
        sortOrder: (maxSort?.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json(instruction)
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
    if (data.id && data.instruction !== undefined) {
      const instruction = await prisma.propertyInstruction.update({
        where: { id: data.id },
        data: { instruction: data.instruction },
      })
      return NextResponse.json(instruction)
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
