import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Generate a secure random token that's hard to guess or memorize
function generateSecureToken(): string {
  return randomBytes(32).toString('base64url')
}

// PATCH - Update a check-in token (regenerate, toggle active, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { isActive, regenerate, expiresAt } = body

    const existingToken = await prisma.propertyCheckInToken.findUnique({
      where: { id },
    })

    if (!existingToken) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive
    }

    if (regenerate) {
      updateData.token = generateSecureToken()
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    }

    const updatedToken = await prisma.propertyCheckInToken.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedToken)
  } catch (error) {
    console.error('Check-in token PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update token' }, { status: 500 })
  }
}

// DELETE - Remove a check-in token
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.propertyCheckInToken.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Check-in token DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 })
  }
}
