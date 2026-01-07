import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || 'Admin',
        businessName: 'Cleaning Right Now',
        expensePercentage: 12,
      }
    })

    // Also create a team member for this user
    await prisma.teamMember.upsert({
      where: { email },
      update: {},
      create: {
        name: name || 'Admin',
        email,
        role: 'admin',
        isActive: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      email: user.email
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
