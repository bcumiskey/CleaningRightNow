import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

// This endpoint creates or resets the admin user
// It's protected by a setup token from environment variables
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, setupToken } = body

    // Verify setup token (set SETUP_TOKEN in your Vercel env vars)
    const validToken = process.env.SETUP_TOKEN || 'setup-cleaning-right-now-2024'

    if (setupToken !== validToken) {
      return NextResponse.json({ error: 'Invalid setup token' }, { status: 401 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create or update the user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Admin',
        businessName: 'Cleaning Right Now',
        expensePercentage: 12,
      },
    })

    // Create default services if they don't exist
    const defaultServices = [
      { name: 'Standard Clean', basePrice: 100, description: 'Regular cleaning service' },
      { name: 'Deep Clean', basePrice: 200, description: 'Thorough deep cleaning' },
      { name: 'Laundry', basePrice: 50, description: 'Laundry and linen service' },
      { name: 'Window Cleaning', basePrice: 75, description: 'Interior and exterior windows' },
    ]

    for (const service of defaultServices) {
      await prisma.service.upsert({
        where: { id: service.name.toLowerCase().replace(/\s+/g, '-') },
        update: {},
        create: {
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
          active: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created/updated successfully',
      email: user.email,
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Setup failed. Make sure DATABASE_URL is configured correctly.' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if setup is needed
export async function GET() {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({
      setupRequired: userCount === 0,
      userCount,
    })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json(
      { error: 'Database connection failed. Check DATABASE_URL.' },
      { status: 500 }
    )
  }
}
