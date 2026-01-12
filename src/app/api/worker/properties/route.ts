import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { id?: string; role?: string; teamMemberId?: string }

    // Workers must have a teamMemberId - only show properties they've been assigned to
    if (!sessionUser.teamMemberId && sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For workers, only return properties they have been assigned to via jobs
    // For admins, return all properties
    const whereClause = sessionUser.teamMemberId
      ? {
          jobs: {
            some: {
              assignments: {
                some: { teamMemberId: sessionUser.teamMemberId }
              }
            }
          }
        }
      : {}

    const properties = await prisma.property.findMany({
      where: whereClause,
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
