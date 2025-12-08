import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const laundrySchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  providerId: z.string().optional().nullable(),
  dropOffDate: z.string().min(1, 'Drop-off date is required'),
  pickupDate: z.string().optional().nullable(),
  status: z.enum(['DROPPED_OFF', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED']).default('DROPPED_OFF'),
  cost: z.number().min(0).optional().nullable(),
  items: z.string().optional().nullable(),
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
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const laundryRecords = await prisma.laundryRecord.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        provider: true,
      },
      orderBy: { dropOffDate: 'desc' },
    })

    return NextResponse.json(laundryRecords)
  } catch (error) {
    console.error('Laundry GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch laundry records' },
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
    const validatedData = laundrySchema.parse(body)

    const laundryRecord = await prisma.laundryRecord.create({
      data: {
        propertyId: validatedData.propertyId,
        providerId: validatedData.providerId,
        dropOffDate: new Date(validatedData.dropOffDate),
        pickupDate: validatedData.pickupDate ? new Date(validatedData.pickupDate) : null,
        status: validatedData.status,
        cost: validatedData.cost,
        items: validatedData.items,
        notes: validatedData.notes,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        provider: true,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'LaundryRecord',
      entityId: laundryRecord.id,
      newValues: laundryRecord,
      description: generateDescription('CREATE', 'Laundry Record', `for ${laundryRecord.property.name}`),
    })

    return NextResponse.json(laundryRecord, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Laundry POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create laundry record' },
      { status: 500 }
    )
  }
}
