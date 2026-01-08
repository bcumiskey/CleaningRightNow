import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// PATCH - Update item
export async function PATCH(
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
    const data = await request.json()

    const updateData: {
      name?: string
      code?: string
      categoryId?: string
    } = {}

    if (data.name) updateData.name = data.name
    if (data.code) updateData.code = data.code
    if (data.categoryId) updateData.categoryId = data.categoryId

    const item = await prisma.linenItem.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { name: true } },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Item PATCH error:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'An item with this code already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE - Delete item
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

    // Delete will cascade to requirements and inventory via schema
    await prisma.linenItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Item DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
