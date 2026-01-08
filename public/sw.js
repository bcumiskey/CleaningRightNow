// Service Worker for Push Notifications
// This runs in the background even when the app is closed

const CACHE_NAME = 'cleaning-right-now-v1'

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated')
  event.waitUntil(self.clients.claim())
})

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')

  let data = {
    title: 'Cleaning Right Now',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    url: '/worker',
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (e) {
      console.error('[SW] Error parsing push data:', e)
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/worker',
      ...data.data,
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)

  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  // Get the URL from notification data
  const url = event.notification.data?.url || '/worker'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Open a new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed')
})

// Background sync (for offline support - future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
})
