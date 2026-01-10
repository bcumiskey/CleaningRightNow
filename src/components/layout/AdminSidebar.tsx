'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  Building,
  Users,
  UserCircle,
  Package,
  FileText,
  TrendingUp,
  StickyNote,
  User,
  LogOut,
  Settings,
  HardHat,
  Receipt,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/jobs', label: 'Jobs & Payments', icon: DollarSign },
  { href: '/owners', label: 'Owners', icon: UserCircle },
  { href: '/properties', label: 'Properties', icon: Building },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/linens', label: 'Linens & Supplies', icon: Package },
  { href: '/invoices', label: 'Invoicing', icon: FileText },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/reports', label: 'Reports', icon: TrendingUp },
]

interface NavItemProps {
  href: string
  label: string
  icon: typeof LayoutDashboard
  active?: boolean
  badge?: number
}

function NavItem({ href, label, icon: Icon, active, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      )}
    >
      <Icon size={20} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-gray-900 text-white flex flex-col w-64 min-h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="font-bold text-lg">Cleaning Right Now</h1>
        <p className="text-xs text-gray-400">Management System</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            }
          />
        ))}
      </nav>

      {/* Worker Portal & Settings */}
      <div className="border-t border-gray-800">
        <Link
          href="/worker"
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
            pathname.startsWith('/worker')
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          )}
        >
          <HardHat size={20} />
          <span>Worker Portal</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
            pathname === '/settings'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          )}
        >
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Admin</div>
            <div className="text-xs text-gray-500">Owner</div>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
