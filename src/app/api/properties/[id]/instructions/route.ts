import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const instructionSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  sortOrder: z.number().default(0),
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

    const instructions = await prisma.propertyInstruction.findMany({
      where: { propertyId: id },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(instructions)
  } catch (error) {
    console.error('Property instructions GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch instructions' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const validatedData = instructionSchema.parse(body)

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const instruction = await prisma.propertyInstruction.create({
      data: {
        ...validatedData,
        propertyId: id,
      },
    })

    return NextResponse.json(instruction, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Property instruction POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create instruction' },
      { status: 500 }
    )
  }
}
