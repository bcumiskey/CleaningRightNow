import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch all linen categories with items
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.linenCategory.findMany({
      include: {
        items: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Linens GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch linens' }, { status: 500 })
  }
}

// POST - Create new linen item or category
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

    // Create category
    if (data.type === 'category') {
      const category = await prisma.linenCategory.create({
        data: {
          name: data.name,
          sortOrder: data.sortOrder || 0,
        },
      })
      return NextResponse.json(category)
    }

    // Create item
    if (!data.categoryId || !data.name || !data.code) {
      return NextResponse.json(
        { error: 'Category, name, and code are required' },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existing = await prisma.linenItem.findUnique({
      where: { code: data.code },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Item code already exists' },
        { status: 400 }
      )
    }

    const item = await prisma.linenItem.create({
      data: {
        name: data.name,
        code: data.code,
        unitCost: parseFloat(data.unitCost) || 0,
        categoryId: data.categoryId,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Linens POST error:', error)
    return NextResponse.json({ error: 'Failed to create linen' }, { status: 500 })
  }
}
