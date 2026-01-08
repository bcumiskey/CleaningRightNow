import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get single owner
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const owner = await prisma.owner.findUnique({
      where: { id: params.id },
      include: {
        properties: {
          select: {
            id: true,
            name: true,
            address: true,
            baseRate: true,
            imageUrl: true,
          },
        },
      },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    return NextResponse.json(owner)
  } catch (error) {
    console.error('Owner GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch owner' }, { status: 500 })
  }
}

// Update owner
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as { role?: string })?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can update owners' }, { status: 403 })
    }

    const data = await request.json()

    interface UpdateData {
      name?: string
      email?: string | null
      phone?: string | null
      notes?: string | null
      defaultBaseRate?: number | null
      defaultBillingType?: string | null
      preferredContactMethod?: string | null
    }
    const updateData: UpdateData = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (data.defaultBaseRate !== undefined) {
      updateData.defaultBaseRate = data.defaultBaseRate ? parseFloat(data.defaultBaseRate) : null
    }
    if (data.defaultBillingType !== undefined) updateData.defaultBillingType = data.defaultBillingType || null
    if (data.preferredContactMethod !== undefined) updateData.preferredContactMethod = data.preferredContactMethod || null

    const owner = await prisma.owner.update({
      where: { id: params.id },
      data: updateData,
      include: {
        properties: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(owner)
  } catch (error) {
    console.error('Owner PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update owner' }, { status: 500 })
  }
}

// Delete owner
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as { role?: string })?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete owners' }, { status: 403 })
    }

    // Check if owner has properties
    const owner = await prisma.owner.findUnique({
      where: { id: params.id },
      include: { _count: { select: { properties: true } } },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    if (owner._count.properties > 0) {
      return NextResponse.json(
        { error: 'Cannot delete owner with linked properties. Unlink properties first.' },
        { status: 400 }
      )
    }

    await prisma.owner.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Owner DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete owner' }, { status: 500 })
  }
}
