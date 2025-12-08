import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={cn('bg-gray-50', className)}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn('divide-y divide-gray-100', className)}>{children}</tbody>
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn('hover:bg-gray-50 transition-colors', className)}>
      {children}
    </tr>
  )
}

interface TableHeadProps extends TableProps {
  align?: 'left' | 'center' | 'right'
}

export function TableHead({ children, className, align = 'left' }: TableHeadProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider',
        alignClasses[align],
        className
      )}
    >
      {children}
    </th>
  )
}

interface TableCellProps extends TableProps {
  align?: 'left' | 'center' | 'right'
}

export function TableCell({ children, className, align = 'left' }: TableCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <td className={cn('px-4 py-3 text-sm text-gray-700', alignClasses[align], className)}>
      {children}
    </td>
  )
}
