import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Mark team as paid with payment method
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { paymentMethod } = data

    // If paymentMethod is null, we're clearing the payment
    if (paymentMethod === null) {
      // Clear payment on the job
      await prisma.job.update({
        where: { id: params.id },
        data: {
          teamPaid: false,
          teamPaidAt: null,
        },
      })

      // Clear payment on all assignments
      await prisma.jobAssignment.updateMany({
        where: { jobId: params.id },
        data: {
          paidAt: null,
          paymentMethod: null,
        },
      })

      return NextResponse.json({ success: true, cleared: true })
    }

    // Mark as paid with payment method
    const now = new Date()

    // Update the job
    await prisma.job.update({
      where: { id: params.id },
      data: {
        teamPaid: true,
        teamPaidAt: now,
      },
    })

    // Update all assignments with payment info
    await prisma.jobAssignment.updateMany({
      where: { jobId: params.id },
      data: {
        paidAt: now,
        paymentMethod: paymentMethod,
      },
    })

    return NextResponse.json({ success: true, paymentMethod })
  } catch (error) {
    console.error('Team payment error:', error)
    return NextResponse.json({ error: 'Failed to update team payment' }, { status: 500 })
  }
}
