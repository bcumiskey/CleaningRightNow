'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Calendar,
  Users,
  AlertCircle,
  DollarSign,
  ChevronRight,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Alert {
  id: string
  type: 'surprise_booking' | 'urgent_job' | 'critical_issue' | 'unpaid_job' | 'new_job_soon' | 'job_modified' | 'job_cancelled'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  propertyId?: string
  propertyName?: string
  jobId?: string
  date?: string
  actionUrl?: string
  createdAt: string
  isRead?: boolean
  isPersisted?: boolean
}

interface AlertsResponse {
  alerts: Alert[]
  summary: {
    total: number
    critical: number
    warnings: number
    unreadPersisted?: number
  }
}

const getAlertIcon = (type: Alert['type']) => {
  switch (type) {
    case 'surprise_booking':
    case 'new_job_soon':
      return Calendar
    case 'urgent_job':
      return Users
    case 'critical_issue':
    case 'job_cancelled':
      return AlertCircle
    case 'unpaid_job':
      return DollarSign
    case 'job_modified':
      return Calendar
    default:
      return Bell
  }
}

const getSeverityStyles = (severity: Alert['severity']) => {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        badge: 'bg-red-600 text-white',
      }
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        badge: 'bg-amber-500 text-white',
      }
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        badge: 'bg-blue-500 text-white',
      }
  }
}

export default function AlertsPanel() {
  const router = useRouter()
  const [data, setData] = useState<AlertsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAlerts()
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const dismissAlert = async (alertId: string, isPersisted: boolean | undefined, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedAlerts(prev => new Set([...prev, alertId]))

    // If this is a persisted alert, mark it as read in the database
    if (isPersisted) {
      try {
        await fetch('/api/alerts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertIds: [alertId] }),
        })
      } catch (error) {
        console.error('Failed to mark alert as read:', error)
      }
    }
  }

  const visibleAlerts = data?.alerts.filter(a => !dismissedAlerts.has(a.id)) || []

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-gray-400" size={20} />
          <h3 className="font-semibold">Alerts</h3>
        </div>
        <div className="text-gray-500 text-sm">Loading alerts...</div>
      </div>
    )
  }

  if (!data || visibleAlerts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-gray-400" size={20} />
          <h3 className="font-semibold">Alerts</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Bell size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">All clear! No alerts at this time.</p>
        </div>
      </div>
    )
  }

  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          {criticalCount > 0 ? (
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
          ) : (
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Bell className="text-amber-600" size={20} />
            </div>
          )}
          <div>
            <h3 className="font-semibold">
              {criticalCount > 0 ? `${criticalCount} Critical Alert${criticalCount > 1 ? 's' : ''}` : 'Alerts'}
            </h3>
            <p className="text-sm text-gray-500">
              {visibleAlerts.length} item{visibleAlerts.length !== 1 ? 's' : ''} need attention
            </p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y max-h-[400px] overflow-y-auto">
        {visibleAlerts.slice(0, 10).map((alert) => {
          const Icon = getAlertIcon(alert.type)
          const styles = getSeverityStyles(alert.severity)

          return (
            <div
              key={alert.id}
              className={`p-4 ${styles.bg} hover:brightness-95 cursor-pointer transition-all group`}
              onClick={() => alert.actionUrl && router.push(alert.actionUrl)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${styles.border} border bg-white`}>
                  <Icon size={18} className={styles.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles.badge}`}>
                      {alert.severity}
                    </span>
                    <h4 className="font-medium text-gray-900 truncate">{alert.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{alert.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => dismissAlert(alert.id, alert.isPersisted, e)}
                    className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more link if there are more alerts */}
      {visibleAlerts.length > 10 && (
        <div className="p-3 border-t text-center">
          <button className="text-sm text-blue-600 hover:underline">
            View all {visibleAlerts.length} alerts
          </button>
        </div>
      )}
    </div>
  )
}

// Compact version for sidebar/header
export function AlertsBadge() {
  const [count, setCount] = useState(0)
  const [critical, setCritical] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/alerts')
        if (response.ok) {
          const data = await response.json()
          setCount(data.summary.total)
          setCritical(data.summary.critical)
        }
      } catch (error) {
        console.error('Failed to fetch alert count:', error)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
      critical > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500 text-white'
    }`}>
      {count}
    </span>
  )
}
