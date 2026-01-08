'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

interface PushNotificationState {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  permission: NotificationPermission | 'default'
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
  })

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window

      if (!isSupported) {
        setState((prev) => ({ ...prev, isSupported: false, isLoading: false }))
        return
      }

      // Check current permission status
      const permission = Notification.permission

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          permission,
        })
      } catch (error) {
        console.error('Error checking push subscription:', error)
        setState({
          isSupported: true,
          isSubscribed: false,
          isLoading: false,
          permission,
        })
      }
    }

    checkSupport()
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      setState((prev) => ({ ...prev, permission }))

      if (permission !== 'granted') {
        toast.error('Please enable notifications to receive updates')
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      // Register service worker
      let registration = await navigator.serviceWorker.ready
      if (!registration) {
        registration = await registerServiceWorker() as ServiceWorkerRegistration
      }

      if (!registration) {
        toast.error('Failed to register for notifications')
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured')
        toast.error('Notifications not configured yet')
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      })

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      toast.success('Notifications enabled!')
      setState((prev) => ({ ...prev, isSubscribed: true, isLoading: false }))
      return true
    } catch (error) {
      console.error('Error subscribing to push:', error)
      toast.error('Failed to enable notifications')
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [registerServiceWorker])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe()

        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      toast.success('Notifications disabled')
      setState((prev) => ({ ...prev, isSubscribed: false, isLoading: false }))
      return true
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
      toast.error('Failed to disable notifications')
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [])

  // Toggle subscription
  const toggle = useCallback(async (): Promise<boolean> => {
    if (state.isSubscribed) {
      return unsubscribe()
    } else {
      return subscribe()
    }
  }, [state.isSubscribed, subscribe, unsubscribe])

  return {
    ...state,
    subscribe,
    unsubscribe,
    toggle,
    registerServiceWorker,
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default usePushNotifications
