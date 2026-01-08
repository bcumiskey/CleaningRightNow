import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// PATCH - Update category
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

    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const category = await prisma.linenCategory.update({
      where: { id },
      data: {
        name: data.name,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Category PATCH error:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE - Delete category (with all its items)
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

    // Delete all items in this category first (cascading delete)
    await prisma.linenItem.deleteMany({
      where: { categoryId: id },
    })

    // Then delete the category
    await prisma.linenCategory.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
