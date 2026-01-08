import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  sendPushNotifications,
  createNotificationPayload,
  NotificationTypes,
  isPushConfigured,
  PushPayload,
} from '@/lib/push-notifications'

// Send push notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: 'Push notifications not configured. Please set VAPID keys.' },
        { status: 503 }
      )
    }

    const data = await request.json()

    // Determine recipients
    let subscriptions
    if (data.teamMemberId) {
      // Send to specific worker
      subscriptions = await prisma.pushSubscription.findMany({
        where: { teamMemberId: data.teamMemberId },
      })
    } else if (data.allWorkers) {
      // Send to all workers
      subscriptions = await prisma.pushSubscription.findMany({
        where: { teamMemberId: { not: null } },
      })
    } else if (data.allAdmins) {
      // Send to all admins
      subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { not: null } },
      })
    } else {
      // Send to all
      subscriptions = await prisma.pushSubscription.findMany()
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No subscriptions found',
        sent: 0,
        failed: 0,
      })
    }

    // Build payload
    let payload: PushPayload
    if (data.type && NotificationTypes[data.type as keyof typeof NotificationTypes]) {
      payload = createNotificationPayload(
        data.type as keyof typeof NotificationTypes,
        data.data || {}
      )
    } else {
      // Custom payload
      payload = {
        title: data.title || 'Cleaning Right Now',
        body: data.body || 'You have a new notification',
        icon: data.icon || '/icons/icon-192x192.png',
        url: data.url || '/worker',
        tag: data.tag,
      }
    }

    // Send notifications
    interface Subscription { endpoint: string; p256dh: string; auth: string }
    const results = await sendPushNotifications(
      subscriptions.map((sub: Subscription) => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      })),
      payload
    )

    // Clean up expired subscriptions
    if (results.expiredEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: results.expiredEndpoints } },
      })
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      expiredRemoved: results.expiredEndpoints.length,
    })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
