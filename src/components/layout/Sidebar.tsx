'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Calendar,
  Home,
  Briefcase,
  Users,
  Package,
  Shirt,
  WashingMachine,
  FileText,
  BarChart3,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Properties', href: '/properties', icon: Home },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Team', href: '/team', icon: Users },
  {
    name: 'Inventory',
    icon: Package,
    children: [
      { name: 'Supplies', href: '/supplies', icon: Package },
      { name: 'Linens', href: '/linens', icon: Shirt },
    ],
  },
  { name: 'Laundry', href: '/laundry', icon: WashingMachine },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Audit Log', href: '/audit-log', icon: History },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Inventory'])

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    )
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const NavItem = ({
    item,
    mobile = false,
  }: {
    item: (typeof navigation)[0]
    mobile?: boolean
  }) => {
    const hasChildren = 'children' in item && item.children
    const isExpanded = expandedItems.includes(item.name)
    const Icon = item.icon

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left">{item.name}</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => {
                const ChildIcon = child.icon
                const active = isActive(child.href)
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => mobile && setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                    )}
                  >
                    <ChildIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{child.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    const active = isActive(item.href!)
    return (
      <Link
        href={item.href!}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.name}</span>
      </Link>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-100">
        <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
          <Sparkles className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Cleaning Right Now</h1>
          <p className="text-xs text-gray-500">Business Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} mobile={mobile} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <Link
          href="/settings"
          onClick={() => mobile && setIsMobileMenuOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/settings')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
          )}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md"
      >
        <Menu className="w-6 h-6 text-gray-600" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-200 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
        <SidebarContent mobile />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <SidebarContent />
      </aside>
    </>
  )
}
