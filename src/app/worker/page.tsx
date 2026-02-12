'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, addDays, isToday, parseISO } from 'date-fns'
import { Building, ChevronRight, AlertCircle, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { cn, getPropertyHexColor } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ScheduledJob {
  id: string
  date: string
  time: string | null
  completed: boolean
  property: { id: string; name: string; address: string; color?: string }
  _activeNotes?: number
}

export default function WorkerSchedulePage() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const startDate = format(new Date(), 'yyyy-MM-dd')
      const endDate = format(addDays(new Date(), 14), 'yyyy-MM-dd')
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

  // Separate today's jobs from upcoming
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayJobs = jobs.filter(job => job.date.startsWith(todayStr))
  const upcomingJobs = jobs.filter(job => !job.date.startsWith(todayStr))

  // Group upcoming jobs by date
  const jobsByDate = upcomingJobs.reduce((acc, job) => {
    const dateKey = format(parseISO(job.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(job)
    return acc
  }, {} as Record<string, ScheduledJob[]>)

  const sortedDates = Object.keys(jobsByDate).sort()
  const today = format(new Date(), 'EEEE, MMMM d')
  const completedCount = todayJobs.filter((j) => j.completed).length

  const JobCard = ({ job, showDate = false }: { job: ScheduledJob; showDate?: boolean }) => {
    const propertyColor = job.property.color || getPropertyHexColor(job.property.id)
    const hasActiveNotes = job._activeNotes && job._activeNotes > 0

    return (
      <Link href={`/worker/job/${job.id}`}>
        <Card
          className="hover:shadow-md transition-shadow"
          style={{
            borderLeft: `4px solid ${hasActiveNotes ? '#F59E0B' : propertyColor}`,
          }}
        >
          <CardContent className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: hasActiveNotes ? '#FEF3C7' : `${propertyColor}20`,
              }}
            >
              <Building
                size={24}
                style={{ color: hasActiveNotes ? '#D97706' : propertyColor }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{job.property.name}</div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {job.time && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {job.time}
                  </span>
                )}
                {!job.time && <span>No time set</span>}
              </div>
              {hasActiveNotes && (
                <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                  <AlertCircle size={12} />
                  {job._activeNotes} active note{job._activeNotes !== 1 && 's'}
                </div>
              )}
            </div>
            {job.completed ? (
              <span
                className="px-2 py-1 text-xs rounded-full font-medium"
                style={{ backgroundColor: `${propertyColor}30`, color: propertyColor }}
              >
                Done
              </span>
            ) : (
              <ChevronRight className="text-gray-400 flex-shrink-0" size={24} />
            )}
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Today Section */}
      <div>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent>
            <div className="text-sm text-emerald-700 font-medium">Today</div>
            <div className="text-sm text-emerald-600">{today}</div>
            <div className="text-3xl font-bold text-emerald-900 mt-1">
              {todayJobs.length} {todayJobs.length === 1 ? 'Job' : 'Jobs'}
            </div>
            {todayJobs.length > 0 && (
              <div className="text-sm text-emerald-600 mt-1">
                {completedCount} completed, {todayJobs.length - completedCount} remaining
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Jobs */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : todayJobs.length === 0 ? (
          <Card className="mt-3">
            <CardContent className="py-6">
              <div className="text-center text-gray-500">
                <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
                <p>No jobs scheduled for today</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mt-3">
            {todayJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Section */}
      {!isLoading && sortedDates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming</h2>
          <div className="space-y-4">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <div className="text-sm font-medium text-gray-500 mb-2">
                  {format(parseISO(dateKey), 'EEEE, MMMM d')}
                </div>
                <div className="space-y-2">
                  {jobsByDate[dateKey].map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No upcoming jobs message */}
      {!isLoading && todayJobs.length === 0 && sortedDates.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={Calendar}
              title="No scheduled jobs"
              description="No jobs scheduled for the next two weeks."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
