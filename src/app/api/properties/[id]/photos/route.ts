import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch all reference photos for a property
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

    const photos = await prisma.propertyPhoto.findMany({
      where: { propertyId },
      orderBy: [{ room: 'asc' }, { sortOrder: 'asc' }],
      include: {
        addedBy: { select: { name: true } },
      },
    })

    // Group by room for easier display
    const byRoom: Record<string, typeof photos> = {}
    for (const photo of photos) {
      if (!byRoom[photo.room]) {
        byRoom[photo.room] = []
      }
      byRoom[photo.room].push(photo)
    }

    return NextResponse.json({ photos, byRoom })
  } catch (error) {
    console.error('Property photos GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

// POST - Add a new reference photo
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

    if (!data.url || !data.room) {
      return NextResponse.json({ error: 'URL and room are required' }, { status: 400 })
    }

    // Find team member for addedById (use session email)
    const sessionUser = session.user as { email?: string; id?: string }
    let addedById = data.addedById

    if (!addedById && sessionUser.email) {
      const teamMember = await prisma.teamMember.findUnique({
        where: { email: sessionUser.email },
      })
      if (teamMember) {
        addedById = teamMember.id
      }
    }

    // If still no team member, create/find a default one
    if (!addedById) {
      const defaultMember = await prisma.teamMember.findFirst({
        where: { role: 'admin' },
      })
      addedById = defaultMember?.id
    }

    if (!addedById) {
      return NextResponse.json({ error: 'Could not determine user for photo' }, { status: 400 })
    }

    // Get max sort order for this room
    const maxSort = await prisma.propertyPhoto.findFirst({
      where: { propertyId, room: data.room },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    // Try with new schema (includes notes), fallback if not available
    try {
      const photo = await prisma.propertyPhoto.create({
        data: {
          propertyId,
          room: data.room,
          caption: data.caption || null,
          notes: data.notes || null,
          url: data.url,
          addedById,
          sortOrder: (maxSort?.sortOrder || 0) + 1,
        },
        include: {
          addedBy: { select: { name: true } },
        },
      })
      return NextResponse.json(photo)
    } catch {
      // Fallback for older schema without notes field
      const photo = await prisma.propertyPhoto.create({
        data: {
          propertyId,
          room: data.room,
          caption: data.caption || null,
          url: data.url,
          addedById,
          sortOrder: (maxSort?.sortOrder || 0) + 1,
        },
        include: {
          addedBy: { select: { name: true } },
        },
      })
      return NextResponse.json({ ...photo, notes: null })
    }
  } catch (error) {
    console.error('Property photos POST error:', error)
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 })
  }
}

// PUT - Update a photo (caption, room, sort order)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
    }

    // Try with new schema (includes notes), fallback if not available
    try {
      const updateData: Record<string, unknown> = {}
      if (data.room !== undefined) updateData.room = data.room
      if (data.caption !== undefined) updateData.caption = data.caption
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const photo = await prisma.propertyPhoto.update({
        where: { id: data.id },
        data: updateData,
        include: {
          addedBy: { select: { name: true } },
        },
      })
      return NextResponse.json(photo)
    } catch {
      // Fallback for older schema without notes field
      const updateData: Record<string, unknown> = {}
      if (data.room !== undefined) updateData.room = data.room
      if (data.caption !== undefined) updateData.caption = data.caption
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const photo = await prisma.propertyPhoto.update({
        where: { id: data.id },
        data: updateData,
        include: {
          addedBy: { select: { name: true } },
        },
      })
      return NextResponse.json({ ...photo, notes: null })
    }
  } catch (error) {
    console.error('Property photos PUT error:', error)
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
  }
}

// DELETE - Remove a photo
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
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 })
    }

    // Get the photo URL before deleting (for blob cleanup if needed)
    const photo = await prisma.propertyPhoto.findUnique({
      where: { id: photoId },
      select: { url: true },
    })

    await prisma.propertyPhoto.delete({
      where: { id: photoId },
    })

    return NextResponse.json({ success: true, deletedUrl: photo?.url })
  } catch (error) {
    console.error('Property photos DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
