'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User, Phone, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function WorkerAccountPage() {
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="text-emerald-600" size={32} />
          </div>
          <div>
            <div className="font-semibold text-lg">Worker</div>
            <div className="text-gray-500">Team Member</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-gray-900">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600">
              <Phone size={18} />
              <span>Not set</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail size={18} />
              <span>Not set</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut size={18} />
        Sign Out
      </Button>
    </div>
  )
}
