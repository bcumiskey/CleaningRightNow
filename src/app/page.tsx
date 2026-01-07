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
import { formatCurrency, formatDate, calculateJobPayment } from '@/lib/utils'
import {
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  Briefcase,
  Calendar,
  ArrowRight,
  Plus,
  Home,
  Loader2,
  FileText,
  AlertCircle,
  Bell,
  User,
  Info,
  Package,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  todayJobs: Array<{
    id: string
    date: string
    time?: string
    rate: number
    expensePercent: number
    completed: boolean
    source: string
    property: {
      id: string
      name: string
      address: string
      calendarSource?: string
    }
    assignments: Array<{
      teamMember: {
        id: string
        name: string
      }
      amountEarned?: number
    }>
  }>
  upcomingJobs: Array<{
    id: string
    date: string
    time?: string
    property: {
      id: string
      name: string
      calendarSource?: string
    }
    assignments: Array<{
      teamMember: {
        id: string
        name: string
      }
    }>
  }>
  metrics: {
    monthlyRevenue: number
    monthlyExpenses: number
    pendingFromClients: number
    owedToTeam: number
    draftInvoicesCount: number
    lowStockCount: number
    todayJobsCount: number
    upcomingJobsCount: number
    completedJobsThisMonth: number
    activeNotesCount: number
    notesResolvedThisWeek: number
  }
  propertyAlerts: Array<{
    property: { id: string; name: string }
    notes: Array<{
      id: string
      type: string
      content: string
      createdAt: string
    }>
  }>
  teamBalances: Array<{
    id: string
    name: string
    owed: number
  }>
}

const sourceColors: Record<string, string> = {
  turno: 'bg-purple-100 text-purple-800',
  google: 'bg-green-100 text-green-800',
  manual: 'bg-gray-100 text-gray-800',
}

const noteTypeIcons: Record<string, typeof AlertCircle> = {
  issue: AlertCircle,
  reminder: Bell,
  owner_request: User,
  info: Info,
}

const noteTypeColors: Record<string, string> = {
  issue: 'text-red-600',
  reminder: 'text-amber-600',
  owner_request: 'text-purple-600',
  info: 'text-blue-600',
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

  const getSourceBadge = (source: string) => {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sourceColors[source] || sourceColors.manual}`}>
        {source}
      </span>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(data?.metrics.monthlyRevenue || 0)}
            icon={DollarSign}
            iconColor="text-green-600 bg-green-100"
          />
          <StatCard
            title="Pending from Clients"
            value={formatCurrency(data?.metrics.pendingFromClients || 0)}
            icon={Clock}
            iconColor="text-yellow-600 bg-yellow-100"
          />
          <StatCard
            title="Owed to Team"
            value={formatCurrency(data?.metrics.owedToTeam || 0)}
            icon={Users}
            iconColor="text-purple-600 bg-purple-100"
          />
          <Link href="/invoices?status=draft">
            <StatCard
              title="Draft Invoices"
              value={String(data?.metrics.draftInvoicesCount || 0)}
              icon={FileText}
              iconColor="text-blue-600 bg-blue-100"
            />
          </Link>
          <Link href="/linens">
            <StatCard
              title="Low Stock Items"
              value={String(data?.metrics.lowStockCount || 0)}
              icon={Package}
              iconColor="text-red-600 bg-red-100"
            />
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Jobs Panel */}
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
                  <div className="space-y-3">
                    {data.todayJobs.map((job) => {
                      const payment = calculateJobPayment(job.rate, job.expensePercent, job.assignments.length)
                      return (
                        <Link
                          key={job.id}
                          href={`/jobs`}
                          className="block p-4 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {job.property.name}
                                </h4>
                                {getSourceBadge(job.source)}
                                {job.completed && (
                                  <Badge variant="success">Completed</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {job.property.address}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                {job.time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {job.time}
                                  </span>
                                )}
                                {job.assignments.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {job.assignments.map((a) => a.teamMember.name).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(job.rate)}
                              </p>
                              {job.assignments.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  {formatCurrency(payment.perPersonPayout)}/person
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
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
            {/* Team Balances Panel */}
            {data?.teamBalances && data.teamBalances.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Team Balances</CardTitle>
                  <Link href="/team">
                    <Button variant="ghost" size="sm">
                      Pay All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.teamBalances.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-700">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{member.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(member.owed)}
                          </span>
                          <Link href={`/team`}>
                            <Button variant="outline" size="sm">Pay</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/jobs" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      New Job
                    </Button>
                  </Link>
                  <Link href="/properties" className="block">
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
                        href={`/jobs`}
                        className="block p-3 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {job.property.name}
                          </p>
                          {job.property.calendarSource && getSourceBadge(job.property.calendarSource)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(job.date)}
                          {job.time && ` at ${job.time}`}
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
          </div>
        </div>

        {/* Property Alerts Panel */}
        {data?.propertyAlerts && data.propertyAlerts.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Property Alerts
              </CardTitle>
              <Link href="/notes">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.propertyAlerts.slice(0, 6).map((alert) => (
                  <div
                    key={alert.property.id}
                    className="p-4 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 mb-2">{alert.property.name}</h4>
                    <div className="space-y-2">
                      {alert.notes.slice(0, 2).map((note) => {
                        const IconComponent = noteTypeIcons[note.type] || Info
                        return (
                          <div key={note.id} className="flex items-start gap-2 text-sm">
                            <IconComponent className={`w-4 h-4 mt-0.5 ${noteTypeColors[note.type] || 'text-gray-600'}`} />
                            <span className="text-gray-600 line-clamp-2">{note.content}</span>
                          </div>
                        )
                      })}
                      {alert.notes.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{alert.notes.length - 2} more notes
                        </p>
                      )}
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
