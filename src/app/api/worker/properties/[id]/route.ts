import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        ownerName: true,
        ownerPhone: true,
        ownerEmail: true,
        accessCode: true,
        instructions: {
          select: {
            id: true,
            category: true,
            content: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        photos: {
          select: {
            id: true,
            url: true,
            caption: true,
            room: true,
          },
        },
        notes: {
          where: { status: 'active' },
          select: {
            id: true,
            type: true,
            content: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        linenRequirements: {
          where: { perFlip: { gt: 0 } },
          include: {
            linenItem: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Group linen requirements by category
    const linensByCategory: Record<string, Array<{ name: string; perFlip: number }>> = {}
    for (const req of property.linenRequirements) {
      const categoryName = req.linenItem.category.name
      if (!linensByCategory[categoryName]) {
        linensByCategory[categoryName] = []
      }
      linensByCategory[categoryName].push({
        name: req.linenItem.name,
        perFlip: req.perFlip,
      })
    }

    // Convert to array format
    const linens = Object.entries(linensByCategory).map(([categoryName, items]) => ({
      categoryName,
      items,
    }))

    return NextResponse.json({
      id: property.id,
      name: property.name,
      address: property.address,
      ownerName: property.ownerName,
      ownerPhone: property.ownerPhone,
      ownerEmail: property.ownerEmail,
      accessCode: property.accessCode,
      instructions: property.instructions,
      photos: property.photos,
      notes: property.notes,
      linens,
    })
  } catch (error) {
    console.error('Worker property GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 })
  }
}
