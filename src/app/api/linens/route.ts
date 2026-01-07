import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const linenItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  unitCost: z.number().min(0).default(0),
  categoryId: z.string().min(1, 'Category is required'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId')

    const where: Record<string, unknown> = {}

    if (categoryId) {
      where.categoryId = categoryId
    }

    const linenItems = await prisma.linenItem.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            requirements: true,
            inventory: true,
          },
        },
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(linenItems)
  } catch (error) {
    console.error('Linens GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch linen items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = linenItemSchema.parse(body)

    const linenItem = await prisma.linenItem.create({
      data: validatedData,
      include: {
        category: true,
      },
    })

    return NextResponse.json(linenItem, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Linen item POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create linen item' },
      { status: 500 }
    )
  }
}
