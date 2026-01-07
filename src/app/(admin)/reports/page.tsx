'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, DollarSign, Calendar, Users } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

interface ReportData {
  totalRevenue: number
  totalJobs: number
  avgJobValue: number
  teamPayments: number
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>({
    totalRevenue: 0,
    totalJobs: 0,
    avgJobValue: 0,
    teamPayments: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      const response = await fetch('/api/reports')
      if (response.ok) {
        setData(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Reports" />

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Jobs</p>
                    <p className="text-2xl font-bold">{data.totalJobs}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Job Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.avgJobValue)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Users className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Team Payments</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.teamPayments)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-12">
                  Detailed reports and charts will appear here once you have job data.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
