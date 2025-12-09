import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const linenSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  type: z.string().min(1, 'Type is required'),
  quantity: z.number().min(0).default(0),
  condition: z.enum(['GOOD', 'FAIR', 'DAMAGED', 'NEEDS_REPLACEMENT']).default('GOOD'),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')
    const condition = searchParams.get('condition')

    const where: Record<string, unknown> = {}

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (condition && condition !== 'all') {
      where.condition = condition
    }

    const linens = await prisma.linen.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        replacements: {
          orderBy: { replacedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ property: { name: 'asc' } }, { type: 'asc' }],
    })

    return NextResponse.json(linens)
  } catch (error) {
    console.error('Linens GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch linens' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = linenSchema.parse(body)

    const linen = await prisma.linen.create({
      data: validatedData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'Linen',
      entityId: linen.id,
      newValues: linen,
      description: generateDescription('CREATE', 'Linen', `${linen.type} at ${linen.property.name}`),
    })

    return NextResponse.json(linen, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Linens POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create linen' },
      { status: 500 }
    )
  }
}
