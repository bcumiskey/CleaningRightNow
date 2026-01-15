'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { CalendarDays, ChevronRight, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

interface DashboardStats {
  todayTotal: number
  todayCompleted: number
  weekTotal: number
  nextJob: {
    id: string
    propertyName: string
    time: string | null
  } | null
}

export default function WorkerHomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const weekEnd = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

      const response = await fetch(`/api/worker/jobs?startDate=${today}&endDate=${weekEnd}`)
      if (response.ok) {
        const jobs = await response.json()

        const todayJobs = jobs.filter((j: { date: string }) => j.date.startsWith(today))
        const todayCompleted = todayJobs.filter((j: { completed: boolean }) => j.completed).length
        const nextIncomplete = todayJobs.find((j: { completed: boolean }) => !j.completed)

        setStats({
          todayTotal: todayJobs.length,
          todayCompleted,
          weekTotal: jobs.length,
          nextJob: nextIncomplete ? {
            id: nextIncomplete.id,
            propertyName: nextIncomplete.property.name,
            time: nextIncomplete.time,
          } : null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const today = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="p-4 space-y-6">
      {/* Date Header */}
      <div className="text-center pt-2">
        <p className="text-gray-500 text-sm">{today}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Today's Progress */}
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="py-6">
              <div className="text-center">
                <div className="text-emerald-100 text-sm font-medium mb-1">Today&apos;s Progress</div>
                <div className="text-5xl font-bold mb-2">
                  {stats?.todayCompleted || 0} / {stats?.todayTotal || 0}
                </div>
                <div className="text-emerald-100">
                  {stats?.todayTotal === 0
                    ? 'No jobs scheduled today'
                    : stats?.todayCompleted === stats?.todayTotal
                      ? 'All done for today!'
                      : `${(stats?.todayTotal || 0) - (stats?.todayCompleted || 0)} remaining`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Job Card */}
          {stats?.nextJob && (
            <Link href={`/worker/job/${stats.nextJob.id}`}>
              <Card className="border-2 border-emerald-200 hover:border-emerald-400 transition-colors">
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Sparkles className="text-emerald-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-emerald-600 font-medium">Next Up</div>
                    <div className="font-semibold text-gray-900">{stats.nextJob.propertyName}</div>
                    {stats.nextJob.time && (
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {stats.nextJob.time}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="text-emerald-400" size={24} />
                </CardContent>
              </Card>
            </Link>
          )}

          {/* All Done Message */}
          {stats?.todayTotal > 0 && stats?.todayCompleted === stats?.todayTotal && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="text-center py-6">
                <CheckCircle2 className="mx-auto text-green-500 mb-2" size={40} />
                <div className="font-semibold text-green-800">Great work today!</div>
                <div className="text-sm text-green-600">All jobs completed</div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="text-center py-4">
                <div className="text-3xl font-bold text-gray-900">{stats?.todayTotal || 0}</div>
                <div className="text-sm text-gray-500">Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-4">
                <div className="text-3xl font-bold text-gray-900">{stats?.weekTotal || 0}</div>
                <div className="text-sm text-gray-500">This Week</div>
              </CardContent>
            </Card>
          </div>

          {/* View Full Schedule Link */}
          <Link href="/worker/schedule">
            <Card className="hover:bg-gray-50 transition-colors">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-gray-400" size={20} />
                  <span className="font-medium text-gray-700">View Full Schedule</span>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </CardContent>
            </Card>
          </Link>
        </>
      )}
    </div>
  )
}
