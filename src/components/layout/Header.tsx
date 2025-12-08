'use client'

import { useSession } from 'next-auth/react'
import { Bell, Search, User } from 'lucide-react'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {title && (
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Search button (mobile) */}
          <button className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Bell className="w-5 h-5" />
            {/* Notification badge */}
            {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
          </button>

          {/* User info */}
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name || session?.user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500">Business Owner</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
