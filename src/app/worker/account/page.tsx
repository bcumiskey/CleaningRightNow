'use client'

import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, Mail, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function WorkerAccountPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {session?.user?.name || 'Team Member'}
            </h2>
            <p className="text-gray-500">Worker</p>
          </div>
        </div>

        <div className="space-y-3">
          {session?.user?.email && (
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-400" />
              <span>{session.user.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <Button
        variant="outline"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </Button>
    </div>
  )
}
