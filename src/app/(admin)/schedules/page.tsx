'use client'

import { useEffect, useState } from 'react'
import { Calendar, Plus, Clock, Building, RefreshCw, Trash2, Play, Pause } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Property {
  id: string
  name: string
  baseRate: number
}

interface Schedule {
  id: string
  name: string
  propertyId: string
  property: Property
  isActive: boolean
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  time: string | null
  rate: number | null
  expensePercent: number
  generateAheadDays: number
  lastGeneratedDate: string | null
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    fetchSchedules()
    fetchProperties()
  }, [])

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/recurring-schedules')
      if (response.ok) {
        const data = await response.json()
        setSchedules(data)
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
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

  const handleAdd = () => {
    setEditingSchedule(null)
    setShowModal(true)
  }

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setShowModal(true)
  }

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      const url = editingSchedule
        ? `/api/recurring-schedules/${editingSchedule.id}`
        : '/api/recurring-schedules'
      const method = editingSchedule ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success(editingSchedule ? 'Schedule updated' : 'Schedule created')
        setShowModal(false)
        fetchSchedules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save schedule')
      }
    } catch (error) {
      toast.error('Failed to save schedule')
    }
  }

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`Delete schedule "${schedule.name}"? This cannot be undone.`)) return

    try {
      const response = await fetch(`/api/recurring-schedules/${schedule.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Schedule deleted')
        fetchSchedules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete schedule')
      }
    } catch (error) {
      toast.error('Failed to delete schedule')
    }
  }

  const handleToggleActive = async (schedule: Schedule) => {
    try {
      const response = await fetch(`/api/recurring-schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !schedule.isActive }),
      })

      if (response.ok) {
        toast.success(schedule.isActive ? 'Schedule paused' : 'Schedule activated')
        fetchSchedules()
      } else {
        toast.error('Failed to update schedule')
      }
    } catch (error) {
      toast.error('Failed to update schedule')
    }
  }

  const handleGenerateAll = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/recurring-schedules/generate', {
        method: 'PUT',
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchSchedules()
      } else {
        toast.error('Failed to generate jobs')
      }
    } catch (error) {
      toast.error('Failed to generate jobs')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateSingle = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/recurring-schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchSchedules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to generate jobs')
      }
    } catch (error) {
      toast.error('Failed to generate jobs')
    }
  }

  const getFrequencyLabel = (schedule: Schedule) => {
    switch (schedule.frequency) {
      case 'daily':
        return 'Every day'
      case 'weekly':
        return `Every ${DAYS_OF_WEEK.find(d => d.value === String(schedule.dayOfWeek))?.label || ''}`
      case 'biweekly':
        return `Every other ${DAYS_OF_WEEK.find(d => d.value === String(schedule.dayOfWeek))?.label || ''}`
      case 'monthly':
        const day = schedule.dayOfMonth
        const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                      day === 2 || day === 22 ? 'nd' :
                      day === 3 || day === 23 ? 'rd' : 'th'
        return `Monthly on the ${day}${suffix}`
      default:
        return schedule.frequency
    }
  }

  const activeSchedules = schedules.filter(s => s.isActive)

  return (
    <div className="min-h-screen">
      <AdminHeader title="Recurring Schedules" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {schedules.length} Schedules
            </h3>
            <p className="text-sm text-gray-500">
              {activeSchedules.length} active, automatically generating jobs
            </p>
          </div>
          <div className="flex gap-3">
            {activeSchedules.length > 0 && (
              <Button
                variant="outline"
                onClick={handleGenerateAll}
                isLoading={isGenerating}
              >
                <RefreshCw size={16} />
                Generate All Jobs
              </Button>
            )}
            <Button onClick={handleAdd}>
              <Plus size={16} />
              Add Schedule
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Calendar}
                title="No recurring schedules"
                description="Create recurring schedules to automatically generate jobs on a regular basis."
                actionLabel="Add Schedule"
                onAction={handleAdd}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className={!schedule.isActive ? 'opacity-60' : ''}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        schedule.isActive ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Calendar className={schedule.isActive ? 'text-blue-600' : 'text-gray-400'} size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{schedule.name}</h4>
                          <Badge variant={schedule.isActive ? 'success' : 'default'}>
                            {schedule.isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Building size={12} />
                            {schedule.property.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {getFrequencyLabel(schedule)}
                            {schedule.time && ` at ${schedule.time}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(schedule.rate || schedule.property.baseRate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {schedule.generateAheadDays} days ahead
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {schedule.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateSingle(schedule.id)}
                            title="Generate jobs now"
                          >
                            <RefreshCw size={14} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(schedule)}
                          title={schedule.isActive ? 'Pause schedule' : 'Activate schedule'}
                        >
                          {schedule.isActive ? <Pause size={14} /> : <Play size={14} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(schedule)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        schedule={editingSchedule}
        properties={properties}
      />
    </div>
  )
}

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  schedule: Schedule | null
  properties: Property[]
}

function ScheduleModal({ isOpen, onClose, onSave, schedule, properties }: ScheduleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    propertyId: '',
    frequency: 'weekly',
    dayOfWeek: '1',
    dayOfMonth: '1',
    time: '',
    rate: '',
    expensePercent: '12',
    generateAheadDays: '30',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name,
        propertyId: schedule.propertyId,
        frequency: schedule.frequency,
        dayOfWeek: schedule.dayOfWeek?.toString() || '1',
        dayOfMonth: schedule.dayOfMonth?.toString() || '1',
        time: schedule.time || '',
        rate: schedule.rate?.toString() || '',
        expensePercent: schedule.expensePercent.toString(),
        generateAheadDays: schedule.generateAheadDays.toString(),
      })
    } else {
      setFormData({
        name: '',
        propertyId: '',
        frequency: 'weekly',
        dayOfWeek: '1',
        dayOfMonth: '1',
        time: '',
        rate: '',
        expensePercent: '12',
        generateAheadDays: '30',
      })
    }
  }, [schedule, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await onSave(formData)
    setIsSaving(false)
  }

  const selectedProperty = properties.find(p => p.id === formData.propertyId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={schedule ? 'Edit Schedule' : 'Add Recurring Schedule'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Schedule Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Weekly Deep Clean"
          required
        />

        <Select
          label="Property"
          value={formData.propertyId}
          onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
          options={[
            { value: '', label: 'Select a property' },
            ...properties.map(p => ({
              value: p.id,
              label: `${p.name} (${formatCurrency(p.baseRate)})`,
            })),
          ]}
          required
          disabled={!!schedule}
        />

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Schedule Pattern</h4>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              options={FREQUENCIES}
            />

            {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
              <Select
                label="Day of Week"
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                options={DAYS_OF_WEEK}
              />
            )}

            {formData.frequency === 'monthly' && (
              <Select
                label="Day of Month"
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                options={Array.from({ length: 31 }, (_, i) => ({
                  value: String(i + 1),
                  label: String(i + 1),
                }))}
              />
            )}
          </div>

          <div className="mt-4">
            <Input
              label="Time (optional)"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              placeholder="9:00 AM"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Job Settings</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Rate (optional)"
              type="number"
              step="0.01"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              placeholder={selectedProperty ? selectedProperty.baseRate.toString() : 'Property rate'}
            />
            <Input
              label="Expense %"
              type="number"
              value={formData.expensePercent}
              onChange={(e) => setFormData({ ...formData, expensePercent: e.target.value })}
            />
            <Input
              label="Generate Ahead (days)"
              type="number"
              value={formData.generateAheadDays}
              onChange={(e) => setFormData({ ...formData, generateAheadDays: e.target.value })}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Jobs will be auto-generated up to {formData.generateAheadDays} days in advance.
            {!formData.rate && selectedProperty && ` Using property rate: ${formatCurrency(selectedProperty.baseRate)}`}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {schedule ? 'Save Changes' : 'Add Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
