import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const replacementSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  resetCondition: z.boolean().optional().default(true),
})

// Get replacement history for a linen
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

    const replacements = await prisma.linenReplacement.findMany({
      where: { linenId: id },
      orderBy: { replacedAt: 'desc' },
    })

    return NextResponse.json(replacements)
  } catch (error) {
    console.error('Linen replacements GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch replacements' },
      { status: 500 }
    )
  }
}

// Record a new replacement
export async function POST(
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
    const validatedData = replacementSchema.parse(body)

    // Get the linen to update
    const linen = await prisma.linen.findUnique({
      where: { id },
      include: { property: { select: { name: true } } },
    })

    if (!linen) {
      return NextResponse.json({ error: 'Linen not found' }, { status: 404 })
    }

    // Create replacement record and update linen condition in a transaction
    const [replacement] = await prisma.$transaction([
      prisma.linenReplacement.create({
        data: {
          linenId: id,
          quantity: validatedData.quantity,
          reason: validatedData.reason,
          cost: validatedData.cost,
        },
      }),
      // Optionally reset condition to GOOD after replacement
      ...(validatedData.resetCondition
        ? [
            prisma.linen.update({
              where: { id },
              data: { condition: 'GOOD' },
            }),
          ]
        : []),
    ])

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'LinenReplacement',
      entityId: replacement.id,
      newValues: replacement,
      description: generateDescription(
        'CREATE',
        'LinenReplacement',
        `Replaced ${validatedData.quantity}x ${linen.type} at ${linen.property.name}`
      ),
    })

    return NextResponse.json(replacement, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Linen replacement POST error:', error)
    return NextResponse.json(
      { error: 'Failed to record replacement' },
      { status: 500 }
    )
  }
}
