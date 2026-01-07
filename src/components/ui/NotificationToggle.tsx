'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { cn } from '@/lib/utils'

interface NotificationToggleProps {
  className?: string
  showLabel?: boolean
}

export default function NotificationToggle({ className, showLabel = true }: NotificationToggleProps) {
  const { isSupported, isSubscribed, isLoading, permission, toggle } = usePushNotifications()

  if (!isSupported) {
    return null // Don't show anything if not supported
  }

  const handleClick = async () => {
    if (isLoading) return
    await toggle()
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
        isSubscribed
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {isLoading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : isSubscribed ? (
        <Bell size={20} />
      ) : (
        <BellOff size={20} />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isLoading
            ? 'Loading...'
            : isSubscribed
            ? 'Notifications On'
            : permission === 'denied'
            ? 'Notifications Blocked'
            : 'Enable Notifications'}
        </span>
      )}
    </button>
  )
}
