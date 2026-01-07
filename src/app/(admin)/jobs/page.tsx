'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, calculateJobPayments } from '@/lib/utils'
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
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchJobs()
    fetchProperties()
    fetchTeamMembers()
  }, [currentMonth])

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
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('Job created')
        setShowModal(false)
        fetchJobs()
      } else {
        toast.error('Failed to create job')
      }
    } catch (error) {
      toast.error('Failed to create job')
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
      }
    } catch (error) {
      toast.error('Failed to update job')
    }
  }

  const totalRevenue = jobs.reduce((sum, job) => sum + job.rate, 0)
  const totalExpense = jobs.reduce((sum, job) => sum + (job.rate * job.expensePercent / 100), 0)
  const teamTotal = totalRevenue - totalExpense

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Jobs & Payments" />

      <div className="p-6 space-y-6">
        {/* Month Navigation & Summary */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <div>
                <span className="text-gray-500">Revenue:</span>
                <span className="font-semibold ml-2">{formatCurrency(totalRevenue)}</span>
              </div>
              <div>
                <span className="text-gray-500">Jobs:</span>
                <span className="font-semibold ml-2">{jobs.length}</span>
              </div>
              <div>
                <span className="text-gray-500">12% Expense:</span>
                <span className="font-semibold ml-2">{formatCurrency(totalExpense)}</span>
              </div>
              <div>
                <span className="text-gray-500">Team Split:</span>
                <span className="font-semibold ml-2">{formatCurrency(teamTotal)}</span>
              </div>
              <Button onClick={() => setShowModal(true)}>
                <Plus size={16} />
                Add Job
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : jobs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Calendar}
                  title="No jobs yet"
                  description="Add a job or sync your calendars to get started."
                  actionLabel="Add Job"
                  onAction={() => setShowModal(true)}
                />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Per Person</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Client Paid</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Team Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jobs.map((job) => {
                    const payments = calculateJobPayments(job.rate, job.expensePercent, job.assignments.length)
                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium">{format(new Date(job.date), 'MMM d')}</div>
                          <div className="text-sm text-gray-500">{job.time || '-'}</div>
                        </td>
                        <td className="px-6 py-4 font-medium">{job.property.name}</td>
                        <td className="px-6 py-4">{formatCurrency(job.rate)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {job.assignments.map((a) => (
                              <Badge key={a.teamMember.id} variant="info">
                                {a.teamMember.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {job.assignments.length > 0 ? formatCurrency(payments.perPerson) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={job.completed ? 'success' : 'warning'}>
                            {job.completed ? 'Done' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={job.clientPaid}
                            onChange={(e) => handleStatusChange(job.id, 'clientPaid', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={job.teamPaid}
                            onChange={(e) => handleStatusChange(job.id, 'teamPaid', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <JobModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        properties={properties}
        teamMembers={teamMembers}
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
}

function JobModal({ isOpen, onClose, onSave, properties, teamMembers }: JobModalProps) {
  const [formData, setFormData] = useState({
    propertyId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    rate: '',
    teamMemberIds: [] as string[],
  })
  const [isSaving, setIsSaving] = useState(false)

  const selectedProperty = properties.find((p) => p.id === formData.propertyId)

  useEffect(() => {
    if (selectedProperty && !formData.rate) {
      setFormData((prev) => ({ ...prev, rate: selectedProperty.baseRate.toString() }))
    }
  }, [selectedProperty])

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
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Job" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Property"
          value={formData.propertyId}
          onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Schedule Job
          </Button>
        </div>
      </form>
    </Modal>
  )
}
