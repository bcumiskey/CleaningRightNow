'use client'

import { ReactNode } from 'react'
import { Bell, Plus } from 'lucide-react'
import Button from '../ui/Button'

interface AdminHeaderProps {
  title: string
  onQuickAdd?: () => void
  action?: ReactNode
}

export default function AdminHeader({ title, onQuickAdd, action }: AdminHeaderProps) {
  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700">
          <Bell size={20} />
        </button>
        {action}
        {onQuickAdd && (
          <Button onClick={onQuickAdd} size="sm">
            <Plus size={16} />
            Quick Add
          </Button>
        )}
      </div>
    </header>
  )
}
