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

    // Query photos without includes first
    let photos: Array<{
      id: string
      propertyId: string
      room: string
      caption: string | null
      notes: string | null
      url: string
      addedById: string
      sortOrder: number
      createdAt: Date
      addedBy: { name: string } | null
    }> = []

    try {
      const rawPhotos = await prisma.propertyPhoto.findMany({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      })

      // Fetch addedBy separately for each photo
      photos = await Promise.all(rawPhotos.map(async (photo) => {
        let addedBy = null
        try {
          const teamMember = await prisma.teamMember.findUnique({
            where: { id: photo.addedById },
            select: { name: true },
          })
          addedBy = teamMember
        } catch {
          // Continue without addedBy
        }

        return {
          ...photo,
          room: photo.room || 'General',
          notes: photo.notes || null,
          addedBy,
        }
      }))
    } catch {
      // PropertyPhoto table might not exist - return empty
      return NextResponse.json({ photos: [], byRoom: {} })
    }

    // Group by room for easier display
    const byRoom: Record<string, typeof photos> = {}
    for (const photo of photos) {
      const room = photo.room || 'General'
      if (!byRoom[room]) {
        byRoom[room] = []
      }
      byRoom[room].push(photo)
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
      try {
        const teamMember = await prisma.teamMember.findUnique({
          where: { email: sessionUser.email },
        })
        if (teamMember) {
          addedById = teamMember.id
        }
      } catch {
        // Continue without team member lookup
      }
    }

    // If still no team member, create/find a default one
    if (!addedById) {
      try {
        const defaultMember = await prisma.teamMember.findFirst({
          where: { role: 'admin' },
        })
        addedById = defaultMember?.id
      } catch {
        // Continue without default member
      }
    }

    if (!addedById) {
      return NextResponse.json({ error: 'Could not determine user for photo' }, { status: 400 })
    }

    // Get max sort order for this room
    let maxSortOrder = 0
    try {
      const maxSort = await prisma.propertyPhoto.findFirst({
        where: { propertyId, room: data.room },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      maxSortOrder = maxSort?.sortOrder || 0
    } catch {
      // Continue with default sort order
    }

    const photo = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        room: data.room,
        caption: data.caption || null,
        notes: data.notes || null,
        url: data.url,
        addedById,
        sortOrder: maxSortOrder + 1,
      },
    })

    // Fetch addedBy separately
    let addedBy = null
    try {
      const teamMember = await prisma.teamMember.findUnique({
        where: { id: addedById },
        select: { name: true },
      })
      addedBy = teamMember
    } catch {
      // Continue without addedBy
    }

    return NextResponse.json({ ...photo, addedBy })
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

    const updateData: Record<string, unknown> = {}
    if (data.room !== undefined) updateData.room = data.room
    if (data.caption !== undefined) updateData.caption = data.caption
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    const photo = await prisma.propertyPhoto.update({
      where: { id: data.id },
      data: updateData,
    })

    // Fetch addedBy separately
    let addedBy = null
    try {
      const teamMember = await prisma.teamMember.findUnique({
        where: { id: photo.addedById },
        select: { name: true },
      })
      addedBy = teamMember
    } catch {
      // Continue without addedBy
    }

    return NextResponse.json({ ...photo, addedBy })
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
    let deletedUrl = null
    try {
      const photo = await prisma.propertyPhoto.findUnique({
        where: { id: photoId },
        select: { url: true },
      })
      deletedUrl = photo?.url
    } catch {
      // Continue without getting URL
    }

    await prisma.propertyPhoto.delete({
      where: { id: photoId },
    })

    return NextResponse.json({ success: true, deletedUrl })
  } catch (error) {
    console.error('Property photos DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
