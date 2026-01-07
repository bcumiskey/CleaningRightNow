import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const properties = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: { name: 'asc' },
    })

    // Add active notes count for each property
    const propertiesWithNotes = await Promise.all(
      properties.map(async (property: typeof properties[number]) => {
        const activeNotes = await prisma.propertyNote.count({
          where: {
            propertyId: property.id,
            status: 'active',
          },
        })

        return {
          ...property,
          _activeNotes: activeNotes,
        }
      })
    )

    return NextResponse.json(propertiesWithNotes)
  } catch (error) {
    console.error('Worker properties GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}
