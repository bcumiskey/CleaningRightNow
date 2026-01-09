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

    const sessionUser = session.user as { id?: string; teamMemberId?: string }
    const teamMemberId = sessionUser.teamMemberId

    if (!teamMemberId) {
      // For admins without teamMemberId, return their user name
      return NextResponse.json({
        name: session.user?.name || 'User',
        email: session.user?.email
      })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    })

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json(teamMember)
  } catch (error) {
    console.error('Worker me error:', error)
    return NextResponse.json({ error: 'Failed to fetch worker info' }, { status: 500 })
  }
}
