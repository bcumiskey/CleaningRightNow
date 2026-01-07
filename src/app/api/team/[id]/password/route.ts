import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can set passwords
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { password } = await request.json()

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    const worker = await prisma.teamMember.update({
      where: { id },
      data: { password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Password set for ${worker.name}`
    })
  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
  }
}
