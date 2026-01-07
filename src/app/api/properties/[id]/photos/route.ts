import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const photoSchema = z.object({
  room: z.string().min(1, 'Room is required'),
  caption: z.string().optional().nullable(),
  url: z.string().url('Valid URL is required'),
  addedById: z.string().min(1, 'Added by is required'),
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
    const searchParams = request.nextUrl.searchParams
    const room = searchParams.get('room')

    const where: Record<string, unknown> = { propertyId: id }

    if (room) {
      where.room = room
    }

    const photos = await prisma.propertyPhoto.findMany({
      where,
      include: {
        addedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ room: 'asc' }, { sortOrder: 'asc' }],
    })

    return NextResponse.json(photos)
  } catch (error) {
    console.error('Property photos GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
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
    const validatedData = photoSchema.parse(body)

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const photo = await prisma.propertyPhoto.create({
      data: {
        ...validatedData,
        propertyId: id,
      },
      include: {
        addedBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Property photo POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create photo' },
      { status: 500 }
    )
  }
}
