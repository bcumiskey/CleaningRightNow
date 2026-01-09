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

    // Try to fetch notes - if PropertyNote table doesn't exist, return empty
    try {
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

      // Query notes without includes first
      const notes = await prisma.propertyNote.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      })

      // Fetch related data separately for each note
      interface Note {
        id: string
        propertyId: string
        addedById: string
        resolvedById: string | null
        status: string
        createdAt: Date
        updatedAt: Date
        type: string
        title: string | null
        content: string
        severity: string | null
        estimatedCost: number | null
        resolvedAt: Date | null
      }
      const notesWithDetails = await Promise.all((notes as Note[]).map(async (note: Note) => {
        let property = null
        let addedBy = null
        let resolvedBy = null
        let photos: unknown[] = []

        // Get property
        try {
          property = await prisma.property.findUnique({
            where: { id: note.propertyId },
            select: { id: true, name: true, address: true },
          })
        } catch {
          // Continue without property
        }

        // Get addedBy
        try {
          addedBy = await prisma.teamMember.findUnique({
            where: { id: note.addedById },
            select: { id: true, name: true },
          })
        } catch {
          // Continue without addedBy
        }

        // Get resolvedBy if exists
        if (note.resolvedById) {
          try {
            resolvedBy = await prisma.teamMember.findUnique({
              where: { id: note.resolvedById },
              select: { id: true, name: true },
            })
          } catch {
            // Continue without resolvedBy
          }
        }

        // Get photos
        try {
          photos = await prisma.notePhoto.findMany({
            where: { noteId: note.id },
            orderBy: { sortOrder: 'asc' },
          })
        } catch {
          // Continue without photos
        }

        return { ...note, property, addedBy, resolvedBy, photos }
      }))

      return NextResponse.json(notesWithDetails)
    } catch {
      // PropertyNote table doesn't exist - return empty array
      return NextResponse.json([])
    }
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
        try {
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
        } catch {
          // Continue with original addedById
        }
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
    })

    // If photos were provided, add them
    if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      interface PhotoData {
        url: string
        caption?: string
      }
      try {
        await prisma.notePhoto.createMany({
          data: data.photos.map((photo: PhotoData, index: number) => ({
            noteId: note.id,
            url: photo.url,
            caption: photo.caption || null,
            sortOrder: index,
          })),
        })
      } catch {
        // Continue without photos
      }
    }

    // Fetch related data separately
    let propertyData = null
    let addedBy = null
    let photos: unknown[] = []

    try {
      propertyData = await prisma.property.findUnique({
        where: { id: note.propertyId },
        select: { id: true, name: true },
      })
    } catch {
      // Continue without property
    }

    try {
      addedBy = await prisma.teamMember.findUnique({
        where: { id: note.addedById },
        select: { id: true, name: true },
      })
    } catch {
      // Continue without addedBy
    }

    try {
      photos = await prisma.notePhoto.findMany({
        where: { noteId: note.id },
        orderBy: { sortOrder: 'asc' },
      })
    } catch {
      // Continue without photos
    }

    return NextResponse.json({ ...note, property: propertyData, addedBy, photos })
  } catch (error) {
    console.error('Notes POST error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
