import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - List all supply categories with items
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.supplyCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { name: 'asc' },
          include: {
            owner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Supplies GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch supplies' }, { status: 500 })
  }
}

// POST - Create category or item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    if (data.type === 'category') {
      // Create category
      const existing = await prisma.supplyCategory.findUnique({
        where: { name: data.name },
      })
      if (existing) {
        return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
      }

      const maxOrder = await prisma.supplyCategory.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })

      const category = await prisma.supplyCategory.create({
        data: {
          name: data.name,
          sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
        },
      })

      return NextResponse.json(category, { status: 201 })
    } else {
      // Create item
      if (!data.categoryId || !data.name || !data.code) {
        return NextResponse.json({ error: 'Category, name, and code are required' }, { status: 400 })
      }

      // Check for unique code
      const existingCode = await prisma.supplyItem.findUnique({
        where: { code: data.code },
      })
      if (existingCode) {
        return NextResponse.json({ error: 'Item code already exists' }, { status: 400 })
      }

      const item = await prisma.supplyItem.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          code: data.code,
          brand: data.brand || null,
          unitCost: parseFloat(data.unitCost) || 0,
          scope: data.scope || 'global',
          ownerId: data.scope === 'owner' ? data.ownerId : null,
        },
      })

      return NextResponse.json(item, { status: 201 })
    }
  } catch (error) {
    console.error('Supplies POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
