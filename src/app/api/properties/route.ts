import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const debugInfo: string[] = []
  const { searchParams } = new URL(request.url)
  const debug = searchParams.get('debug') === 'true'

  try {
    const session = await getServerSession(authOptions)
    debugInfo.push(`Session: ${session ? 'authenticated' : 'none'}`)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', debug: debug ? debugInfo : undefined }, { status: 401 })
    }

    // Try standard Prisma query first
    try {
      debugInfo.push('Trying Prisma findMany...')
      const properties = await prisma.property.findMany({
        orderBy: { name: 'asc' },
      })
      debugInfo.push(`Prisma OK: ${properties.length} properties`)

      // Try to fetch owners separately
      let owners: Record<string, { id: string; name: string; email: string | null; phone: string | null; defaultBaseRate: number | null; defaultBillingType: string | null }> = {}
      try {
        const ownerList = await prisma.owner.findMany()
        owners = Object.fromEntries(ownerList.map(o => [o.id, o]))
        debugInfo.push(`Owners: ${ownerList.length}`)
      } catch (e) {
        debugInfo.push(`Owners failed: ${e}`)
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
        debugInfo.push(`Notes count groups: ${notes.length}`)
      } catch (e) {
        debugInfo.push(`Notes failed: ${e}`)
      }

      // Try to fetch job counts separately
      let jobCounts: Record<string, number> = {}
      try {
        const jobs = await prisma.job.groupBy({
          by: ['propertyId'],
          _count: { id: true },
        })
        jobCounts = Object.fromEntries(jobs.map(j => [j.propertyId, j._count.id]))
        debugInfo.push(`Jobs count groups: ${jobs.length}`)
      } catch (e) {
        debugInfo.push(`Jobs failed: ${e}`)
      }

      // Combine results
      const result = properties.map(property => ({
        ...property,
        owner: property.ownerId ? owners[property.ownerId] || null : null,
        notes: Array(noteCounts[property.id] || 0).fill({ id: 'placeholder' }).slice(0, noteCounts[property.id] || 0),
        _count: { jobs: jobCounts[property.id] || 0 },
      }))

      // If debug mode, include debug info in response headers
      const response = NextResponse.json(result)
      if (debug) {
        response.headers.set('X-Debug-Info', JSON.stringify(debugInfo))
      }
      return response
    } catch (prismaError) {
      debugInfo.push(`Prisma failed: ${prismaError}`)
      debugInfo.push('Trying raw SQL...')

      try {
        const properties = await prisma.$queryRaw`
          SELECT * FROM "Property" ORDER BY name ASC
        ` as Array<{
          id: string
          name: string
          address: string
          ownerId: string | null
          ownerName: string
          ownerEmail: string | null
          ownerPhone: string | null
          baseRate: number
          expensePercent: number
          billingType: string
          billingFrequency: string
          monthlyBillingDay: number | null
          autoSendInvoice: boolean
          calendarSource: string | null
          icalUrl: string | null
          accessCode: string | null
          accessNotes: string | null
          bedConfig: string | null
          imageUrl: string | null
          createdAt: Date
          updatedAt: Date
        }>

        debugInfo.push(`Raw SQL OK: ${properties.length} properties`)

        const result = properties.map(property => ({
          ...property,
          owner: null,
          notes: [],
          _count: { jobs: 0 },
        }))

        const response = NextResponse.json(result)
        if (debug) {
          response.headers.set('X-Debug-Info', JSON.stringify(debugInfo))
        }
        return response
      } catch (rawError) {
        debugInfo.push(`Raw SQL failed: ${rawError}`)
        throw rawError
      }
    }
  } catch (error) {
    console.error('Properties GET error:', error)
    debugInfo.push(`Final error: ${error}`)
    return NextResponse.json({
      error: 'Failed to fetch properties',
      details: String(error),
      debug: debug ? debugInfo : undefined,
    }, { status: 500 })
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
    return NextResponse.json({ error: 'Failed to create property', details: String(error) }, { status: 500 })
  }
}
