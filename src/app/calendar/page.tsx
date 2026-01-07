'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatTime, getDaysInMonth, isSameDay, isToday } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'

interface Job {
  id: string
  date: string
  time?: string
  source: 'manual' | 'turno' | 'google'
  completed: boolean
  rate: number
  property: {
    id: string
    name: string
  }
  assignments: Array<{
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
}

const sourceColors: Record<string, string> = {
  turno: 'bg-purple-500',
  google: 'bg-green-500',
  manual: 'bg-gray-500',
}

const sourceLegend: Record<string, string> = {
  turno: 'Turno',
  google: 'Google Calendar',
  manual: 'Manual',
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [view, setView] = useState<'month' | 'week'>('month')

  // Add job modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formData, setFormData] = useState({
    propertyId: '',
    date: '',
    time: '',
    rate: 0,
    teamMemberIds: [] as string[],
  })

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchJobs()
    }
  }, [currentDate, status])

  const fetchData = async () => {
    try {
      const [propertiesRes, teamRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/team'),
      ])
      if (propertiesRes.ok) {
        const data = await propertiesRes.json()
        setProperties(data)
      }
      if (teamRes.ok) {
        const data = await teamRes.json()
        setTeamMembers(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  const fetchJobs = async () => {
    setIsLoading(true)
    try {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      const response = await fetch(
        `/api/jobs?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
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

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      // TODO: Implement calendar sync API
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success('Calendars synced successfully')
      fetchJobs()
    } catch (error) {
      toast.error('Failed to sync calendars')
    } finally {
      setIsSyncing(false)
    }
  }

  const openAddJobModal = (date: Date) => {
    setSelectedDate(date)
    setFormData({
      propertyId: '',
      date: format(date, 'yyyy-MM-dd'),
      time: '',
      rate: 0,
      teamMemberIds: [],
    })
    setIsModalOpen(true)
  }

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    setFormData({
      ...formData,
      propertyId,
      rate: property?.baseRate || 0,
    })
  }

  const handleTeamMemberToggle = (memberId: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.includes(memberId)
        ? prev.teamMemberIds.filter((id) => id !== memberId)
        : [...prev.teamMemberIds, memberId],
    }))
  }

  const handleAddJob = async () => {
    if (!formData.propertyId) {
      toast.error('Please select a property')
      return
    }

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Job added successfully')
        setIsModalOpen(false)
        fetchJobs()
      } else {
        toast.error('Failed to add job')
      }
    } catch (error) {
      console.error('Error adding job:', error)
      toast.error('Failed to add job')
    }
  }

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getJobsForDay = (date: Date) => {
    return jobs.filter((job) => isSameDay(new Date(job.date), date))
  }

  const getWorkerInitials = (assignments: Job['assignments']) => {
    return assignments
      .map((a) => {
        const names = a.teamMember.name.split(' ')
        return names.map((n) => n[0]).join('')
      })
      .join(', ')
  }

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

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
      <Header title="Calendar" />

      <div className="page-container">
        {/* Calendar Header */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setView('month')}
                    className={`px-3 py-1.5 text-sm ${
                      view === 'month'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setView('week')}
                    className={`px-3 py-1.5 text-sm ${
                      view === 'week'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Week
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
                <Button size="sm" onClick={() => openAddJobModal(new Date())}>
                  <Plus className="w-4 h-4" />
                  Add Job
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Week Days Header */}
                <div className="grid grid-cols-7 border-b">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="px-2 py-3 text-center text-sm font-semibold text-gray-600 bg-gray-50"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {days.map((date, index) => {
                    const dayJobs = getJobsForDay(date)
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                    const today = isToday(date)

                    return (
                      <div
                        key={index}
                        className={`min-h-[120px] border-b border-r p-2 cursor-pointer hover:bg-gray-50 ${
                          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onClick={() => openAddJobModal(date)}
                      >
                        <div
                          className={`text-sm font-medium mb-1 ${
                            today
                              ? 'w-7 h-7 flex items-center justify-center bg-indigo-600 text-white rounded-full'
                              : isCurrentMonth
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                          {dayJobs.slice(0, 3).map((job) => (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              className={`block text-xs p-1 rounded truncate text-white ${
                                sourceColors[job.source]
                              } hover:opacity-90`}
                            >
                              <div className="flex items-center gap-1">
                                {job.time && (
                                  <span className="font-medium">
                                    {formatTime(job.time)}
                                  </span>
                                )}
                                <span className="truncate">{job.property.name}</span>
                              </div>
                              {job.assignments.length > 0 && (
                                <div className="text-[10px] opacity-80">
                                  {getWorkerInitials(job.assignments)}
                                </div>
                              )}
                            </Link>
                          ))}
                          {dayJobs.length > 3 && (
                            <p className="text-xs text-gray-500 pl-1">
                              +{dayJobs.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {Object.entries(sourceLegend).map(([source, label]) => (
            <div key={source} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${sourceColors[source]}`} />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <div className="w-3 h-3 rounded bg-gray-300 border-2 border-green-500" />
            <span className="text-gray-600">Completed</span>
          </div>
        </div>
      </div>

      {/* Add Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Add Job - ${selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property *
            </label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate ($)
            </label>
            <Input
              type="number"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Team Members
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
              {teamMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.teamMemberIds.includes(member.id)}
                    onChange={() => handleTeamMemberToggle(member.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{member.name}</span>
                </label>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No team members available</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddJob}>
              Add Job
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
