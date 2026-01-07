'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/worker', label: 'Today', icon: Home },
  { href: '/worker/schedule', label: 'Schedule', icon: Calendar },
  { href: '/worker/reference', label: 'Reference', icon: BookOpen },
  { href: '/worker/account', label: 'Account', icon: User },
]

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">Cleaning Right Now</h1>
            <p className="text-sm text-emerald-100">Worker Portal</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-semibold">
            W
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-10">
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
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
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
