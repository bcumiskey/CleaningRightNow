'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatTime, getDaysInMonth, isSameDay, isToday } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface Job {
  id: string
  scheduledDate: string
  scheduledTime?: string
  status: string
  totalAmount: number
  property: {
    id: string
    name: string
  }
  teamAssignments: Array<{
    teamMember: { name: string }
  }>
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'month' | 'week'>('month')

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    try {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      const response = await fetch(
        `/api/jobs?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getJobsForDay = (date: Date) => {
    return jobs.filter((job) => isSameDay(new Date(job.scheduledDate), date))
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-500',
      IN_PROGRESS: 'bg-yellow-500',
      COMPLETED: 'bg-green-500',
      CANCELLED: 'bg-gray-400',
    }
    return colors[status] || 'bg-gray-400'
  }

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  return (
    <DashboardLayout>
      <Header title="Calendar" />

      <div className="page-container">
        {/* Calendar Header */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setView('month')}
                    className={`px-3 py-1.5 text-sm ${
                      view === 'month'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setView('week')}
                    className={`px-3 py-1.5 text-sm ${
                      view === 'week'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Week
                  </button>
                </div>
                <Link href="/jobs?action=new">
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                    New Job
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Week Days Header */}
                <div className="grid grid-cols-7 border-b">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="px-2 py-3 text-center text-sm font-semibold text-gray-600 bg-gray-50"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {days.map((date, index) => {
                    const dayJobs = getJobsForDay(date)
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                    const today = isToday(date)

                    return (
                      <div
                        key={index}
                        className={`min-h-[120px] border-b border-r p-2 ${
                          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <div
                          className={`text-sm font-medium mb-1 ${
                            today
                              ? 'w-7 h-7 flex items-center justify-center bg-indigo-600 text-white rounded-full'
                              : isCurrentMonth
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayJobs.slice(0, 3).map((job) => (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              className={`block text-xs p-1 rounded truncate text-white ${getStatusColor(
                                job.status
                              )} hover:opacity-90`}
                            >
                              {job.scheduledTime && (
                                <span className="font-medium">
                                  {formatTime(job.scheduledTime)}{' '}
                                </span>
                              )}
                              {job.property.name}
                            </Link>
                          ))}
                          {dayJobs.length > 3 && (
                            <p className="text-xs text-gray-500 pl-1">
                              +{dayJobs.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span className="text-gray-600">Cancelled</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
