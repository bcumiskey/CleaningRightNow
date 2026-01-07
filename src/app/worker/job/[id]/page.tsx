'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Navigation,
  Phone,
  Users,
  AlertTriangle,
  Camera,
  StickyNote,
  CheckCircle,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface JobDetail {
  id: string
  date: string
  time?: string
  completed: boolean
  property: {
    id: string
    name: string
    address: string
    ownerName: string
    ownerPhone?: string
    accessCodes?: string
  }
  assignments: Array<{
    teamMember: {
      id: string
      name: string
      phone?: string
    }
  }>
  activeNotes: Array<{
    id: string
    type: string
    content: string
  }>
}

export default function WorkerJobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [job, setJob] = useState<JobDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchJob()
    }
  }, [params.id])

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/worker/jobs/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setJob(data)
      } else {
        toast.error('Job not found')
        router.push('/worker')
      }
    } catch (error) {
      console.error('Failed to fetch job:', error)
      toast.error('Failed to load job')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigate = () => {
    if (!job) return
    const encodedAddress = encodeURIComponent(job.property.address)
    window.open(`https://maps.google.com/maps?daddr=${encodedAddress}`, '_blank')
  }

  const handleCall = () => {
    if (!job?.property.ownerPhone) return
    window.location.href = `tel:${job.property.ownerPhone}`
  }

  const handleComplete = async () => {
    if (!job) return
    setIsCompleting(true)

    try {
      const response = await fetch(`/api/worker/jobs/${job.id}/complete`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Job marked as complete!')
        setJob({ ...job, completed: true })
      } else {
        toast.error('Failed to complete job')
      }
    } catch (error) {
      console.error('Failed to complete job:', error)
      toast.error('Failed to complete job')
    } finally {
      setIsCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!job) {
    return null
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">{job.property.name}</h1>
            <p className="text-sm text-gray-500">
              {format(new Date(job.date), 'EEEE, MMMM d')}
              {job.time && ` at ${formatTime(job.time)}`}
            </p>
          </div>
          {job.completed && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Done
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Address */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-900">{job.property.address}</p>
              {job.property.accessCodes && (
                <p className="text-sm text-indigo-600 mt-1 font-medium">
                  Access: {job.property.accessCodes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleNavigate}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 px-4 font-medium hover:bg-indigo-700 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            Navigate
          </button>
          <button
            onClick={handleCall}
            disabled={!job.property.ownerPhone}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-xl py-3 px-4 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Phone className="w-5 h-5" />
            Call Owner
          </button>
        </div>

        {/* Working With */}
        {job.assignments.length > 1 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 mb-3">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Working With</span>
            </div>
            <div className="space-y-2">
              {job.assignments.map((assignment) => (
                <div
                  key={assignment.teamMember.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-gray-900">{assignment.teamMember.name}</span>
                  {assignment.teamMember.phone && (
                    <a
                      href={`tel:${assignment.teamMember.phone}`}
                      className="text-indigo-600 text-sm"
                    >
                      Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Notes Warning */}
        {job.activeNotes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Active Notes</span>
            </div>
            <div className="space-y-2">
              {job.activeNotes.map((note) => (
                <p key={note.id} className="text-sm text-amber-800">
                  • {note.content}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Reference Link */}
        <Link
          href={`/worker/reference/${job.property.id}`}
          className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Property Reference</p>
              <p className="text-sm text-gray-500">Stocking, photos, instructions</p>
            </div>
          </div>
          <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
        </Link>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Link
            href={`/worker/job/${job.id}/photos`}
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3 px-4 font-medium hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Take Photos
          </Link>
          <Link
            href={`/worker/job/${job.id}/note`}
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3 px-4 font-medium hover:bg-gray-50 transition-colors"
          >
            <StickyNote className="w-5 h-5" />
            Add Note
          </Link>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      {!job.completed && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={handleComplete}
              isLoading={isCompleting}
              className="w-full py-3 text-lg"
            >
              <CheckCircle className="w-5 h-5" />
              Mark Complete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
