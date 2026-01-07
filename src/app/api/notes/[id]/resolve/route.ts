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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const note = await prisma.propertyNote.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
      include: {
        addedBy: {
          select: { id: true, name: true },
        },
        property: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Note resolve error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve note' },
      { status: 500 }
    )
  }
}
