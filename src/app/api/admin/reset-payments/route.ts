import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/admin/reset-payments
// Deletes all 2026 invoices and resets all payment status on jobs and assignments.

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dateFilter = {
      gte: new Date('2026-01-01T00:00:00.000Z'),
      lt: new Date('2027-01-01T00:00:00.000Z'),
    }

    // 1. Delete all 2026 invoices (line items cascade via onDelete: Cascade)
    const invoices = await prisma.invoice.findMany({
      where: { invoiceDate: dateFilter },
      select: { id: true },
    })
    const invoiceIds = invoices.map(i => i.id)

    if (invoiceIds.length > 0) {
      await prisma.invoiceLineItem.deleteMany({
        where: { invoiceId: { in: invoiceIds } },
      })
      await prisma.invoice.deleteMany({
        where: { id: { in: invoiceIds } },
      })
    }

    // 2. Reset all 2026 jobs: clear payment flags
    const jobsReset = await prisma.job.updateMany({
      where: { date: dateFilter },
      data: {
        clientPaid: false,
        clientPaidAt: null,
        teamPaid: false,
        teamPaidAt: null,
      },
    })

    // 2b. Un-complete only jobs that are currently completed
    await prisma.job.updateMany({
      where: { date: dateFilter, completed: true },
      data: {
        completed: false,
        completedAt: null,
      },
    })

    // 3. Reset all 2026 job assignments: clear payment info
    const jobs2026 = await prisma.job.findMany({
      where: { date: dateFilter },
      select: { id: true },
    })
    const jobIds = jobs2026.map(j => j.id)

    let assignmentsReset = 0
    if (jobIds.length > 0) {
      const result = await prisma.jobAssignment.updateMany({
        where: { jobId: { in: jobIds } },
        data: {
          paidAt: null,
          paymentMethod: null,
        },
      })
      assignmentsReset = result.count
    }

    return NextResponse.json({
      success: true,
      invoicesDeleted: invoiceIds.length,
      jobsReset: jobsReset.count,
      assignmentsReset,
    })
  } catch (error) {
    console.error('Reset payments error:', error)
    return NextResponse.json(
      { error: 'Failed to reset payments', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
