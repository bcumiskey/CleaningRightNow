'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, RefreshCw, Settings, Plus } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { cn, getDateKey, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Job {
  id: string
  date: string
  time: string | null
  completed: boolean
  source: string
  property: { id: string; name: string; color: string | null }
}

interface Property {
  id: string
  name: string
  baseRate: number
  color: string | null
}

interface TeamMember {
  id: string
  name: string
  isActive: boolean
}

interface HoverPreview {
  day: Date
  jobs: Job[]
  x: number
  y: number
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Job creation modal state
  const [showJobModal, setShowJobModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isSavingJob, setIsSavingJob] = useState(false)
  const [jobFormData, setJobFormData] = useState({
    propertyId: '',
    rate: '',
    expensePercent: '12',
    teamMemberIds: [] as string[],
  })

  // Handle date click - open modal to create job
  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd')
    setSelectedDate(formattedDate)
    setJobFormData({
      propertyId: '',
      rate: '',
      expensePercent: '12',
      teamMemberIds: [],
    })
    setShowJobModal(true)
  }

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    setJobFormData(prev => ({
      ...prev,
      propertyId,
      rate: property ? property.baseRate.toString() : prev.rate,
    }))
  }

  const handleSaveJob = async () => {
    if (!jobFormData.propertyId) {
      toast.error('Please select a property')
      return
    }
    setIsSavingJob(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: jobFormData.propertyId,
          date: selectedDate,
          rate: parseFloat(jobFormData.rate) || undefined,
          expensePercent: parseFloat(jobFormData.expensePercent) || 12,
          teamMemberIds: jobFormData.teamMemberIds,
        }),
      })
      if (response.ok) {
        toast.success('Job created')
        setShowJobModal(false)
        fetchJobs()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create job')
      }
    } catch {
      toast.error('Failed to create job')
    } finally {
      setIsSavingJob(false)
    }
  }

  const toggleTeamMember = (id: string) => {
    setJobFormData(prev => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.includes(id)
        ? prev.teamMemberIds.filter(i => i !== id)
        : [...prev.teamMemberIds, id],
    }))
  }

  // Handle hover with 2 second delay
  const handleDayHover = useCallback((e: React.MouseEvent, day: Date, dayJobs: Job[]) => {
    if (dayJobs.length === 0) return

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()

    hoverTimeoutRef.current = setTimeout(() => {
      setHoverPreview({
        day,
        jobs: dayJobs,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      })
    }, 2000) // 2 second delay
  }, [])

  const handleDayLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setHoverPreview(null)
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [currentMonth])

  useEffect(() => {
    // Fetch properties and team members for job creation
    const fetchData = async () => {
      const [propsRes, teamRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/team'),
      ])
      if (propsRes.ok) setProperties(await propsRes.json())
      if (teamRes.ok) {
        const team = await teamRes.json()
        setTeamMembers(team.filter((m: TeamMember) => m.isActive))
      }
    }
    fetchData()
  }, [])

  const fetchJobs = async () => {
    try {
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()
      const response = await fetch(`/api/jobs?month=${month}&year=${year}`)
      if (response.ok) {
        setJobs(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncCalendars = async () => {
    setIsSyncing(true)
    try {
      // Sync iCal calendars and generate recurring jobs in parallel
      const [calendarRes, recurringRes] = await Promise.all([
        fetch('/api/calendar-sources/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
        fetch('/api/recurring-schedules/generate', {
          method: 'PUT',
        }),
      ])

      const messages: string[] = []

      if (calendarRes.ok) {
        const calendarData = await calendarRes.json()
        const calendarCreated = calendarData.summary?.jobsCreated || 0
        const unmatched = calendarData.summary?.unmatchedEvents || 0
        if (calendarCreated > 0) {
          messages.push(`${calendarCreated} from calendars`)
        }
        if (unmatched > 0) {
          toast.error(`${unmatched} calendar events couldn't be matched to properties`)
        }
      }

      if (recurringRes.ok) {
        const recurringData = await recurringRes.json()
        const recurringCreated = recurringData.totalJobsCreated || 0
        if (recurringCreated > 0) {
          messages.push(`${recurringCreated} from recurring schedules`)
        }
      }

      if (messages.length > 0) {
        toast.success(`Created: ${messages.join(', ')}`)
        fetchJobs()
      } else {
        toast.success('Calendars are up to date')
      }
    } catch (error) {
      toast.error('Failed to sync calendars')
    } finally {
      setIsSyncing(false)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start of month to align with day of week
  const startDay = monthStart.getDay()
  const paddedDays = [...Array(startDay).fill(null), ...days]

  const getJobsForDay = (date: Date) => {
    const dateKey = getDateKey(date)
    return jobs.filter((job) => getDateKey(job.date) === dateKey)
  }

  // Get color styles for a job based on property color and completion status
  const getJobColorStyle = (job: Job) => {
    if (job.property.color) {
      // Use property color with opacity for completed jobs
      const baseColor = job.property.color
      if (job.completed) {
        return {
          backgroundColor: `${baseColor}30`,
          color: baseColor,
          borderLeft: `3px solid ${baseColor}`,
        }
      }
      return {
        backgroundColor: `${baseColor}20`,
        color: baseColor,
        borderLeft: `3px solid ${baseColor}`,
      }
    }
    // Default colors if no property color set
    return undefined
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Calendar" />

      <div className="p-6">
        {/* Header with Sync Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            Click any date to add a job. Jobs from calendars, recurring schedules, or added manually.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
                setJobFormData({
                  propertyId: '',
                  rate: '',
                  expensePercent: '12',
                  teamMemberIds: [],
                })
                setShowJobModal(true)
              }}
            >
              <Plus size={16} />
              Add Job
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/calendar')}
            >
              <Settings size={16} />
              Calendar Sources
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncCalendars}
              isLoading={isSyncing}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              Sync Calendars
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {paddedDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="bg-white p-2 min-h-[100px]" />
                }

                const dayJobs = getJobsForDay(day)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    onMouseEnter={(e) => handleDayHover(e, day, dayJobs)}
                    onMouseLeave={handleDayLeave}
                    className={cn(
                      'bg-white p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors',
                      isToday && 'bg-blue-50 hover:bg-blue-100'
                    )}
                  >
                    <div
                      className={cn(
                        'text-sm font-medium mb-1',
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayJobs.slice(0, 3).map((job) => {
                        const colorStyle = getJobColorStyle(job)
                        return (
                          <div
                            key={job.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/jobs?highlight=${job.id}`)
                            }}
                            className={cn(
                              'text-xs p-1 rounded truncate cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all',
                              !colorStyle && (job.completed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700')
                            )}
                            style={colorStyle}
                          >
                            {job.completed && <span className="opacity-60">✓ </span>}
                            {job.time && <span className="font-medium">{job.time} </span>}
                            {job.property.name}
                          </div>
                        )
                      })}
                      {dayJobs.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayJobs.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Hover Preview Tooltip - appears to the right */}
        {hoverPreview && (
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 min-w-[240px] max-w-[320px]"
            style={{
              left: `${Math.min(hoverPreview.x + 80, window.innerWidth - 340)}px`,
              top: `${Math.max(hoverPreview.y - 60, 20)}px`,
            }}
            onMouseEnter={() => {
              // Keep preview open when hovering over it
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current)
              }
            }}
            onMouseLeave={handleDayLeave}
          >
            <div className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              {format(hoverPreview.day, 'EEEE, MMMM d')}
            </div>
            <div className="space-y-2">
              {hoverPreview.jobs.map((job) => {
                const colorStyle = getJobColorStyle(job)
                return (
                  <div
                    key={job.id}
                    className={cn(
                      'p-3 rounded-lg text-sm cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md',
                      !colorStyle && (job.completed
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200')
                    )}
                    style={colorStyle ? { ...colorStyle, border: `1px solid ${job.property.color}40` } : undefined}
                    onClick={() => router.push(`/jobs?highlight=${job.id}`)}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {job.completed && <span className="text-green-600">✓</span>}
                      {job.property.name}
                    </div>
                    {job.time && (
                      <div className="text-xs opacity-75 mt-1">{job.time}</div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
              Click to view job details
            </div>
          </div>
        )}

        {/* Job Creation Modal */}
        <Modal
          isOpen={showJobModal}
          onClose={() => setShowJobModal(false)}
          title={`Add Job - ${selectedDate ? format(new Date(selectedDate + 'T12:00:00'), 'MMMM d, yyyy') : ''}`}
        >
          <div className="space-y-4">
            <Select
              label="Property"
              value={jobFormData.propertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              required
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>

            <Input
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />

            <Input
              label="Rate"
              type="number"
              value={jobFormData.rate}
              onChange={(e) => setJobFormData({ ...jobFormData, rate: e.target.value })}
              placeholder="Leave blank for property default"
            />

            <Input
              label="Expense %"
              type="number"
              value={jobFormData.expensePercent}
              onChange={(e) => setJobFormData({ ...jobFormData, expensePercent: e.target.value })}
            />

            {teamMembers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Team Members
                </label>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleTeamMember(member.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-colors',
                        jobFormData.teamMemberIds.includes(member.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowJobModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveJob}
                isLoading={isSavingJob}
              >
                Create Job
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
