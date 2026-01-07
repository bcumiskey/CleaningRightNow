import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const billingItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['service', 'supplies', 'expense', 'other']),
  defaultAmount: z.number().optional().nullable(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingItems = await prisma.customBillingItem.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(billingItems)
  } catch (error) {
    console.error('Billing items GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing items' },
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
    const validatedData = billingItemSchema.parse(body)

    const billingItem = await prisma.customBillingItem.create({
      data: validatedData,
    })

    return NextResponse.json(billingItem, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Billing item POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create billing item' },
      { status: 500 }
    )
  }
}
