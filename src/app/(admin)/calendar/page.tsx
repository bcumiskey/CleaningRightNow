'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, RefreshCw, Settings, Plus, Calendar as CalendarIcon, List, Grid3X3, Repeat } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import B2BBadge from '@/components/ui/B2BBadge'
import { cn, getPropertyHexColor } from '@/lib/utils'
import toast from 'react-hot-toast'

type ViewMode = 'day' | 'week' | 'month'

interface Job {
  id: string
  date: string
  time: string | null
  completed: boolean
  source: string
  isBackToBack?: boolean
  property: { name: string; color: string | null }
}

interface HoverPreview {
  day: Date
  jobs: Job[]
  x: number
  y: number
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
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
      setHoverPreview({
        day,
        jobs: dayJobs,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
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
  }, [currentDate])

  const fetchJobs = async () => {
    try {
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
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

  // Navigation handlers for different view modes
  const navigatePrev = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1))
        break
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(subMonths(currentDate, 1))
        break
    }
  }

  const navigateNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1))
        break
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(addMonths(currentDate, 1))
        break
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get title based on view mode
  const getViewTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
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

  // Get days to display based on view mode
  const getDaysToDisplay = () => {
    switch (viewMode) {
      case 'day':
        return [currentDate]
      case 'week':
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        return eachDayOfInterval({ start: weekStart, end: weekEnd })
      case 'month':
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
        // Pad start of month to align with day of week
        const startDay = monthStart.getDay()
        return [...Array(startDay).fill(null), ...days]
    }
  }

  const displayDays = getDaysToDisplay()

  const getJobsForDay = (date: Date) => {
    // Format the target date as YYYY-MM-DD for comparison
    const targetDateStr = format(date, 'yyyy-MM-dd')
    return jobs.filter((job) => {
      // Extract just the date portion from the job's ISO string (first 10 chars)
      // This avoids timezone conversion issues completely
      const jobDateStr = job.date.substring(0, 10)
      return jobDateStr === targetDateStr
    })
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
        {/* Header with View Mode Selector and Sync Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          {/* View Mode Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                viewMode === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <List size={16} />
              <span className="hidden sm:inline">Day</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <CalendarIcon size={16} />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                viewMode === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Grid3X3 size={16} />
              <span className="hidden sm:inline">Month</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => router.push('/jobs?newJob=true')}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Job</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/calendar')}
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Calendar Sources</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncCalendars}
              isLoading={isSyncing}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Sync</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={navigatePrev}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {getViewTitle()}
                </h2>
                <button
                  onClick={goToToday}
                  className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded"
                >
                  Today
                </button>
              </div>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day View */}
            {viewMode === 'day' && (
              <div className="space-y-2">
                {(() => {
                  const dayJobs = getJobsForDay(currentDate)
                  if (dayJobs.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <CalendarIcon className="mx-auto mb-2 text-gray-400" size={32} />
                        <p>No jobs scheduled for this day</p>
                        <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => handleDateClick(currentDate)}
                        >
                          <Plus size={16} />
                          Add Job
                        </Button>
                      </div>
                    )
                  }
                  return dayJobs.map((job) => {
                    const colorStyle = getJobColorStyle(job)
                    return (
                      <div
                        key={job.id}
                        onClick={() => router.push(`/jobs?highlight=${job.id}`)}
                        className={cn(
                          'p-4 rounded-lg cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all',
                          !colorStyle && (job.completed
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-blue-50 border border-blue-200')
                        )}
                        style={colorStyle ? {
                          ...colorStyle,
                          padding: '1rem',
                          borderRadius: '0.5rem',
                        } : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {job.completed && <span className="opacity-60">✓ </span>}
                                {job.property.name}
                              </h3>
                              {job.isBackToBack && <B2BBadge size="sm" />}
                            </div>
                            {job.time && (
                              <p className="text-sm text-gray-600">{job.time}</p>
                            )}
                          </div>
                          <span className={cn(
                            'px-2 py-1 text-xs rounded-full',
                            job.completed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          )}>
                            {job.completed ? 'Complete' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* Week View */}
            {viewMode === 'week' && (
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="bg-gray-50 p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-500"
                  >
                    {day}
                  </div>
                ))}

                {/* Week Days */}
                {displayDays.map((day, index) => {
                  if (!day) return null
                  const dayJobs = getJobsForDay(day)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        'bg-white p-2 min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors',
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
                        {dayJobs.slice(0, 4).map((job) => {
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
                              {job.property.name}
                            </div>
                          )
                        })}
                        {dayJobs.length > 4 && (
                          <div className="text-xs text-gray-500">
                            +{dayJobs.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Month View */}
            {viewMode === 'month' && (
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="bg-gray-50 p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-500"
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}

                {/* Calendar Days */}
                {displayDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="bg-white p-1 sm:p-2 min-h-[60px] sm:min-h-[100px]" />
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
                        'bg-white p-1 sm:p-2 min-h-[60px] sm:min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors',
                        isToday && 'bg-blue-50 hover:bg-blue-100'
                      )}
                    >
                      <div
                        className={cn(
                          'text-xs sm:text-sm font-medium mb-1',
                          isToday ? 'text-blue-600' : 'text-gray-900'
                        )}
                      >
                        {format(day, 'd')}
                      </div>
                      {/* Mobile: Just show count */}
                      <div className="sm:hidden">
                        {dayJobs.length > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {dayJobs.slice(0, 3).map((job) => (
                              <div
                                key={job.id}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: job.property.color || getPropertyHexColor(job.id) }}
                              />
                            ))}
                            {dayJobs.length > 3 && (
                              <span className="text-[10px] text-gray-500">+{dayJobs.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Desktop: Show job details */}
                      <div className="hidden sm:block space-y-1">
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
            )}
          </CardContent>
        </Card>

        {/* Hover Preview Tooltip */}
        {hoverPreview && (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px] max-w-[300px]"
            style={{
              left: `${hoverPreview.x}px`,
              top: `${hoverPreview.y}px`,
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
