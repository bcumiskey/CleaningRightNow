'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, addDays } from 'date-fns'
import { Building, ChevronRight, Calendar } from 'lucide-react'
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

  // Group jobs by date
  const jobsByDate = jobs.reduce((acc, job) => {
    const dateKey = format(new Date(job.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(job)
    return acc
  }, {} as Record<string, ScheduledJob[]>)

  const sortedDates = Object.keys(jobsByDate).sort()

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Upcoming 2 Weeks</h2>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : jobs.length === 0 ? (
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
              {jobsByDate[dateKey].map((job) => (
                <Link key={job.id} href={`/worker/job/${job.id}`}>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Building className="text-emerald-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{job.property.name}</div>
                      <div className="text-sm text-gray-500">{job.time || 'No time set'}</div>
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
      )}
    </div>
  )
}
