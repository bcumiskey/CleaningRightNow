import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { id?: string; role?: string }
    const data = await request.json()

    // Validate subscription data
    if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Get user agent for device tracking
    const userAgent = request.headers.get('user-agent') || undefined

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: data.endpoint },
    })

    if (existing) {
      // Update existing subscription
      await prisma.pushSubscription.update({
        where: { endpoint: data.endpoint },
        data: {
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
          teamMemberId: sessionUser.role === 'worker' ? sessionUser.id : null,
          userId: sessionUser.role === 'admin' ? sessionUser.id : null,
          userAgent,
        },
      })
    } else {
      // Create new subscription
      await prisma.pushSubscription.create({
        data: {
          endpoint: data.endpoint,
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
          teamMemberId: sessionUser.role === 'worker' ? sessionUser.id : null,
          userId: sessionUser.role === 'admin' ? sessionUser.id : null,
          userAgent,
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Subscribed to notifications' })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

// Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    await prisma.pushSubscription.delete({
      where: { endpoint: data.endpoint },
    }).catch(() => {
      // Ignore if not found
    })

    return NextResponse.json({ success: true, message: 'Unsubscribed from notifications' })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
