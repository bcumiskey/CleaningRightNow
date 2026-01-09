import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get all owners
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const owners = await prisma.owner.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        properties: {
          select: {
            id: true,
            name: true,
            address: true,
            baseRate: true,
          },
        },
        _count: {
          select: { properties: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(owners)
  } catch (error) {
    console.error('Owners GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 })
  }
}

// Create owner
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as { role?: string })?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can create owners' }, { status: 403 })
    }

    const data = await request.json()

    const owner = await prisma.owner.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        defaultBaseRate: data.defaultBaseRate ? parseFloat(data.defaultBaseRate) : null,
        defaultBillingType: data.defaultBillingType || null,
        preferredContactMethod: data.preferredContactMethod || null,
      },
      include: {
        properties: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(owner)
  } catch (error) {
    console.error('Owners POST error:', error)
    return NextResponse.json({ error: 'Failed to create owner' }, { status: 500 })
  }
}
