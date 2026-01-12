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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const propertyId = searchParams.get('propertyId')

    const whereClause: Record<string, unknown> = {}
    if (startDate) {
      whereClause.date = { ...whereClause.date as object, gte: new Date(startDate) }
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date as object, lte: new Date(endDate) }
    }
    if (propertyId) {
      whereClause.propertyId = propertyId
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        property: {
          select: { id: true, name: true, address: true },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })

    // Remove financial data
    interface JobWithProperty { id: string; date: Date; time: string | null; completed: boolean; property: { id: string; name: string; address: string } }
    const sanitizedJobs = jobs.map((job: JobWithProperty) => ({
      id: job.id,
      date: job.date,
      time: job.time,
      completed: job.completed,
      property: job.property,
    }))

    return NextResponse.json(sanitizedJobs)
  } catch (error) {
    console.error('Worker jobs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
