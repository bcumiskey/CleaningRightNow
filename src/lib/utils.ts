import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${minutes} ${ampm}`
}

export function calculateJobPayment(
  totalAmount: number,
  expensePercent: number,
  teamMemberCount: number
) {
  const expenseAmount = totalAmount * (expensePercent / 100)
  const remainder = totalAmount - expenseAmount
  const perPersonPayout = teamMemberCount > 0 ? remainder / teamMemberCount : 0

  return {
    expenseAmount: Math.round(expenseAmount * 100) / 100,
    remainder: Math.round(remainder * 100) / 100,
    perPersonPayout: Math.round(perPersonPayout * 100) / 100,
    teamPayoutTotal: Math.round(perPersonPayout * teamMemberCount * 100) / 100
  }
}

export function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INV-${year}${month}-${random}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    GOOD: 'bg-green-100 text-green-800',
    FAIR: 'bg-yellow-100 text-yellow-800',
    DAMAGED: 'bg-orange-100 text-orange-800',
    NEEDS_REPLACEMENT: 'bg-red-100 text-red-800',
    DROPPED_OFF: 'bg-blue-100 text-blue-800',
    READY_FOR_PICKUP: 'bg-yellow-100 text-yellow-800',
    PICKED_UP: 'bg-green-100 text-green-800',
    DELIVERED: 'bg-green-100 text-green-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    UNPAID: 'bg-red-100 text-red-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const dates: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Add days from previous month to fill the first week
  const startDayOfWeek = firstDay.getDay()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    dates.push(date)
  }

  // Add all days of the current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push(new Date(year, month, i))
  }

  // Add days from next month to fill the last week
  const endDayOfWeek = lastDay.getDay()
  for (let i = 1; i < 7 - endDayOfWeek; i++) {
    dates.push(new Date(year, month + 1, i))
  }

  return dates
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}
