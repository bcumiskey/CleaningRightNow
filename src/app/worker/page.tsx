'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Building, ChevronRight, AlertCircle, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface TodayJob {
  id: string
  time: string | null
  completed: boolean
  property: { id: string; name: string; address: string }
  _activeNotes: number
}

export default function WorkerTodayPage() {
  const [jobs, setJobs] = useState<TodayJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTodayJobs()
  }, [])

  const fetchTodayJobs = async () => {
    try {
      const response = await fetch('/api/worker/jobs/today')
      if (response.ok) {
        setJobs(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const today = format(new Date(), 'EEEE, MMMM d')
  const completedCount = jobs.filter((j) => j.completed).length

  return (
    <div className="p-4 space-y-4">
      {/* Today Summary */}
      <Card>
        <CardContent>
          <div className="text-sm text-gray-500">{today}</div>
          <div className="text-3xl font-bold mt-1">{jobs.length} Jobs</div>
          {jobs.length > 0 && (
            <div className="text-sm text-gray-500 mt-1">
              {completedCount} completed, {jobs.length - completedCount} remaining
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Calendar}
              title="No jobs today"
              description="Check the schedule for upcoming jobs."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/worker/job/${job.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center',
                      job._activeNotes > 0 ? 'bg-amber-100' : 'bg-emerald-100'
                    )}
                  >
                    <Building
                      className={job._activeNotes > 0 ? 'text-amber-600' : 'text-emerald-600'}
                      size={24}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900">{job.property.name}</div>
                    <div className="text-gray-500">{job.time || 'No time set'}</div>
                    {job._activeNotes > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <AlertCircle size={12} />
                        {job._activeNotes} active note{job._activeNotes !== 1 && 's'}
                      </div>
                    )}
                  </div>
                  {job.completed ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Done
                    </span>
                  ) : (
                    <ChevronRight className="text-gray-400" size={24} />
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
