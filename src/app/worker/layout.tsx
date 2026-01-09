'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, BookOpen, User, Scan, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/worker', label: 'Schedule', icon: Calendar },
  { href: '/worker/report', label: 'Report', icon: AlertTriangle },
  { href: '/worker/check-in', label: 'Check In', icon: Scan, highlight: true },
  { href: '/worker/reference', label: 'Reference', icon: BookOpen },
  { href: '/worker/account', label: 'Account', icon: User },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [workerName, setWorkerName] = useState<string>('')

  useEffect(() => {
    // Fetch worker info for greeting
    fetch('/api/worker/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.name) {
          // Get first name only
          setWorkerName(data.name.split(' ')[0])
        }
      })
      .catch(() => {})
  }, [])

  const greeting = getGreeting()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">
              {greeting}{workerName ? `, ${workerName}` : ''}
            </h1>
            <p className="text-sm text-emerald-100">Cleaning Right Now</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-semibold text-lg">
            {workerName ? workerName[0].toUpperCase() : 'W'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-end py-2 z-10">
        {navItems.map((item) => {
          const isActive =
            item.href === '/worker'
              ? pathname === '/worker'
              : pathname.startsWith(item.href)
          const Icon = item.icon
          const isHighlight = 'highlight' in item && item.highlight

          // Special styling for check-in button (center, raised)
          if (isHighlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 -mt-4"
              >
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center shadow-lg',
                  isActive ? 'bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'
                )}>
                  <Icon size={28} className="text-white" />
                </div>
                <span className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-emerald-600' : 'text-gray-500'
                )}>{item.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
