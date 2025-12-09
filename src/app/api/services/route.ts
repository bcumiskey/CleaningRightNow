import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  basePrice: z.number().min(0).default(0),
  active: z.boolean().default(true),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Services GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
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
    const validatedData = serviceSchema.parse(body)

    const service = await prisma.service.create({
      data: validatedData,
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'Service',
      entityId: service.id,
      newValues: service,
      description: generateDescription('CREATE', 'Service', service.name),
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Services POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    )
  }
}
