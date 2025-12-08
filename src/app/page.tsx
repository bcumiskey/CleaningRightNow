'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  Briefcase,
  Calendar,
  ArrowRight,
  Plus,
  Home,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  todayJobs: Array<{
    id: string
    scheduledDate: string
    scheduledTime?: string
    status: string
    totalAmount: number
    property: {
      name: string
      address: string
    }
    teamAssignments: Array<{
      teamMember: {
        name: string
      }
    }>
    services: Array<{
      service: {
        name: string
      }
      price: number
    }>
  }>
  upcomingJobs: Array<{
    id: string
    scheduledDate: string
    scheduledTime?: string
    status: string
    property: {
      name: string
    }
    teamAssignments: Array<{
      teamMember: {
        name: string
      }
    }>
  }>
  metrics: {
    totalRevenue: number
    totalExpenses: number
    pendingPayments: number
    owedToTeam: number
    todayJobsCount: number
    upcomingJobsCount: number
    lowStockItemsCount: number
    completedJobsThisMonth: number
  }
  lowStockItems: Array<{
    id: string
    name: string
    quantity: number
    lowStockThreshold: number
    unit: string
  }>
  recentActivity: Array<{
    id: string
    action: string
    entityType: string
    description?: string
    createdAt: string
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'default',
    }
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <DashboardLayout>
      <Header title="Dashboard" />

      <div className="page-container">
        {/* Welcome message for empty state */}
        {!isLoading && data && data.metrics.completedJobsThisMonth === 0 && data.todayJobs.length === 0 && (
          <Card className="mb-6 bg-gradient-to-r from-indigo-500 to-blue-600 border-0">
            <CardContent className="py-8">
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-2">Welcome to Cleaning Right Now!</h2>
                <p className="text-indigo-100 mb-6">
                  Get started by adding your first property, team member, or scheduling a job.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/properties">
                    <Button variant="secondary" size="sm">
                      <Home className="w-4 h-4" />
                      Add Property
                    </Button>
                  </Link>
                  <Link href="/team">
                    <Button variant="secondary" size="sm">
                      <Users className="w-4 h-4" />
                      Add Team Member
                    </Button>
                  </Link>
                  <Link href="/jobs">
                    <Button variant="secondary" size="sm">
                      <Briefcase className="w-4 h-4" />
                      Schedule Job
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid-cols-stats mb-6">
          <StatCard
            title="Revenue This Month"
            value={formatCurrency(data?.metrics.totalRevenue || 0)}
            icon={DollarSign}
            iconColor="text-green-600 bg-green-100"
          />
          <StatCard
            title="Business Expenses"
            value={formatCurrency(data?.metrics.totalExpenses || 0)}
            icon={TrendingUp}
            iconColor="text-blue-600 bg-blue-100"
          />
          <StatCard
            title="Pending Payments"
            value={formatCurrency(data?.metrics.pendingPayments || 0)}
            icon={Clock}
            iconColor="text-yellow-600 bg-yellow-100"
          />
          <StatCard
            title="Owed to Team"
            value={formatCurrency(data?.metrics.owedToTeam || 0)}
            icon={Users}
            iconColor="text-purple-600 bg-purple-100"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Jobs */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Today&apos;s Jobs</CardTitle>
                <Link href="/jobs">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : data?.todayJobs && data.todayJobs.length > 0 ? (
                  <div className="space-y-4">
                    {data.todayJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="block p-4 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 truncate">
                                {job.property.name}
                              </h4>
                              {getStatusBadge(job.status)}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {job.property.address}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              {job.scheduledTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {formatTime(job.scheduledTime)}
                                </span>
                              )}
                              {job.teamAssignments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {job.teamAssignments.map((a) => a.teamMember.name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(job.totalAmount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {job.services.map((s) => s.service.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Briefcase}
                    title="No jobs scheduled for today"
                    description="Schedule a new job or check your calendar for upcoming appointments."
                    action={{
                      label: 'Schedule Job',
                      onClick: () => router.push('/jobs'),
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/jobs?action=new" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      New Job
                    </Button>
                  </Link>
                  <Link href="/properties?action=new" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Home className="w-4 h-4 mr-2" />
                      Add Property
                    </Button>
                  </Link>
                  <Link href="/calendar" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="w-4 h-4 mr-2" />
                      View Calendar
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Jobs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upcoming</CardTitle>
                <Badge variant="info">{data?.metrics.upcomingJobsCount || 0}</Badge>
              </CardHeader>
              <CardContent>
                {data?.upcomingJobs && data.upcomingJobs.length > 0 ? (
                  <div className="space-y-3">
                    {data.upcomingJobs.slice(0, 5).map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="block p-3 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                      >
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {job.property.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(job.scheduledDate)}
                          {job.scheduledTime && ` at ${formatTime(job.scheduledTime)}`}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No upcoming jobs
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {data?.lowStockItems && data.lowStockItems.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardHeader className="flex flex-row items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <CardTitle className="text-yellow-800">Low Stock Alert</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.lowStockItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">{item.name}</span>
                        <span className="text-yellow-700 font-medium">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link href="/supplies" className="block mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      View Inventory
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        {data?.recentActivity && data.recentActivity.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900">
                        {activity.description || `${activity.action} ${activity.entityType}`}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
