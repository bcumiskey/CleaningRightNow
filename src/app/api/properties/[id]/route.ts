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

    // Try Prisma query first
    try {
      const property = await prisma.property.findUnique({
        where: { id },
      })

      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }

      // Build result object starting with basic property
      const result: Record<string, unknown> = { ...property }

      // Try to fetch owner separately
      if (property.ownerId) {
        try {
          const owner = await prisma.owner.findUnique({
            where: { id: property.ownerId },
          })
          result.owner = owner
        } catch {
          result.owner = null
        }
      } else {
        result.owner = null
      }

      // Try to fetch notes separately
      try {
        const notes = await prisma.propertyNote.findMany({
          where: {
            propertyId: id,
            status: { in: ['active', 'reported_to_owner'] },
          },
          orderBy: { createdAt: 'desc' },
        })

        const notesWithDetails = await Promise.all(notes.map(async (note) => {
          let addedBy = null
          let photos: unknown[] = []

          try {
            const teamMember = await prisma.teamMember.findUnique({
              where: { id: note.addedById },
              select: { name: true },
            })
            addedBy = teamMember
          } catch {
            // Continue
          }

          try {
            photos = await prisma.notePhoto.findMany({
              where: { noteId: note.id },
              orderBy: { sortOrder: 'asc' },
            })
          } catch {
            // Continue
          }

          return { ...note, addedBy, photos }
        }))

        result.notes = notesWithDetails
      } catch {
        result.notes = []
      }

      // Try to fetch instructions separately
      try {
        const instructions = await prisma.propertyInstruction.findMany({
          where: { propertyId: id },
          orderBy: { sortOrder: 'asc' },
        })
        result.instructions = instructions
      } catch {
        result.instructions = []
      }

      // Try to fetch photos separately
      try {
        const photos = await prisma.propertyPhoto.findMany({
          where: { propertyId: id },
          orderBy: { sortOrder: 'asc' },
        })

        const photosWithDetails = await Promise.all(photos.map(async (photo) => {
          let addedBy = null
          try {
            const teamMember = await prisma.teamMember.findUnique({
              where: { id: photo.addedById },
              select: { name: true },
            })
            addedBy = teamMember
          } catch {
            // Continue
          }
          return { ...photo, addedBy }
        }))

        result.photos = photosWithDetails
      } catch {
        result.photos = []
      }

      return NextResponse.json(result)
    } catch (prismaError) {
      // Prisma query failed - try raw SQL
      console.error('Prisma query failed, trying raw SQL:', prismaError)

      try {
        const properties = await prisma.$queryRaw`
          SELECT * FROM "Property" WHERE id = ${id}
        ` as Array<Record<string, unknown>>

        if (properties.length === 0) {
          return NextResponse.json({ error: 'Property not found' }, { status: 404 })
        }

        const property = properties[0]
        return NextResponse.json({
          ...property,
          owner: null,
          notes: [],
          instructions: [],
          photos: [],
        })
      } catch (rawError) {
        console.error('Raw SQL also failed:', rawError)
        throw rawError
      }
    }
  } catch (error) {
    console.error('Property GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch property', details: String(error) }, { status: 500 })
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
      expensePercent?: number
      billingType?: string
      billingFrequency?: string
      monthlyBillingDay?: number | null
      autoSendInvoice?: boolean
      accessCode?: string | null
      accessNotes?: string | null
      bedConfig?: string | null
      imageUrl?: string | null
      keywords?: string | null
    }
    const updateData: UpdateData = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.address !== undefined) updateData.address = data.address
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName
    if (data.ownerEmail !== undefined) updateData.ownerEmail = data.ownerEmail || null
    if (data.ownerPhone !== undefined) updateData.ownerPhone = data.ownerPhone || null
    if (data.baseRate !== undefined) updateData.baseRate = parseFloat(data.baseRate)
    if (data.expensePercent !== undefined) updateData.expensePercent = parseFloat(data.expensePercent)
    if (data.billingType !== undefined) updateData.billingType = data.billingType
    if (data.billingFrequency !== undefined) updateData.billingFrequency = data.billingFrequency
    if (data.monthlyBillingDay !== undefined) {
      updateData.monthlyBillingDay = data.monthlyBillingDay ? parseInt(data.monthlyBillingDay) : null
    }
    if (data.autoSendInvoice !== undefined) updateData.autoSendInvoice = data.autoSendInvoice
    if (data.accessCode !== undefined) updateData.accessCode = data.accessCode || null
    if (data.accessNotes !== undefined) updateData.accessNotes = data.accessNotes || null
    if (data.bedConfig !== undefined) updateData.bedConfig = data.bedConfig || null
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null
    if (data.keywords !== undefined) updateData.keywords = data.keywords || null

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
