'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Users,
  Home,
  Loader2,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, startOfMonth, subMonths } from 'date-fns'

interface ReportData {
  revenue: { name: string; value: number }[]
  expenses: { name: string; value: number }[]
  jobsByStatus: { name: string; value: number }[]
  teamEarnings: { name: string; value: number }[]
  propertyActivity: { name: string; jobs: number; revenue: number }[]
  summary: {
    totalRevenue: number
    totalExpenses: number
    profit: number
    completedJobs: number
    avgJobValue: number
    topProperty: string
    topTeamMember: string
  }
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const PERIODS = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'last6Months', label: 'Last 6 Months' },
  { value: 'thisYear', label: 'This Year' },
]

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('thisMonth')

  const fetchReportData = useCallback(async () => {
    setIsLoading(true)
    try {
      let startDate: Date
      const endDate = new Date()

      switch (period) {
        case 'lastMonth':
          startDate = startOfMonth(subMonths(new Date(), 1))
          break
        case 'last3Months':
          startDate = startOfMonth(subMonths(new Date(), 3))
          break
        case 'last6Months':
          startDate = startOfMonth(subMonths(new Date(), 6))
          break
        case 'thisYear':
          startDate = new Date(new Date().getFullYear(), 0, 1)
          break
        default:
          startDate = startOfMonth(new Date())
      }

      const response = await fetch(
        `/api/reports?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (response.ok) {
        const reportData = await response.json()
        setData(reportData)
      } else {
        // Use mock data for demo
        setData(getMockData())
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error)
      setData(getMockData())
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const getMockData = (): ReportData => ({
    revenue: [
      { name: 'Week 1', value: 1200 },
      { name: 'Week 2', value: 1800 },
      { name: 'Week 3', value: 1500 },
      { name: 'Week 4', value: 2100 },
    ],
    expenses: [
      { name: 'Supplies', value: 150 },
      { name: 'Laundry', value: 200 },
      { name: 'Team Payments', value: 4500 },
      { name: 'Other', value: 100 },
    ],
    jobsByStatus: [
      { name: 'Completed', value: 45 },
      { name: 'Scheduled', value: 12 },
      { name: 'Cancelled', value: 3 },
    ],
    teamEarnings: [
      { name: 'John', value: 1500 },
      { name: 'Sarah', value: 1800 },
      { name: 'Mike', value: 1200 },
    ],
    propertyActivity: [
      { name: 'Beach House', jobs: 8, revenue: 1200 },
      { name: 'Downtown Condo', jobs: 12, revenue: 1800 },
      { name: 'Lake Villa', jobs: 6, revenue: 900 },
      { name: 'Mountain Retreat', jobs: 4, revenue: 700 },
    ],
    summary: {
      totalRevenue: 6600,
      totalExpenses: 4950,
      profit: 1650,
      completedJobs: 45,
      avgJobValue: 146.67,
      topProperty: 'Downtown Condo',
      topTeamMember: 'Sarah',
    },
  })

  const exportCSV = () => {
    if (!data) return

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', data.summary.totalRevenue.toString()],
      ['Total Expenses', data.summary.totalExpenses.toString()],
      ['Profit', data.summary.profit.toString()],
      ['Completed Jobs', data.summary.completedJobs.toString()],
      ['Average Job Value', data.summary.avgJobValue.toString()],
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <Header title="Reports" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Header title="Reports" />

      <div className="page-container">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={PERIODS}
            className="w-full sm:w-48"
          />
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Revenue</p>
                      <p className="text-xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Expenses</p>
                      <p className="text-xl font-bold">{formatCurrency(data.summary.totalExpenses)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Profit</p>
                      <p className="text-xl font-bold">{formatCurrency(data.summary.profit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completed Jobs</p>
                      <p className="text-xl font-bold">{data.summary.completedJobs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.revenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.expenses}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.expenses.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Property Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.propertyActivity} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={100} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="jobs" fill="#4F46E5" name="Jobs" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Team Earnings */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.teamEarnings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg Job Value</p>
                      <p className="text-xl font-bold">{formatCurrency(data.summary.avgJobValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Home className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Top Property</p>
                      <p className="text-lg font-bold truncate">{data.summary.topProperty}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Top Team Member</p>
                      <p className="text-lg font-bold">{data.summary.topTeamMember}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
