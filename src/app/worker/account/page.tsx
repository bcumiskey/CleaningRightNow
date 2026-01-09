'use client'

import { useEffect, useState, useCallback } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, User, DollarSign, Calendar, ChevronRight, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import toast from 'react-hot-toast'

interface Earning {
  id: string
  date: string
  propertyName: string
  jobRate: number
  workerShare: number
  status: 'paid' | 'pending'
}

interface EarningsSummary {
  totalJobs: number
  totalGrossEarnings: number
  totalPaid: number
  totalPending: number
}

export default function WorkerAccountPage() {
  const { data: session } = useSession()
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAllEarnings, setShowAllEarnings] = useState(false)

  const fetchEarnings = useCallback(async () => {
    setIsLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)

      const res = await fetch(
        `/api/worker/earnings?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )

      if (res.ok) {
        const data = await res.json()
        setEarnings(data.earnings)
        setSummary(data.summary)
      } else {
        toast.error('Failed to load earnings')
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error)
      toast.error('Failed to load earnings')
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const user = session?.user as { name?: string; email?: string } | undefined

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Profile Card */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="text-emerald-600" size={32} />
          </div>
          <div>
            <div className="font-semibold text-lg">{user?.name || 'Worker'}</div>
            <div className="text-gray-500 text-sm">{user?.email || 'Team Member'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-600" />
              <h3 className="font-semibold text-gray-900">My Earnings</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight size={20} className="text-gray-400 rotate-180" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 rounded"
                disabled={currentMonth >= new Date()}
              >
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : summary ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-700">Total Earned</p>
                  <p className="text-xl font-bold text-emerald-900">
                    {formatCurrency(summary.totalGrossEarnings)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Jobs Completed</p>
                  <p className="text-xl font-bold text-gray-900">{summary.totalJobs}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Paid</p>
                  <p className="text-lg font-semibold text-green-900">
                    {formatCurrency(summary.totalPaid)}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">Pending</p>
                  <p className="text-lg font-semibold text-yellow-900">
                    {formatCurrency(summary.totalPending)}
                  </p>
                </div>
              </div>

              {/* Earnings List */}
              {earnings.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Recent Jobs
                    </h4>
                    {earnings.length > 3 && (
                      <button
                        onClick={() => setShowAllEarnings(!showAllEarnings)}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        {showAllEarnings ? 'Show Less' : `View All (${earnings.length})`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(showAllEarnings ? earnings : earnings.slice(0, 3)).map((earning) => (
                      <div
                        key={earning.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {earning.propertyName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(earning.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(earning.workerShare)}
                          </p>
                          <span
                            className={`text-xs ${
                              earning.status === 'paid'
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            {earning.status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {earnings.length === 0 && (
                <p className="text-center text-gray-500 py-4 text-sm">
                  No completed jobs this month
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Unable to load earnings</p>
          )}
        </CardContent>
      </Card>

      {/* Pay Statement Link */}
      <Card>
        <CardContent>
          <a
            href={`/worker/pay-statement?month=${format(currentMonth, 'yyyy-MM')}`}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-emerald-600" />
              <span className="font-medium text-gray-900">View Pay Statement</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </a>
        </CardContent>
      </Card>

      {/* Sign Out Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut size={18} />
        Sign Out
      </Button>
    </div>
  )
}
