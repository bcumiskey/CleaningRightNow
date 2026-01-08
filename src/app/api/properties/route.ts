import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const properties = await prisma.property.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            defaultBaseRate: true,
            defaultBillingType: true,
          },
        },
        notes: {
          where: { status: 'active' },
          select: { id: true },
        },
        _count: {
          select: { jobs: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Properties GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const property = await prisma.property.create({
      data: {
        name: data.name,
        address: data.address,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail || null,
        ownerPhone: data.ownerPhone || null,
        ownerId: data.ownerId || null,
        baseRate: parseFloat(data.baseRate),
        billingType: data.billingType || 'per_job',
        monthlyBillingDay: data.monthlyBillingDay ? parseInt(data.monthlyBillingDay) : null,
        autoSendInvoice: data.autoSendInvoice || false,
        calendarSource: data.calendarSource || null,
        icalUrl: data.icalUrl || null,
        accessCode: data.accessCode || null,
        accessNotes: data.accessNotes || null,
        bedConfig: data.bedConfig || null,
        imageUrl: data.imageUrl || null,
      },
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Properties POST error:', error)
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
  }
}
