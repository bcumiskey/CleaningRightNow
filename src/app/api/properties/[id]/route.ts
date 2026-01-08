import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get a single property with all details
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
        owner: true,
        notes: {
          where: { status: { in: ['active', 'reported_to_owner'] } },
          include: {
            addedBy: { select: { name: true } },
            photos: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        instructions: {
          orderBy: { sortOrder: 'asc' },
        },
        photos: {
          include: {
            addedBy: { select: { name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Property GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 })
  }
}

// Update a property
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update properties
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()

    // Build update data
    interface UpdateData {
      name?: string
      address?: string
      ownerId?: string | null
      ownerName?: string
      ownerEmail?: string | null
      ownerPhone?: string | null
      baseRate?: number
      billingType?: string
      monthlyBillingDay?: number | null
      autoSendInvoice?: boolean
      calendarSource?: string | null
      icalUrl?: string | null
      accessCode?: string | null
      accessNotes?: string | null
      bedConfig?: string | null
      imageUrl?: string | null
    }
    const updateData: UpdateData = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.address !== undefined) updateData.address = data.address
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName
    if (data.ownerEmail !== undefined) updateData.ownerEmail = data.ownerEmail || null
    if (data.ownerPhone !== undefined) updateData.ownerPhone = data.ownerPhone || null
    if (data.baseRate !== undefined) updateData.baseRate = parseFloat(data.baseRate)
    if (data.billingType !== undefined) updateData.billingType = data.billingType
    if (data.monthlyBillingDay !== undefined) {
      updateData.monthlyBillingDay = data.monthlyBillingDay ? parseInt(data.monthlyBillingDay) : null
    }
    if (data.autoSendInvoice !== undefined) updateData.autoSendInvoice = data.autoSendInvoice
    if (data.calendarSource !== undefined) updateData.calendarSource = data.calendarSource || null
    if (data.icalUrl !== undefined) updateData.icalUrl = data.icalUrl || null
    if (data.accessCode !== undefined) updateData.accessCode = data.accessCode || null
    if (data.accessNotes !== undefined) updateData.accessNotes = data.accessNotes || null
    if (data.bedConfig !== undefined) updateData.bedConfig = data.bedConfig || null
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null

    const property = await prisma.property.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Property PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 })
  }
}

// Delete a property (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.property.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Property deleted' })
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 })
  }
}
