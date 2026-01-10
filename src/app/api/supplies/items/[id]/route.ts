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

    // Check code uniqueness if changing
    if (data.code) {
      const existing = await prisma.supplyItem.findFirst({
        where: { code: data.code, NOT: { id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Item code already exists' }, { status: 400 })
      }
    }

    const item = await prisma.supplyItem.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        brand: data.brand,
        unitCost: data.unitCost !== undefined ? parseFloat(data.unitCost) : undefined,
        scope: data.scope,
        ownerId: data.scope === 'owner' ? data.ownerId : null,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Supply item PATCH error:', error)
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

    await prisma.supplyItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Supply item DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
