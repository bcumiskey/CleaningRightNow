'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Home,
  BookOpen,
  User,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Today', href: '/worker', icon: Home },
  { name: 'Schedule', href: '/worker/schedule', icon: CalendarDays },
  { name: 'Reference', href: '/worker/reference', icon: BookOpen },
  { name: 'Account', href: '/worker/account', icon: User },
]

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Main Content */}
      <main className="max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="max-w-lg mx-auto flex justify-around">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/worker' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center py-2 px-4 min-w-[64px]',
                  isActive
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
