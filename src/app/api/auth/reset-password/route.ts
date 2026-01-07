import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

// This is a temporary debug/reset endpoint
// DELETE THIS IN PRODUCTION
export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and newPassword are required' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // List all users for debugging
      const allUsers = await prisma.user.findMany({
        select: { email: true, name: true, id: true }
      })
      return NextResponse.json(
        {
          error: 'User not found',
          existingUsers: allUsers
        },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update the password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    })

    return NextResponse.json({
      success: true,
      message: `Password reset for ${email}. You can now login with your new password.`
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password', details: String(error) },
      { status: 500 }
    )
  }
}

// GET to see existing users (for debugging)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users', details: String(error) },
      { status: 500 }
    )
  }
}
