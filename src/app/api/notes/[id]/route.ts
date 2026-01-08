import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get a single note with all details
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

    const note = await prisma.propertyNote.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerName: true,
            ownerEmail: true,
          },
        },
        addedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('Note GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

// Update a note (resolve, update content, mark owner notified, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const sessionUser = session.user as { id?: string; role?: string }
    const data = await request.json()

    // Find existing note
    const existingNote = await prisma.propertyNote.findUnique({
      where: { id },
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Build update data
    interface UpdateData {
      type?: string
      title?: string | null
      content?: string
      severity?: string | null
      status?: string
      resolution?: string | null
      resolvedAt?: Date | null
      resolvedById?: string | null
      estimatedCost?: number | null
      ownerNotified?: boolean
      ownerNotifiedAt?: Date | null
    }
    const updateData: UpdateData = {}

    // Allow updating these fields
    if (data.type !== undefined) updateData.type = data.type
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.severity !== undefined) updateData.severity = data.severity
    if (data.estimatedCost !== undefined) {
      updateData.estimatedCost = data.estimatedCost ? parseFloat(data.estimatedCost) : null
    }

    // Handle status change to resolved
    if (data.status === 'resolved' && existingNote.status !== 'resolved') {
      updateData.status = 'resolved'
      updateData.resolvedAt = new Date()
      updateData.resolution = data.resolution || null

      // Get resolver's TeamMember ID
      let resolvedById = sessionUser.id
      if (sessionUser.role === 'admin') {
        const adminEmail = (session.user as { email?: string }).email
        if (adminEmail) {
          const teamMember = await prisma.teamMember.findUnique({
            where: { email: adminEmail },
          })
          if (teamMember) {
            resolvedById = teamMember.id
          }
        }
      }
      updateData.resolvedById = resolvedById || null
    } else if (data.status !== undefined) {
      updateData.status = data.status
      // If reopening a note
      if (data.status === 'active' && existingNote.status === 'resolved') {
        updateData.resolvedAt = null
        updateData.resolvedById = null
        updateData.resolution = null
      }
    }

    // Handle owner notification
    if (data.ownerNotified === true && !existingNote.ownerNotified) {
      updateData.ownerNotified = true
      updateData.ownerNotifiedAt = new Date()
      updateData.status = 'reported_to_owner'
    }

    const note = await prisma.propertyNote.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, name: true } },
        addedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Note PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// Delete a note (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { id } = await params

    // Check if note exists
    const note = await prisma.propertyNote.findUnique({
      where: { id },
      include: { photos: true },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Delete note (photos will cascade delete)
    await prisma.propertyNote.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Note deleted' })
  } catch (error) {
    console.error('Note DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
