import webpush from 'web-push'

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@cleaningrightnow.com'),
    vapidPublicKey,
    vapidPrivateKey
  )
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { success: false, error: 'Push notifications not configured' }
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload)
    )
    return { success: true }
  } catch (error) {
    const err = error as { statusCode?: number; message?: string }
    // 410 Gone or 404 means subscription is no longer valid
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, error: 'subscription_expired' }
    }
    return { success: false, error: err.message || 'Failed to send notification' }
  }
}

/**
 * Send push notification to multiple subscriptions
 */
export async function sendPushNotifications(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; expiredEndpoints: string[] }> {
  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification(sub, payload)
      return { endpoint: sub.endpoint, ...result }
    })
  )

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const expiredEndpoints = results
    .filter((r) => r.error === 'subscription_expired')
    .map((r) => r.endpoint)

  return { sent, failed, expiredEndpoints }
}

/**
 * Notification types for the app
 */
export const NotificationTypes = {
  NEW_JOB: 'new_job',
  JOB_UPDATED: 'job_updated',
  JOB_REMINDER: 'job_reminder',
  PAYMENT_RECEIVED: 'payment_received',
  NEW_NOTE: 'new_note',
  SCHEDULE_CHANGE: 'schedule_change',
} as const

/**
 * Create notification payload for common scenarios
 */
export function createNotificationPayload(
  type: keyof typeof NotificationTypes,
  data: Record<string, string>
): PushPayload {
  switch (type) {
    case 'NEW_JOB':
      return {
        title: 'New Job Assigned',
        body: `You have a new job at ${data.propertyName} on ${data.date}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        url: '/worker',
        tag: 'new-job',
      }
    case 'JOB_UPDATED':
      return {
        title: 'Job Updated',
        body: `The job at ${data.propertyName} has been updated`,
        icon: '/icons/icon-192x192.png',
        url: '/worker',
        tag: 'job-update',
      }
    case 'JOB_REMINDER':
      return {
        title: 'Job Reminder',
        body: `Don't forget: ${data.propertyName} today at ${data.time}`,
        icon: '/icons/icon-192x192.png',
        url: '/worker',
        tag: 'job-reminder',
      }
    case 'PAYMENT_RECEIVED':
      return {
        title: 'Payment Received! 💰',
        body: `You received $${data.amount} for your work`,
        icon: '/icons/icon-192x192.png',
        url: '/worker/account',
        tag: 'payment',
      }
    case 'NEW_NOTE':
      return {
        title: 'New Property Note',
        body: `A note was added for ${data.propertyName}`,
        icon: '/icons/icon-192x192.png',
        url: '/worker/reference',
        tag: 'note',
      }
    case 'SCHEDULE_CHANGE':
      return {
        title: 'Schedule Changed',
        body: data.message || 'Your schedule has been updated',
        icon: '/icons/icon-192x192.png',
        url: '/worker',
        tag: 'schedule',
      }
    default:
      return {
        title: 'Notification',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        url: '/worker',
      }
  }
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey)
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getPublicVapidKey(): string | undefined {
  return vapidPublicKey
}
