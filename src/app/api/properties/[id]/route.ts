import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const propertyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  ownerName: z.string().min(1).optional(),
  ownerEmail: z.string().email().optional().nullable(),
  ownerPhone: z.string().optional().nullable(),
  baseRate: z.number().min(0).optional(),
  billingType: z.enum(['per_job', 'monthly']).optional(),
  monthlyBillingDay: z.number().min(1).max(31).optional().nullable(),
  autoSendInvoice: z.boolean().optional(),
  calendarSource: z.string().optional().nullable(),
  icalUrl: z.string().url().optional().nullable(),
  accessCode: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
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

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            addedBy: {
              select: { id: true, name: true },
            },
          },
        },
        photos: {
          orderBy: [{ room: 'asc' }, { sortOrder: 'asc' }],
          include: {
            addedBy: {
              select: { id: true, name: true },
            },
          },
        },
        standingInstructions: {
          orderBy: { sortOrder: 'asc' },
        },
        linenRequirements: {
          include: {
            linenItem: {
              include: {
                category: true,
              },
            },
          },
        },
        linenInventory: {
          include: {
            linenItem: {
              include: {
                category: true,
              },
            },
          },
        },
        jobs: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            assignments: {
              include: {
                teamMember: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 5,
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Property GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const validatedData = propertyUpdateSchema.parse(body)

    const existingProperty = await prisma.property.findUnique({
      where: { id },
    })

    if (!existingProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const property = await prisma.property.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(property)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Property PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingProperty = await prisma.property.findUnique({
      where: { id },
    })

    if (!existingProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    await prisma.property.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    )
  }
}
