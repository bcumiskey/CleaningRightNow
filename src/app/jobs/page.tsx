'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
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
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Job {
  id: string
  scheduledDate: string
  scheduledTime?: string
  status: string
  totalAmount: number
  expensePercent: number
  expenseAmount: number
  teamPayoutTotal: number
  notes?: string
  clientPaid: boolean
  teamPaid: boolean
  property: {
    id: string
    name: string
    address: string
    baseRate: number
    owner?: {
      name: string
    }
  }
  services: Array<{
    id: string
    service: { id: string; name: string }
    price: number
  }>
  teamAssignments: Array<{
    id: string
    teamMember: { id: string; name: string }
    payoutAmount: number
    paid: boolean
  }>
}

interface Property {
  id: string
  name: string
  baseRate: number
}

interface Service {
  id: string
  name: string
  basePrice: number
}

interface TeamMember {
  id: string
  name: string
  active: boolean
}

interface JobFormData {
  propertyId: string
  scheduledDate: string
  scheduledTime: string
  status: string
  totalAmount: string
  expensePercent: string
  notes: string
  clientPaid: boolean
  teamPaid: boolean
  selectedServices: Array<{ serviceId: string; price: number }>
  teamMemberIds: string[]
}

export default function JobsPage() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<JobFormData>({
    propertyId: '',
    scheduledDate: '',
    scheduledTime: '',
    status: 'SCHEDULED',
    totalAmount: '0',
    expensePercent: '12',
    notes: '',
    clientPaid: false,
    teamPaid: false,
    selectedServices: [],
    teamMemberIds: [],
  })

  useEffect(() => {
    fetchJobs()
    fetchProperties()
    fetchServices()
    fetchTeamMembers()
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true)
    }
  }, [searchParams])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
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

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
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
      totalAmount: property?.baseRate?.toString() || '0',
    })
  }

  const handleServiceToggle = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return

    const exists = formData.selectedServices.find((s) => s.serviceId === serviceId)
    let newServices
    if (exists) {
      newServices = formData.selectedServices.filter((s) => s.serviceId !== serviceId)
    } else {
      newServices = [...formData.selectedServices, { serviceId, price: service.basePrice }]
    }

    const newTotal = newServices.reduce((sum, s) => sum + s.price, 0)
    setFormData({
      ...formData,
      selectedServices: newServices,
      totalAmount: newTotal.toString(),
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
      parseFloat(formData.totalAmount) || 0,
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
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime || null,
        status: formData.status,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        expensePercent: parseFloat(formData.expensePercent) || 12,
        notes: formData.notes || null,
        clientPaid: formData.clientPaid,
        teamPaid: formData.teamPaid,
        services: formData.selectedServices,
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

  const resetForm = () => {
    setEditingJob(null)
    setFormData({
      propertyId: '',
      scheduledDate: '',
      scheduledTime: '',
      status: 'SCHEDULED',
      totalAmount: '0',
      expensePercent: '12',
      notes: '',
      clientPaid: false,
      teamPaid: false,
      selectedServices: [],
      teamMemberIds: [],
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'default',
    }
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.property.name.toLowerCase().includes(search.toLowerCase()) ||
      job.property.address.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const payment = getPaymentBreakdown()

  return (
    <DashboardLayout>
      <Header title="Jobs" />

      <div className="page-container">
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
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            className="w-full sm:w-40"
          />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead align="right">Amount</TableHead>
                    <TableHead align="center">Status</TableHead>
                    <TableHead align="center">Payment</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/jobs/${job.id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600"
                          >
                            {job.property.name}
                          </Link>
                          <p className="text-sm text-gray-500">{job.property.address}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(job.scheduledDate)}</span>
                          {job.scheduledTime && (
                            <span className="text-gray-500">at {formatTime(job.scheduledTime)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.teamAssignments.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">
                              {job.teamAssignments.map((a) => a.teamMember.name).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <span className="font-medium">{formatCurrency(job.totalAmount)}</span>
                      </TableCell>
                      <TableCell align="center">{getStatusBadge(job.status)}</TableCell>
                      <TableCell align="center">
                        <div className="flex items-center justify-center gap-2">
                          {job.clientPaid ? (
                            <Badge variant="success" size="sm">
                              <DollarSign className="w-3 h-3" /> Paid
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">Unpaid</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(job)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Select
                label="Property"
                value={formData.propertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                options={properties.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select property"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                />
                <Input
                  label="Time"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>
            </div>

            {/* Services */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {services.map((service) => {
                  const isSelected = formData.selectedServices.some((s) => s.serviceId === service.id)
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceToggle(service.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(service.basePrice)}</p>
                    </button>
                  )
                })}
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
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Total Amount ($)"
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
              <Input
                label="Expense % "
                type="number"
                step="0.1"
                value={formData.expensePercent}
                onChange={(e) => setFormData({ ...formData, expensePercent: e.target.value })}
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'SCHEDULED', label: 'Scheduled' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Payment Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-semibold">{formatCurrency(parseFloat(formData.totalAmount) || 0)}</p>
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
                  <p className="font-semibold">{formatCurrency(payment.perPersonPayout)}</p>
                </div>
              </div>
            </div>

            {/* Notes & Status */}
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
