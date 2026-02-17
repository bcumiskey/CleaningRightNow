'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, RefreshCw, Settings, Plus } from 'lucide-react'
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
  property: { name: string; color: string | null }
  assignments: { teamMember: { id: string; name: string } }[]
}

interface HoverPreview {
  day: Date
  jobs: Job[]
  x: number
  y: number
  showAbove?: boolean
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle date click - go to jobs page with date pre-selected
  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd')
    router.push(`/jobs?newJob=true&date=${formattedDate}`)
  }

  // Handle hover with 2 second delay
  const handleDayHover = useCallback((e: React.MouseEvent, day: Date, dayJobs: Job[]) => {
    if (dayJobs.length === 0) return

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()

    hoverTimeoutRef.current = setTimeout(() => {
      // Flip tooltip above the cell when near the bottom of the viewport
      const spaceBelow = window.innerHeight - rect.bottom
      const tooltipEstimatedHeight = Math.min(dayJobs.length * 70 + 50, 300)
      const showAbove = spaceBelow < tooltipEstimatedHeight

      setHoverPreview({
        day,
        jobs: dayJobs,
        x: rect.left + rect.width / 2,
        y: showAbove ? rect.top - 8 : rect.bottom + 8,
        showAbove,
      })
    }, 2000) // 2 second delay
  }, [])

  const handleDayLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setHoverPreview(null)
  }, [])

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

  // Get color styles for a job based on property color and completion status
  const getJobColorStyle = (job: Job) => {
    if (job.property.color) {
      // Use property color with opacity for completed jobs
      const baseColor = job.property.color
      if (job.completed) {
        return {
          backgroundColor: `${baseColor}30`,
          color: baseColor,
          borderLeft: `3px solid ${baseColor}`,
        }
      }
      return {
        backgroundColor: `${baseColor}20`,
        color: baseColor,
        borderLeft: `3px solid ${baseColor}`,
      }
    }
    // Default colors if no property color set
    return undefined
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Calendar" />

      <div className="p-6">
        {/* Header with Sync Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            Click any date to add a job. Jobs from calendars, recurring schedules, or added manually.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => router.push('/jobs?newJob=true')}
            >
              <Plus size={16} />
              Add Job
            </Button>
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
                    onClick={() => handleDateClick(day)}
                    onMouseEnter={(e) => handleDayHover(e, day, dayJobs)}
                    onMouseLeave={handleDayLeave}
                    className={cn(
                      'bg-white p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors',
                      isToday && 'bg-blue-50 hover:bg-blue-100'
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
                      {dayJobs.slice(0, 3).map((job) => {
                        const colorStyle = getJobColorStyle(job)
                        return (
                          <div
                            key={job.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/jobs?highlight=${job.id}`)
                            }}
                            className={cn(
                              'text-xs p-1 rounded truncate cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all',
                              !colorStyle && (job.completed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700')
                            )}
                            style={colorStyle}
                          >
                            {job.completed && <span className="opacity-60">✓ </span>}
                            {job.time && <span className="font-medium">{job.time} </span>}
                            {job.property.name}
                            {job.assignments?.length > 0 && (
                              <div className="text-[10px] opacity-75 truncate">
                                {job.assignments.map(a => a.teamMember.name.split(' ')[0]).join(', ')}
                              </div>
                            )}
                          </div>
                        )
                      })}
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

        {/* Hover Preview Tooltip */}
        {hoverPreview && (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px] max-w-[300px] max-h-[280px] overflow-y-auto"
            style={{
              left: `${hoverPreview.x}px`,
              ...(hoverPreview.showAbove
                ? { bottom: `${window.innerHeight - hoverPreview.y}px` }
                : { top: `${hoverPreview.y}px` }),
              transform: 'translateX(-50%)',
            }}
            onMouseEnter={() => {
              // Keep preview open when hovering over it
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current)
              }
            }}
            onMouseLeave={handleDayLeave}
          >
            <div className="text-sm font-semibold text-gray-900 mb-2 border-b pb-2">
              {format(hoverPreview.day, 'EEEE, MMMM d')}
            </div>
            <div className="space-y-2">
              {hoverPreview.jobs.map((job) => {
                const colorStyle = getJobColorStyle(job)
                return (
                  <div
                    key={job.id}
                    className={cn(
                      'p-2 rounded text-sm cursor-pointer hover:ring-2 hover:ring-blue-400',
                      !colorStyle && (job.completed
                        ? 'bg-green-50 text-green-700'
                        : 'bg-blue-50 text-blue-700')
                    )}
                    style={colorStyle}
                    onClick={() => router.push(`/jobs?highlight=${job.id}`)}
                  >
                    <div className="font-medium">
                      {job.completed && <span className="opacity-60">✓ </span>}
                      {job.property.name}
                    </div>
                    {job.time && (
                      <div className="text-xs opacity-75">{job.time}</div>
                    )}
                    {job.assignments?.length > 0 && (
                      <div className="text-xs opacity-75">
                        Team: {job.assignments.map(a => a.teamMember.name.split(' ')[0]).join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
