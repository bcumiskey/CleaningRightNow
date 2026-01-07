'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  Users,
  ChevronRight,
  Loader2,
  CalendarDays,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns'

interface Job {
  id: string
  date: string
  time?: string
  completed: boolean
  property: {
    id: string
    name: string
    address: string
  }
  assignments: Array<{
    teamMember: {
      id: string
      name: string
    }
  }>
}

interface GroupedJobs {
  date: string
  label: string
  jobs: Job[]
}

export default function WorkerSchedulePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingJobs()
  }, [])

  const fetchUpcomingJobs = async () => {
    try {
      const startDate = startOfDay(new Date())
      const endDate = addDays(startDate, 14) // Next 2 weeks

      const response = await fetch(
        `/api/worker/jobs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
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
  }

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEEE, MMMM d')
  }

  const groupedJobs: GroupedJobs[] = jobs.reduce((acc, job) => {
    const dateKey = format(new Date(job.date), 'yyyy-MM-dd')
    const existing = acc.find(g => g.date === dateKey)

    if (existing) {
      existing.jobs.push(job)
    } else {
      acc.push({
        date: dateKey,
        label: getDateLabel(job.date),
        jobs: [job],
      })
    }

    return acc
  }, [] as GroupedJobs[])

  // Sort by date
  groupedJobs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500 text-sm">Next 2 weeks</p>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : groupedJobs.length > 0 ? (
        <div className="space-y-6">
          {groupedJobs.map((group) => (
            <div key={group.date}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/worker/job/${job.id}`}
                    className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {job.property.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {job.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatTime(job.time)}</span>
                          </div>
                        )}
                        {job.assignments.length > 1 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{job.assignments.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">No upcoming jobs</h3>
          <p className="text-gray-500 text-sm">Check back later for new assignments</p>
        </div>
      )}
    </div>
  )
}
