import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const debugInfo: string[] = []
  const { searchParams } = new URL(request.url)
  const debug = searchParams.get('debug') === 'true'
  const includeInactive = searchParams.get('includeInactive') === 'true'

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
        where: includeInactive ? {} : { isActive: true },
        orderBy: { name: 'asc' },
      })
      debugInfo.push(`Prisma OK: ${properties.length} properties`)

      // Try to fetch owners separately
      let owners: Record<string, { id: string; name: string; email: string | null; phone: string | null; defaultBaseRate: number | null; defaultBillingType: string | null }> = {}
      try {
        const ownerList = await prisma.owner.findMany()
        owners = Object.fromEntries(ownerList.map((o: { id: string; name: string; email: string | null; phone: string | null; defaultBaseRate: number | null; defaultBillingType: string | null }) => [o.id, o]))
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
        noteCounts = Object.fromEntries(notes.map((n: { propertyId: string; _count: { id: number } }) => [n.propertyId, n._count.id]))
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
        jobCounts = Object.fromEntries(jobs.map((j: { propertyId: string; _count: { id: number } }) => [j.propertyId, j._count.id]))
        debugInfo.push(`Jobs count groups: ${jobs.length}`)
      } catch (e) {
        debugInfo.push(`Jobs failed: ${e}`)
      }

      // Combine results
      interface PropertyRecord {
        id: string
        name: string
        address: string
        isActive: boolean
        ownerId: string | null
        ownerName: string
        ownerEmail: string | null
        ownerPhone: string | null
        baseRate: number
        expensePercent: number | null
        billingType: string | null
        billingFrequency: string | null
        monthlyBillingDay: number | null
        autoSendInvoice: boolean | null
        accessCode: string | null
        accessNotes: string | null
        bedConfig: string | null
        createdAt: Date
      }
      const result = (properties as PropertyRecord[]).map((property: PropertyRecord) => ({
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
          SELECT * FROM "Property" WHERE ("isActive" = true OR ${includeInactive}) ORDER BY name ASC
        ` as Array<{
          id: string
          name: string
          address: string
          isActive: boolean
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
    console.log('Properties POST - Session:', session?.user)

    if (!session) {
      console.log('Properties POST - No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create properties
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      console.log('Properties POST - Not admin, role:', sessionUser.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()
    console.log('Properties POST - Data received:', JSON.stringify(data, null, 2))

    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      console.log('Properties POST - Validation failed: name')
      return NextResponse.json({ error: 'Property name is required' }, { status: 400 })
    }
    if (!data.address || typeof data.address !== 'string' || data.address.trim().length === 0) {
      console.log('Properties POST - Validation failed: address')
      return NextResponse.json({ error: 'Property address is required' }, { status: 400 })
    }
    if (!data.ownerName || typeof data.ownerName !== 'string' || data.ownerName.trim().length === 0) {
      console.log('Properties POST - Validation failed: ownerName')
      return NextResponse.json({ error: 'Owner name is required' }, { status: 400 })
    }
    const baseRate = parseFloat(data.baseRate)
    if (isNaN(baseRate) || baseRate <= 0) {
      console.log('Properties POST - Validation failed: baseRate', data.baseRate, baseRate)
      return NextResponse.json({ error: 'Base rate must be a positive number' }, { status: 400 })
    }

    // Check for duplicate property name
    const existingProperty = await prisma.property.findUnique({
      where: { name: data.name.trim() },
    })
    if (existingProperty) {
      return NextResponse.json({ error: 'A property with this name already exists' }, { status: 400 })
    }

    const createData = {
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
    }
    console.log('Properties POST - Creating with:', JSON.stringify(createData, null, 2))

    const property = await prisma.property.create({
      data: createData,
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Properties POST error:', error)
    console.error('Properties POST error stack:', error instanceof Error ? error.stack : 'No stack')

    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A property with this name already exists' }, { status: 400 })
    }

    // Handle Prisma foreign key constraint errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({ error: 'Invalid owner reference' }, { status: 400 })
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Failed to create property: ${errorMessage}` }, { status: 500 })
  }
}
