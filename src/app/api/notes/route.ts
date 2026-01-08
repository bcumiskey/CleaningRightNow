import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get all notes (with optional property filter)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status') // 'active', 'resolved', 'all'
    const includeResolved = searchParams.get('includeResolved') === 'true'

    interface WhereClause {
      propertyId?: string
      status?: string | { in: string[] }
    }
    const where: WhereClause = {}

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (status && status !== 'all') {
      where.status = status
    } else if (!includeResolved) {
      where.status = { in: ['active', 'reported_to_owner'] }
    }

    const notes = await prisma.propertyNote.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, address: true } },
        addedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Notes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { id?: string; role?: string }
    const data = await request.json()

    // Validate required fields
    if (!data.propertyId || !data.type || !data.content) {
      return NextResponse.json(
        { error: 'Property ID, type, and content are required' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['issue', 'damage', 'reminder', 'owner_request', 'info']
    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Get the team member ID for the current user
    let addedById = sessionUser.id

    // If user is admin (User model), we need to find or create a corresponding TeamMember
    if (sessionUser.role === 'admin') {
      const adminEmail = (session.user as { email?: string }).email
      if (adminEmail) {
        let teamMember = await prisma.teamMember.findUnique({
          where: { email: adminEmail },
        })
        if (!teamMember) {
          // Create a TeamMember record for the admin
          teamMember = await prisma.teamMember.create({
            data: {
              name: (session.user as { name?: string }).name || 'Admin',
              email: adminEmail,
              role: 'admin',
            },
          })
        }
        addedById = teamMember.id
      }
    }

    if (!addedById) {
      return NextResponse.json({ error: 'Unable to identify user' }, { status: 400 })
    }

    // Create the note
    const note = await prisma.propertyNote.create({
      data: {
        propertyId: data.propertyId,
        type: data.type,
        title: data.title || null,
        content: data.content,
        severity: data.severity || null,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
        addedById,
      },
      include: {
        property: { select: { id: true, name: true } },
        addedBy: { select: { id: true, name: true } },
        photos: true,
      },
    })

    // If photos were provided, add them
    if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      interface PhotoData {
        url: string
        caption?: string
      }
      await prisma.notePhoto.createMany({
        data: data.photos.map((photo: PhotoData, index: number) => ({
          noteId: note.id,
          url: photo.url,
          caption: photo.caption || null,
          sortOrder: index,
        })),
      })

      // Refetch with photos
      const noteWithPhotos = await prisma.propertyNote.findUnique({
        where: { id: note.id },
        include: {
          property: { select: { id: true, name: true } },
          addedBy: { select: { id: true, name: true } },
          photos: { orderBy: { sortOrder: 'asc' } },
        },
      })
      return NextResponse.json(noteWithPhotos)
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('Notes POST error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
