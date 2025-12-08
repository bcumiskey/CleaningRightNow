import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const supplySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  unit: z.string().default('unit'),
  quantity: z.number().min(0).default(0),
  costPerUnit: z.number().min(0).default(0),
  lowStockThreshold: z.number().min(0).default(5),
  category: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplies = await prisma.supply.findMany({
      include: {
        _count: {
          select: {
            restocks: true,
            usage: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(supplies)
  } catch (error) {
    console.error('Supplies GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplies' },
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
    const validatedData = supplySchema.parse(body)

    const supply = await prisma.supply.create({
      data: validatedData,
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'Supply',
      entityId: supply.id,
      newValues: supply,
      description: generateDescription('CREATE', 'Supply', supply.name),
    })

    return NextResponse.json(supply, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Supplies POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create supply' },
      { status: 500 }
    )
  }
}
