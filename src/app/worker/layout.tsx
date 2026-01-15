'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Calendar, CalendarDays, BookOpen, User, AlertTriangle, ArrowLeft, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/worker', label: 'Today', icon: Home },
  { href: '/worker/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/worker/report', label: 'Report', icon: AlertTriangle },
  { href: '/worker/reference', label: 'Reference', icon: BookOpen },
  { href: '/worker/account', label: 'Account', icon: User },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Separate component for admin return detection that uses searchParams
function AdminReturnChecker({ onAdminReturn }: { onAdminReturn: (show: boolean) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const fromAdmin = searchParams.get('from') === 'admin'
    if (fromAdmin) {
      sessionStorage.setItem('workerFromAdmin', 'true')
      onAdminReturn(true)
    } else {
      const storedFlag = sessionStorage.getItem('workerFromAdmin')
      if (storedFlag === 'true') {
        onAdminReturn(true)
      }
    }
  }, [searchParams, onAdminReturn])

  return null
}

function WorkerLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [workerName, setWorkerName] = useState<string>('')
  const [showAdminReturn, setShowAdminReturn] = useState(false)

  useEffect(() => {
    // Check sessionStorage on mount (for subsequent page loads)
    const storedFlag = sessionStorage.getItem('workerFromAdmin')
    if (storedFlag === 'true') {
      setShowAdminReturn(true)
    }
  }, [])

  useEffect(() => {
    // Fetch worker info for greeting
    fetch('/api/worker/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.name) {
          setWorkerName(data.name.split(' ')[0])
        }
      })
      .catch(() => {})
  }, [])

  const greeting = getGreeting()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Suspense-wrapped search params checker */}
      <Suspense fallback={null}>
        <AdminReturnChecker onAdminReturn={setShowAdminReturn} />
      </Suspense>

      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-4 sticky top-0 z-10">
        {showAdminReturn && (
          <Link
            href="/"
            onClick={() => sessionStorage.removeItem('workerFromAdmin')}
            className="flex items-center gap-1 text-emerald-100 hover:text-white text-sm mb-2 -mt-1"
          >
            <ArrowLeft size={14} />
            <span>Return to Admin</span>
          </Link>
        )}
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 z-10">
        {navItems.map((item) => {
          const isActive =
            item.href === '/worker'
              ? pathname === '/worker'
              : pathname.startsWith(item.href)
          const Icon = item.icon

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

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <WorkerLayoutContent>{children}</WorkerLayoutContent>
}
