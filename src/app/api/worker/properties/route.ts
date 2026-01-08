import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const properties = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        notes: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Add active notes count
    interface PropertyWithNotes { id: string; name: string; address: string; notes: { id: string }[] }
    const propertiesWithCount = properties.map((p: PropertyWithNotes) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      _activeNotes: p.notes.length,
    }))

    return NextResponse.json(propertiesWithCount)
  } catch (error) {
    console.error('Worker properties GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}
