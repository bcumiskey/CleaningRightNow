import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET unbilled jobs for invoice creation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    const whereClause: {
      completed: boolean
      clientPaid: boolean
      invoiceItems: { none: object }
      propertyId?: string
    } = {
      completed: true,
      clientPaid: false,
      invoiceItems: { none: {} }, // Not linked to any invoice line item
    }

    if (propertyId) {
      whereClause.propertyId = propertyId
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      orderBy: [{ propertyId: 'asc' }, { date: 'asc' }],
      include: {
        property: { select: { id: true, name: true, ownerName: true } },
      },
    })

    // Group by property for easier UI selection
    const grouped: Record<string, {
      property: { id: string; name: string; ownerName: string }
      jobs: typeof jobs
    }> = {}

    for (const job of jobs) {
      if (!grouped[job.propertyId]) {
        grouped[job.propertyId] = {
          property: job.property,
          jobs: [],
        }
      }
      grouped[job.propertyId].jobs.push(job)
    }

    return NextResponse.json({
      jobs,
      byProperty: Object.values(grouped),
    })
  } catch (error) {
    console.error('Unbilled jobs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch unbilled jobs' }, { status: 500 })
  }
}
