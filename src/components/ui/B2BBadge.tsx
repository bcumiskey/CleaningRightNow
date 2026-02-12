'use client'

import { cn } from '@/lib/utils'
import { Repeat } from 'lucide-react'

interface B2BBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function B2BBadge({ className, size = 'md', showText = true }: B2BBadgeProps) {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  }

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        'bg-amber-100 text-amber-700 border border-amber-200',
        sizeStyles[size],
        className
      )}
      title="Back-to-Back: Checkout and new check-in same day"
    >
      <Repeat size={iconSizes[size]} />
      {showText && <span>B2B</span>}
    </span>
  )
}
