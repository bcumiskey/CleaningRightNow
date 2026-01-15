'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { Building, ChevronRight, Calendar, List, ChevronLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'

interface ScheduledJob {
  id: string
  date: string
  time: string | null
  property: { id: string; name: string; address: string }
  completed: boolean
}

type ViewMode = 'list' | 'calendar'

export default function WorkerSchedulePage() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      // Fetch 60 days to cover calendar view needs
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const endDate = format(addDays(endOfMonth(addDays(new Date(), 60)), 7), 'yyyy-MM-dd')
      const response = await fetch(`/api/worker/jobs?startDate=${startDate}&endDate=${endDate}`)
      if (response.ok) {
        setJobs(await response.json())
      } else {
        toast.error('Failed to load schedule')
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
      toast.error('Failed to load schedule')
    } finally {
      setIsLoading(false)
    }
  }

  // Group jobs by date
  const jobsByDate = jobs.reduce((acc, job) => {
    const dateKey = format(new Date(job.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(job)
    return acc
  }, {} as Record<string, ScheduledJob[]>)

  // Filter jobs for list view (next 14 days only)
  const today = new Date()
  const twoWeeksFromNow = addDays(today, 14)
  const listViewJobs = jobs.filter(job => {
    const jobDate = new Date(job.date)
    return jobDate >= today && jobDate <= twoWeeksFromNow
  })

  const listJobsByDate = listViewJobs.reduce((acc, job) => {
    const dateKey = format(new Date(job.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(job)
    return acc
  }, {} as Record<string, ScheduledJob[]>)

  const sortedDates = Object.keys(listJobsByDate).sort()

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const goToPrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const goToNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  const goToToday = () => setCurrentMonth(new Date())

  const getJobsForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    return jobsByDate[dateKey] || []
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {viewMode === 'list' ? 'Upcoming 2 Weeks' : format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List size={16} />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">Calendar</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : viewMode === 'list' ? (
        // LIST VIEW
        listViewJobs.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Calendar}
                title="No upcoming jobs"
                description="No jobs scheduled for the next two weeks."
              />
            </CardContent>
          </Card>
        ) : (
          sortedDates.map((dateKey) => (
            <Card key={dateKey}>
              <CardHeader className="pb-2">
                <div className="font-semibold text-gray-900">
                  {format(new Date(dateKey), 'EEEE, MMMM d')}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {listJobsByDate[dateKey].map((job) => (
                  <Link key={job.id} href={`/worker/job/${job.id}`}>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Building className="text-emerald-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{job.property.name}</div>
                        {job.time && <div className="text-sm text-gray-500">{job.time}</div>}
                      </div>
                      {job.completed ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Done
                        </span>
                      ) : (
                        <ChevronRight className="text-gray-400" size={20} />
                      )}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))
        )
      ) : (
        // CALENDAR VIEW
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayJobs = getJobsForDay(day)
                const isToday = isSameDay(day, new Date())
                const isCurrentMonth = isSameMonth(day, currentMonth)

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[70px] p-1 rounded-lg border ${
                      isToday
                        ? 'border-blue-500 bg-blue-50'
                        : isCurrentMonth
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      isToday
                        ? 'text-blue-600'
                        : isCurrentMonth
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayJobs.slice(0, 2).map(job => (
                        <Link key={job.id} href={`/worker/job/${job.id}`}>
                          <div className={`text-xs px-1 py-0.5 rounded truncate ${
                            job.completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}>
                            {job.property.name}
                          </div>
                        </Link>
                      ))}
                      {dayJobs.length > 2 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{dayJobs.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
