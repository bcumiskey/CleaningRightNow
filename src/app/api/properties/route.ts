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

    // Query properties WITHOUT any includes first - this must work
    const properties = await prisma.property.findMany({
      orderBy: { name: 'asc' },
    })

    // Try to fetch owners separately
    let owners: Record<string, { id: string; name: string; email: string | null; phone: string | null; defaultBaseRate: number | null; defaultBillingType: string | null }> = {}
    try {
      const ownerList = await prisma.owner.findMany()
      owners = Object.fromEntries(ownerList.map(o => [o.id, o]))
    } catch {
      // Owner table might not exist or query failed - continue without
    }

    // Try to fetch notes counts separately
    let noteCounts: Record<string, number> = {}
    try {
      const notes = await prisma.propertyNote.groupBy({
        by: ['propertyId'],
        where: { status: 'active' },
        _count: { id: true },
      })
      noteCounts = Object.fromEntries(notes.map(n => [n.propertyId, n._count.id]))
    } catch {
      // PropertyNote table might not exist - continue without
    }

    // Try to fetch job counts separately
    let jobCounts: Record<string, number> = {}
    try {
      const jobs = await prisma.job.groupBy({
        by: ['propertyId'],
        _count: { id: true },
      })
      jobCounts = Object.fromEntries(jobs.map(j => [j.propertyId, j._count.id]))
    } catch {
      // Job table might not exist - continue without
    }

    // Combine results
    const result = properties.map(property => ({
      ...property,
      owner: property.ownerId ? owners[property.ownerId] || null : null,
      notes: Array(noteCounts[property.id] || 0).fill({ id: 'placeholder' }).slice(0, noteCounts[property.id] || 0),
      _count: { jobs: jobCounts[property.id] || 0 },
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
        expensePercent: data.expensePercent ? parseFloat(data.expensePercent) : 12,
        billingType: data.billingType || 'per_job',
        billingFrequency: data.billingFrequency || 'per_job',
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
