import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const jobs = await prisma.job.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerName: true,
            ownerPhone: true,
            calendarSource: true,
            accessCode: true,
            accessNotes: true,
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: [
        { time: 'asc' },
        { property: { name: 'asc' } },
      ],
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Jobs today GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today\'s jobs' },
      { status: 500 }
    )
  }
}
