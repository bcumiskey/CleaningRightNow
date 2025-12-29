import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const updateLinenSchema = z.object({
  type: z.string().min(1).optional(),
  quantity: z.number().min(0).optional(),
  condition: z.enum(['GOOD', 'FAIR', 'DAMAGED', 'NEEDS_REPLACEMENT']).optional(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const linen = await prisma.linen.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        replacements: {
          orderBy: { replacedAt: 'desc' },
        },
      },
    })

    if (!linen) {
      return NextResponse.json({ error: 'Linen not found' }, { status: 404 })
    }

    return NextResponse.json(linen)
  } catch (error) {
    console.error('Linen GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch linen' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateLinenSchema.parse(body)

    const existingLinen = await prisma.linen.findUnique({
      where: { id },
      include: { property: { select: { name: true } } },
    })

    if (!existingLinen) {
      return NextResponse.json({ error: 'Linen not found' }, { status: 404 })
    }

    const linen = await prisma.linen.update({
      where: { id },
      data: validatedData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Linen',
      entityId: linen.id,
      oldValues: existingLinen,
      newValues: linen,
      description: generateDescription('UPDATE', 'Linen', `${linen.type} at ${linen.property.name}`),
    })

    return NextResponse.json(linen)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Linen PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update linen' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const linen = await prisma.linen.findUnique({
      where: { id },
      include: { property: { select: { name: true } } },
    })

    if (!linen) {
      return NextResponse.json({ error: 'Linen not found' }, { status: 404 })
    }

    await prisma.linen.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'Linen',
      entityId: id,
      oldValues: linen,
      description: generateDescription('DELETE', 'Linen', `${linen.type} at ${linen.property.name}`),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Linen DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete linen' },
      { status: 500 }
    )
  }
}
