'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  MapPin,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { format } from 'date-fns'

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
  _activeNotes?: number
}

export default function WorkerTodayPage() {
  const { data: session } = useSession()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTodaysJobs()
  }, [])

  const fetchTodaysJobs = async () => {
    try {
      const response = await fetch('/api/worker/jobs/today')
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

  const completedCount = jobs.filter(j => j.completed).length
  const pendingCount = jobs.length - completedCount

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          Today's Jobs
        </h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
        </div>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/worker/job/${job.id}`}
              className={`block bg-white rounded-xl p-4 shadow-sm border transition-all ${
                job.completed
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-gray-100 hover:border-indigo-200 hover:shadow'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {job.property.name}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{job.property.address}</span>
                  </div>
                </div>
                {job.completed && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                {job.time && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(job.time)}</span>
                  </div>
                )}
                {job.assignments.length > 1 && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {job.assignments
                        .filter(a => a.teamMember.id !== session?.user?.id)
                        .map(a => a.teamMember.name.split(' ')[0])
                        .join(', ') || 'Solo'}
                    </span>
                  </div>
                )}
              </div>

              {job._activeNotes && job._activeNotes > 0 && (
                <div className="mt-2 flex items-center gap-1 text-amber-600 text-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{job._activeNotes} active note{job._activeNotes > 1 ? 's' : ''}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">No jobs today</h3>
          <p className="text-gray-500 text-sm">Enjoy your day off!</p>
        </div>
      )}
    </div>
  )
}
