'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, RefreshCw, Settings } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Job {
  id: string
  date: string
  time: string | null
  completed: boolean
  source: string
  property: { name: string }
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchJobs()
  }, [currentMonth])

  const fetchJobs = async () => {
    try {
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()
      const response = await fetch(`/api/jobs?month=${month}&year=${year}`)
      if (response.ok) {
        setJobs(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncCalendars = async () => {
    setIsSyncing(true)
    try {
      // Sync iCal calendars and generate recurring jobs in parallel
      const [calendarRes, recurringRes] = await Promise.all([
        fetch('/api/calendar-sources/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
        fetch('/api/recurring-schedules/generate', {
          method: 'PUT',
        }),
      ])

      const messages: string[] = []

      if (calendarRes.ok) {
        const calendarData = await calendarRes.json()
        const calendarCreated = calendarData.summary?.jobsCreated || 0
        const unmatched = calendarData.summary?.unmatchedEvents || 0
        if (calendarCreated > 0) {
          messages.push(`${calendarCreated} from calendars`)
        }
        if (unmatched > 0) {
          toast.error(`${unmatched} calendar events couldn't be matched to properties`)
        }
      }

      if (recurringRes.ok) {
        const recurringData = await recurringRes.json()
        const recurringCreated = recurringData.totalJobsCreated || 0
        if (recurringCreated > 0) {
          messages.push(`${recurringCreated} from recurring schedules`)
        }
      }

      if (messages.length > 0) {
        toast.success(`Created: ${messages.join(', ')}`)
        fetchJobs()
      } else {
        toast.success('Calendars are up to date')
      }
    } catch (error) {
      toast.error('Failed to sync calendars')
    } finally {
      setIsSyncing(false)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start of month to align with day of week
  const startDay = monthStart.getDay()
  const paddedDays = [...Array(startDay).fill(null), ...days]

  const getJobsForDay = (date: Date) => {
    return jobs.filter((job) => isSameDay(new Date(job.date), date))
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Calendar" />

      <div className="p-6">
        {/* Header with Sync Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            Jobs from calendars, recurring schedules, or added manually
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/calendar')}
            >
              <Settings size={16} />
              Calendar Sources
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncCalendars}
              isLoading={isSyncing}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              Sync Calendars
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {paddedDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="bg-white p-2 min-h-[100px]" />
                }

                const dayJobs = getJobsForDay(day)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'bg-white p-2 min-h-[100px]',
                      isToday && 'bg-blue-50'
                    )}
                  >
                    <div
                      className={cn(
                        'text-sm font-medium mb-1',
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayJobs.slice(0, 3).map((job) => (
                        <div
                          key={job.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/jobs?highlight=${job.id}`)
                          }}
                          className={cn(
                            'text-xs p-1 rounded truncate cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all',
                            job.completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {job.time && <span className="font-medium">{job.time} </span>}
                          {job.property.name}
                        </div>
                      ))}
                      {dayJobs.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayJobs.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
