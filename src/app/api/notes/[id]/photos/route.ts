import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Add photos to a note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // Verify note exists
    const note = await prisma.propertyNote.findUnique({
      where: { id },
      include: { photos: true },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Get the next sort order
    const maxSortOrder = note.photos.length > 0
      ? Math.max(...note.photos.map((p: { sortOrder: number }) => p.sortOrder))
      : -1

    // Handle single photo or array of photos
    const photosToAdd = Array.isArray(data) ? data : [data]

    interface PhotoInput {
      url: string
      caption?: string
    }

    const createdPhotos = await Promise.all(
      photosToAdd.map((photo: PhotoInput, index: number) =>
        prisma.notePhoto.create({
          data: {
            noteId: id,
            url: photo.url,
            caption: photo.caption || null,
            sortOrder: maxSortOrder + 1 + index,
          },
        })
      )
    )

    return NextResponse.json(createdPhotos)
  } catch (error) {
    console.error('Note photos POST error:', error)
    return NextResponse.json({ error: 'Failed to add photos' }, { status: 500 })
  }
}

// Delete a photo from a note
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
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 })
    }

    // Verify photo belongs to this note
    const photo = await prisma.notePhoto.findUnique({
      where: { id: photoId },
    })

    if (!photo || photo.noteId !== id) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    await prisma.notePhoto.delete({
      where: { id: photoId },
    })

    return NextResponse.json({ success: true, message: 'Photo deleted' })
  } catch (error) {
    console.error('Note photo DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
