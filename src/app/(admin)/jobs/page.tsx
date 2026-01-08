'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  MapPin,
  Clock,
  DollarSign,
} from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, calculateJobPayments, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Job {
  id: string
  date: string
  time: string | null
  rate: number
  expensePercent: number
  completed: boolean
  clientPaid: boolean
  teamPaid: boolean
  source: string
  property: { id: string; name: string }
  assignments: { teamMember: { id: string; name: string } }[]
}

interface Property {
  id: string
  name: string
  baseRate: number
}

interface TeamMember {
  id: string
  name: string
}

export default function JobsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchJobs()
    fetchProperties()
    fetchTeamMembers()
  }, [currentMonth])

  // Scroll to highlighted job
  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const element = document.getElementById(`job-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-2', 'ring-blue-500')
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500')
          }, 3000)
        }
      }, 100)
    }
  }, [highlightId, jobs])

  const fetchJobs = async () => {
    try {
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()
      const response = await fetch(`/api/jobs?month=${month}&year=${year}`)
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

  const fetchProperties = async () => {
    const response = await fetch('/api/properties')
    if (response.ok) {
      setProperties(await response.json())
    }
  }

  const fetchTeamMembers = async () => {
    const response = await fetch('/api/team')
    if (response.ok) {
      setTeamMembers(await response.json())
    }
  }

  const handleSave = async (data: any) => {
    try {
      const payload = {
        ...data,
        rate: parseFloat(data.rate) || 0,
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
        setShowModal(false)
        setEditingJob(null)
        fetchJobs()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save job')
      }
    } catch (error) {
      toast.error('Failed to save job')
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this job?')) return
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Job deleted')
        fetchJobs()
      } else {
        toast.error('Failed to delete job')
      }
    } catch (error) {
      toast.error('Failed to delete job')
    }
  }

  const handleStatusChange = async (jobId: string, field: string, value: boolean) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        fetchJobs()
        toast.success(value ? 'Marked as paid' : 'Unmarked')
      }
    } catch (error) {
      toast.error('Failed to update job')
    }
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job)
    setShowModal(true)
  }

  const totalRevenue = jobs.reduce((sum, job) => sum + job.rate, 0)
  const completedJobs = jobs.filter(j => j.completed).length

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Group jobs by date
  const jobsByDate = jobs.reduce((acc, job) => {
    const dateKey = format(new Date(job.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(job)
    return acc
  }, {} as Record<string, Job[]>)

  const sortedDates = Object.keys(jobsByDate).sort()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Jobs & Payments" />

      <div className="p-6 space-y-6">
        {/* Header with Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Jobs</p>
                  <p className="text-2xl font-bold">{jobs.length}</p>
                </div>
                <Calendar className="text-blue-500" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedJobs}</p>
                </div>
                <Check className="text-green-500" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
                <DollarSign className="text-emerald-500" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-center">
              <Button onClick={() => { setEditingJob(null); setShowModal(true) }} className="w-full">
                <Plus size={16} />
                Add Job
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Month Navigation */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight size={20} />
            </button>
          </CardContent>
        </Card>

        {/* Jobs List */}
        {isLoading ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">Loading...</CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={Calendar}
                title="No jobs this month"
                description="Add a job or sync your calendars to get started."
                actionLabel="Add Job"
                onAction={() => setShowModal(true)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(dateKey => (
              <div key={dateKey}>
                <h4 className="text-sm font-semibold text-gray-500 mb-2 px-1">
                  {format(new Date(dateKey), 'EEEE, MMMM d')}
                </h4>
                <div className="space-y-2">
                  {jobsByDate[dateKey].map(job => {
                    const payments = calculateJobPayments(job.rate, job.expensePercent, job.assignments.length)
                    return (
                      <Card
                        key={job.id}
                        id={`job-${job.id}`}
                        className={cn(
                          'transition-all',
                          job.completed ? 'bg-green-50 border-green-200' : 'bg-white'
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            {/* Left: Property & Time */}
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                'w-12 h-12 rounded-lg flex items-center justify-center',
                                job.completed ? 'bg-green-200' : 'bg-blue-100'
                              )}>
                                {job.completed ? (
                                  <Check className="text-green-700" size={24} />
                                ) : (
                                  <MapPin className="text-blue-600" size={24} />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{job.property.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  {job.time && (
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} />
                                      {job.time}
                                    </span>
                                  )}
                                  <span className="capitalize">{job.source}</span>
                                </div>
                              </div>
                            </div>

                            {/* Middle: Team */}
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-gray-400" />
                              {job.assignments.length > 0 ? (
                                <div className="flex gap-1">
                                  {job.assignments.map(a => (
                                    <Badge key={a.teamMember.id} variant="info">
                                      {a.teamMember.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">Unassigned</span>
                              )}
                            </div>

                            {/* Right: Payment Info & Actions */}
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="font-semibold text-lg">{formatCurrency(job.rate)}</div>
                                {job.assignments.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {formatCurrency(payments.perPerson)} each
                                  </div>
                                )}
                              </div>

                              {/* Payment Checkboxes */}
                              <div className="flex items-center gap-4 border-l pl-4">
                                <label className="flex flex-col items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={job.clientPaid}
                                    onChange={(e) => handleStatusChange(job.id, 'clientPaid', e.target.checked)}
                                    className="w-5 h-5 text-green-600 rounded mb-1"
                                  />
                                  <span className="text-xs text-gray-500">Client</span>
                                </label>
                                <label className="flex flex-col items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={job.teamPaid}
                                    onChange={(e) => handleStatusChange(job.id, 'teamPaid', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded mb-1"
                                  />
                                  <span className="text-xs text-gray-500">Team</span>
                                </label>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEdit(job)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(job.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <JobModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingJob(null) }}
        onSave={handleSave}
        properties={properties}
        teamMembers={teamMembers}
        editingJob={editingJob}
      />
    </div>
  )
}

interface JobModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  properties: Property[]
  teamMembers: TeamMember[]
  editingJob: Job | null
}

function JobModal({ isOpen, onClose, onSave, properties, teamMembers, editingJob }: JobModalProps) {
  const [formData, setFormData] = useState({
    propertyId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    rate: '',
    teamMemberIds: [] as string[],
    completed: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editingJob) {
        setFormData({
          propertyId: editingJob.property.id,
          date: format(new Date(editingJob.date), 'yyyy-MM-dd'),
          time: editingJob.time || '',
          rate: editingJob.rate.toString(),
          teamMemberIds: editingJob.assignments.map(a => a.teamMember.id),
          completed: editingJob.completed,
        })
      } else {
        setFormData({
          propertyId: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          time: '',
          rate: '',
          teamMemberIds: [],
          completed: false,
        })
      }
    }
  }, [isOpen, editingJob])

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    setFormData((prev) => ({
      ...prev,
      propertyId,
      rate: property ? property.baseRate.toString() : prev.rate,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await onSave(formData)
    setIsSaving(false)
  }

  const toggleTeamMember = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.includes(id)
        ? prev.teamMemberIds.filter((i) => i !== id)
        : [...prev.teamMemberIds, id],
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingJob ? 'Edit Job' : 'Schedule Job'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Property"
          value={formData.propertyId}
          onChange={(e) => handlePropertyChange(e.target.value)}
          options={[
            { value: '', label: 'Select a property' },
            ...properties.map((p) => ({ value: p.id, label: p.name })),
          ]}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
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

        <Input
          label="Rate"
          type="number"
          step="0.01"
          value={formData.rate}
          onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Assign Team</label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleTeamMember(member.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formData.teamMemberIds.includes(member.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {member.name}
              </button>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-sm text-gray-500">No team members yet</p>
            )}
          </div>
        </div>

        {editingJob && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.completed}
              onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Mark as completed</span>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {editingJob ? 'Save Changes' : 'Schedule Job'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
