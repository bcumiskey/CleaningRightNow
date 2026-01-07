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

    // Get all completed jobs
    const completedJobs = await prisma.job.findMany({
      where: { completed: true },
      include: { assignments: true },
    })

    const totalRevenue = completedJobs.reduce((sum: number, job: { rate: number }) => sum + job.rate, 0)
    const totalJobs = completedJobs.length
    const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0

    // Calculate team payments
    let teamPayments = 0
    completedJobs.forEach((job: { rate: number; expensePercent: number }) => {
      const teamTotal = job.rate * (1 - job.expensePercent / 100)
      teamPayments += teamTotal
    })

    return NextResponse.json({
      totalRevenue,
      totalJobs,
      avgJobValue,
      teamPayments,
    })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
  }
}
