'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { formatCurrency, formatDate, formatTime, calculateJobPayment } from '@/lib/utils'
import {
  Briefcase,
  Plus,
  Search,
  Clock,
  Users,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface Job {
  id: string
  date: string
  time?: string
  source: 'manual' | 'turno' | 'google'
  completed: boolean
  rate: number
  expensePercent: number
  clientPaid: boolean
  teamPaid: boolean
  notes?: string
  property: {
    id: string
    name: string
    address: string
  }
  assignments: Array<{
    id: string
    teamMember: {
      id: string
      name: string
    }
  }>
}

interface Property {
  id: string
  name: string
  baseRate: number
}

interface TeamMember {
  id: string
  name: string
  active: boolean
}

interface JobFormData {
  propertyId: string
  date: string
  time: string
  rate: string
  expensePercent: string
  notes: string
  clientPaid: boolean
  teamPaid: boolean
  teamMemberIds: string[]
}

const sourceColors: Record<string, string> = {
  turno: 'bg-purple-100 text-purple-700',
  google: 'bg-green-100 text-green-700',
  manual: 'bg-gray-100 text-gray-700',
}

export default function JobsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<JobFormData>({
    propertyId: '',
    date: '',
    time: '',
    rate: '0',
    expensePercent: '12',
    notes: '',
    clientPaid: false,
    teamPaid: false,
    teamMemberIds: [],
  })

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProperties()
      fetchTeamMembers()
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchJobs()
    }
  }, [currentMonth, status])

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true)
    }
  }, [searchParams])

  const fetchJobs = async () => {
    setIsLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const response = await fetch(
        `/api/jobs?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      toast.error('Failed to load jobs')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.filter((m: TeamMember) => m.active))
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    }
  }

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    setFormData({
      ...formData,
      propertyId,
      rate: property?.baseRate?.toString() || '0',
    })
  }

  const handleTeamMemberToggle = (memberId: string) => {
    const exists = formData.teamMemberIds.includes(memberId)
    const newTeamMemberIds = exists
      ? formData.teamMemberIds.filter((id) => id !== memberId)
      : [...formData.teamMemberIds, memberId]
    setFormData({ ...formData, teamMemberIds: newTeamMemberIds })
  }

  const getPaymentBreakdown = () => {
    return calculateJobPayment(
      parseFloat(formData.rate) || 0,
      parseFloat(formData.expensePercent) || 12,
      formData.teamMemberIds.length
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        propertyId: formData.propertyId,
        date: formData.date,
        time: formData.time || null,
        rate: parseFloat(formData.rate) || 0,
        expensePercent: parseFloat(formData.expensePercent) || 12,
        notes: formData.notes || null,
        clientPaid: formData.clientPaid,
        teamPaid: formData.teamPaid,
        teamMemberIds: formData.teamMemberIds,
      }

      const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs'
      const method = editingJob ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingJob ? 'Job updated' : 'Job created')
        setIsModalOpen(false)
        resetForm()
        fetchJobs()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save job')
      }
    } catch (error) {
      console.error('Failed to save job:', error)
      toast.error('Failed to save job')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (job: Job) => {
    if (!confirm(`Are you sure you want to delete this job at "${job.property.name}"?`)) return

    try {
      const response = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Job deleted')
        fetchJobs()
      } else {
        toast.error('Failed to delete job')
      }
    } catch (error) {
      console.error('Failed to delete job:', error)
      toast.error('Failed to delete job')
    }
  }

  const handleMarkClientPaid = async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientPaid: true }),
      })
      if (response.ok) {
        toast.success('Marked as client paid')
        fetchJobs()
      }
    } catch {
      toast.error('Failed to update job')
    }
  }

  const handleMarkTeamPaid = async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamPaid: true }),
      })
      if (response.ok) {
        toast.success('Marked as team paid')
        fetchJobs()
      }
    } catch {
      toast.error('Failed to update job')
    }
  }

  const resetForm = () => {
    setEditingJob(null)
    setFormData({
      propertyId: '',
      date: '',
      time: '',
      rate: '0',
      expensePercent: '12',
      notes: '',
      clientPaid: false,
      teamPaid: false,
      teamMemberIds: [],
    })
  }

  const editJob = (job: Job) => {
    setEditingJob(job)
    setFormData({
      propertyId: job.property.id,
      date: job.date.split('T')[0],
      time: job.time || '',
      rate: job.rate.toString(),
      expensePercent: job.expensePercent.toString(),
      notes: job.notes || '',
      clientPaid: job.clientPaid,
      teamPaid: job.teamPaid,
      teamMemberIds: job.assignments.map((a) => a.teamMember.id),
    })
    setIsModalOpen(true)
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.property.name.toLowerCase().includes(search.toLowerCase()) ||
      job.property.address.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && job.completed) ||
      (statusFilter === 'pending' && !job.completed) ||
      (statusFilter === 'unpaid' && !job.clientPaid)
    return matchesSearch && matchesStatus
  })

  // Calculate summary stats
  const totalRevenue = filteredJobs.reduce((sum, job) => sum + job.rate, 0)
  const totalExpenses = filteredJobs.reduce(
    (sum, job) => sum + (job.rate * job.expensePercent) / 100,
    0
  )
  const totalTeamSplit = filteredJobs.reduce(
    (sum, job) => sum + (job.rate - (job.rate * job.expensePercent) / 100),
    0
  )

  const payment = getPaymentBreakdown()

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

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

  return (
    <DashboardLayout>
      <Header title="Jobs & Payments" />

      <div className="page-container">
        {/* Month Selector and Summary */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[160px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            icon={TrendingUp}
            iconColor="text-green-600 bg-green-100"
          />
          <StatCard
            title="Job Count"
            value={String(filteredJobs.length)}
            icon={Briefcase}
            iconColor="text-blue-600 bg-blue-100"
          />
          <StatCard
            title={`Expenses (12%)`}
            value={formatCurrency(totalExpenses)}
            icon={Percent}
            iconColor="text-orange-600 bg-orange-100"
          />
          <StatCard
            title="Team Split"
            value={formatCurrency(totalTeamSplit)}
            icon={Users}
            iconColor="text-purple-600 bg-purple-100"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="unpaid">Unpaid</option>
          </Select>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            New Job
          </Button>
        </div>

        {/* Jobs List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead align="right">Rate</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead align="right">Per Person</TableHead>
                      <TableHead align="center">Status</TableHead>
                      <TableHead align="center">Client Paid</TableHead>
                      <TableHead align="center">Team Paid</TableHead>
                      <TableHead align="right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => {
                      const expense = (job.rate * job.expensePercent) / 100
                      const teamTotal = job.rate - expense
                      const perPerson = job.assignments.length > 0 ? teamTotal / job.assignments.length : 0

                      return (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-sm font-medium">{formatDate(job.date)}</span>
                                {job.time && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    {formatTime(job.time)}
                                  </span>
                                )}
                              </div>
                              <Badge className={`text-xs ${sourceColors[job.source]}`}>
                                {job.source}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/jobs/${job.id}`}
                              className="font-medium text-gray-900 hover:text-indigo-600"
                            >
                              {job.property.name}
                            </Link>
                          </TableCell>
                          <TableCell align="right">
                            <span className="font-medium">{formatCurrency(job.rate)}</span>
                          </TableCell>
                          <TableCell>
                            {job.assignments.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">
                                  {job.assignments.map((a) => a.teamMember.name.split(' ')[0]).join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <span className="font-medium text-indigo-600">
                              {job.assignments.length > 0 ? formatCurrency(perPerson) : '-'}
                            </span>
                          </TableCell>
                          <TableCell align="center">
                            {job.completed ? (
                              <Badge variant="success">
                                <CheckCircle className="w-3 h-3" />
                                Done
                              </Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {job.clientPaid ? (
                              <Badge variant="success">
                                <DollarSign className="w-3 h-3" />
                                Paid
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkClientPaid(job)}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {job.teamPaid ? (
                              <Badge variant="success">
                                <UserCheck className="w-3 h-3" />
                                Paid
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkTeamPaid(job)}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/jobs/${job.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm" onClick={() => editJob(job)}>
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(job)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No jobs yet"
                description="Create your first job to start tracking your cleaning schedule."
                action={{
                  label: 'Create Job',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingJob ? 'Edit Job' : 'Create Job'}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Property & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                <Select
                  value={formData.propertyId}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                >
                  <option value="">Select property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date *"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  label="Time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            {/* Team Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map((member) => {
                  const isSelected = formData.teamMemberIds.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleTeamMemberToggle(member.id)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {member.name}
                    </button>
                  )
                })}
                {teamMembers.length === 0 && (
                  <p className="text-sm text-gray-500">No team members available</p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Rate ($)"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              />
              <Input
                label="Expense %"
                type="number"
                step="0.1"
                value={formData.expensePercent}
                onChange={(e) => setFormData({ ...formData, expensePercent: e.target.value })}
              />
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Payment Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Rate</p>
                  <p className="font-semibold">{formatCurrency(parseFloat(formData.rate) || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Business ({formData.expensePercent}%)</p>
                  <p className="font-semibold">{formatCurrency(payment.expenseAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Team Split</p>
                  <p className="font-semibold">{formatCurrency(payment.teamPayoutTotal)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Per Person</p>
                  <p className="font-semibold text-indigo-600">{formatCurrency(payment.perPersonPayout)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Job notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.clientPaid}
                  onChange={(e) => setFormData({ ...formData, clientPaid: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Client Paid</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.teamPaid}
                  onChange={(e) => setFormData({ ...formData, teamPaid: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Team Paid</span>
              </label>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingJob ? 'Update' : 'Create'} Job
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
