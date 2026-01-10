import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Fetch properties with related data in optimized queries
    const properties = await prisma.property.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        owner: true,
        _count: {
          select: { jobs: true },
        },
      },
    })

    // Get active note counts per property
    const noteCounts = await prisma.propertyNote.groupBy({
      by: ['propertyId'],
      where: { status: 'active' },
      _count: { id: true },
    })
    const noteCountMap = Object.fromEntries(
      noteCounts.map((n) => [n.propertyId, n._count.id])
    )

    // Combine results
    const result = properties.map((property) => ({
      ...property,
      notes: Array(noteCountMap[property.id] || 0).fill({ id: 'placeholder' }),
    }))

    return NextResponse.json(result)
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

    // Only admins can create properties
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return NextResponse.json({ error: 'Property name is required' }, { status: 400 })
    }
    if (!data.address || typeof data.address !== 'string' || data.address.trim().length === 0) {
      return NextResponse.json({ error: 'Property address is required' }, { status: 400 })
    }
    if (!data.ownerName || typeof data.ownerName !== 'string' || data.ownerName.trim().length === 0) {
      return NextResponse.json({ error: 'Owner name is required' }, { status: 400 })
    }
    const baseRate = parseFloat(data.baseRate)
    if (isNaN(baseRate) || baseRate <= 0) {
      return NextResponse.json({ error: 'Base rate must be a positive number' }, { status: 400 })
    }

    // Check for duplicate property name
    const existingProperty = await prisma.property.findUnique({
      where: { name: data.name.trim() },
    })
    if (existingProperty) {
      return NextResponse.json({ error: 'A property with this name already exists' }, { status: 400 })
    }

    const property = await prisma.property.create({
      data: {
        name: data.name.trim(),
        address: data.address.trim(),
        ownerName: data.ownerName.trim(),
        ownerEmail: data.ownerEmail?.trim() || null,
        ownerPhone: data.ownerPhone?.trim() || null,
        ownerId: data.ownerId || null,
        baseRate: baseRate,
        expensePercent: data.expensePercent ? parseFloat(data.expensePercent) : 12,
        billingType: data.billingType || 'per_job',
        billingFrequency: data.billingFrequency || 'per_job',
        monthlyBillingDay: data.monthlyBillingDay ? parseInt(data.monthlyBillingDay) : null,
        autoSendInvoice: data.autoSendInvoice || false,
        accessCode: data.accessCode || null,
        accessNotes: data.accessNotes || null,
        bedConfig: data.bedConfig || null,
        imageUrl: data.imageUrl || null,
        keywords: data.keywords || null,
      },
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Properties POST error:', error)

    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A property with this name already exists' }, { status: 400 })
    }

    // Handle Prisma foreign key constraint errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({ error: 'Invalid owner reference' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
  }
}
