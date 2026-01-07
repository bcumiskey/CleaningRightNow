import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  ownerEmail: z.string().email().optional().nullable(),
  ownerPhone: z.string().optional().nullable(),
  baseRate: z.number().min(0),
  billingType: z.enum(['per_job', 'monthly']).default('per_job'),
  monthlyBillingDay: z.number().min(1).max(31).optional().nullable(),
  autoSendInvoice: z.boolean().default(false),
  calendarSource: z.string().optional().nullable(),
  icalUrl: z.string().url().optional().nullable(),
  accessCode: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const billingType = searchParams.get('billingType')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (billingType && billingType !== 'all') {
      where.billingType = billingType
    }

    const properties = await prisma.property.findMany({
      where,
      include: {
        _count: {
          select: {
            jobs: true,
            invoices: true,
            notes: { where: { status: 'active' } },
            photos: true,
            linenRequirements: true,
          },
        },
        notes: {
          where: { status: 'active' },
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Properties GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
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
    const validatedData = propertySchema.parse(body)

    const property = await prisma.property.create({
      data: validatedData,
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'Property',
      entityId: property.id,
      newValues: property,
      description: generateDescription('CREATE', 'Property', property.name),
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Properties POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}
