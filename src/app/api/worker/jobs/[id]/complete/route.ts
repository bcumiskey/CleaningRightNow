import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const job = await prisma.job.update({
      where: { id },
      data: { completed: true },
    })

    return NextResponse.json({ success: true, completed: job.completed })
  } catch (error) {
    console.error('Worker job complete error:', error)
    return NextResponse.json({ error: 'Failed to complete job' }, { status: 500 })
  }
}
