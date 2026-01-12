'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Building,
  Clock,
  Users,
  CheckCircle,
  Play,
  Square,
  Camera,
  AlertCircle,
  Sparkles,
  Navigation,
  Shield,
  UserX,
  Star,
  MapPin,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { format, isToday, parseISO, addDays, isBefore, startOfDay, isAfter } from 'date-fns'
import { parseLocalDate } from '@/lib/utils'
import toast from 'react-hot-toast'

// Feature flag for supervisor mode - set to true when ready to enable
const SUPERVISOR_MODE_ENABLED = false

interface TeamAssignment {
  id: string
  teamMember: {
    id: string
    name: string
    rank?: number
    canSupervise?: boolean
  }
}

interface JobSession {
  id: string
  teamMemberId: string
  status: string
  checkedInAt: string | null
  checkedOutAt: string | null
  isAbsent: boolean
  notes: string | null
  teamMember: {
    id: string
    name: string
  }
}

interface JobDetail {
  id: string
  date: string
  time: string | null
  completed: boolean
  completedAt: string | null
  rate: number
  property: {
    id: string
    name: string
    address: string
    imageUrl?: string | null
  }
  assignments: TeamAssignment[]
  sessions?: JobSession[]
}

export default function WorkerJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: sessionData } = useSession()
  const jobId = params.id as string

  const [job, setJob] = useState<JobDetail | null>(null)
  const [mySession, setMySession] = useState<JobSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasBlockingJob, setHasBlockingJob] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showLateStartModal, setShowLateStartModal] = useState(false)
  const [showLateStartConfirm2, setShowLateStartConfirm2] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showAbsentModal, setShowAbsentModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedMemberForRating, setSelectedMemberForRating] = useState<JobSession | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Rating form state
  const [ratingQuality, setRatingQuality] = useState(5)
  const [ratingSpeed, setRatingSpeed] = useState(5)
  const [ratingAttitude, setRatingAttitude] = useState(5)
  const [ratingFeedback, setRatingFeedback] = useState('')

  // Absent form state
  const [absentMemberId, setAbsentMemberId] = useState<string | null>(null)
  const [absentReason, setAbsentReason] = useState('')

  const teamMemberId = (sessionData?.user as { teamMemberId?: string })?.teamMemberId

  const fetchJob = useCallback(async () => {
    try {
      const [jobRes, sessionsRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}`),
        fetch(`/api/job-sessions?jobId=${jobId}`),
      ])

      if (jobRes.ok) {
        const jobData = await jobRes.json()

        if (sessionsRes.ok) {
          const sessions = await sessionsRes.json()
          jobData.sessions = sessions
        }

        setJob(jobData)

        // Find my session
        if (teamMemberId && jobData.sessions) {
          const mySessionData = jobData.sessions.find(
            (s: JobSession) => s.teamMemberId === teamMemberId
          )
          setMySession(mySessionData || null)
        }

        // Check for blocking jobs at the same property between now and job date
        const jobDate = parseISO(jobData.date)
        const today = startOfDay(new Date())

        if (isAfter(jobDate, today)) {
          // Job is in the future, check for blocking jobs
          const blockingRes = await fetch(
            `/api/worker/jobs?propertyId=${jobData.property.id}&startDate=${format(today, 'yyyy-MM-dd')}&endDate=${format(jobDate, 'yyyy-MM-dd')}`
          )
          if (blockingRes.ok) {
            const blockingJobs = await blockingRes.json()
            // Filter out the current job and check if any remain
            const hasBlocker = blockingJobs.some((j: { id: string }) => j.id !== jobId)
            setHasBlockingJob(hasBlocker)
          }
        } else {
          setHasBlockingJob(false)
        }
      }
    } catch (error) {
      console.error('Failed to fetch job:', error)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, teamMemberId])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  // Check if current user is supervisor for this job
  // Note: Supervisor mode is currently disabled via feature flag
  const isSupervisor = (() => {
    if (!SUPERVISOR_MODE_ENABLED) return false
    if (!teamMemberId || !job?.assignments) return false

    const myAssignment = job.assignments.find(a => a.teamMember.id === teamMemberId)
    if (!myAssignment) return false

    // Supervisor is the highest ranked person who can supervise
    const supervisors = job.assignments
      .filter(a => a.teamMember.canSupervise)
      .sort((a, b) => (b.teamMember.rank ?? 0) - (a.teamMember.rank ?? 0))

    if (supervisors.length > 0 && supervisors[0].teamMember.id === teamMemberId) {
      return true
    }

    // If no one can supervise, highest rank is supervisor
    const highestRank = job.assignments
      .sort((a, b) => (b.teamMember.rank ?? 0) - (a.teamMember.rank ?? 0))

    return highestRank.length > 0 && highestRank[0].teamMember.id === teamMemberId
  })()

  const handleStartJob = async (method: 'manual' | 'nfc' | 'qr' = 'manual') => {
    if (!teamMemberId) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/job-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          teamMemberIds: [teamMemberId],
        }),
      })

      if (response.ok) {
        // Now check in with the specified method
        const sessions = await response.json()
        if (sessions[0]) {
          await fetch(`/api/job-sessions/${sessions[0].id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'checked_in',
              checkedInAt: new Date().toISOString(),
              checkInMethod: method,
            }),
          })
        }
        toast.success("Let's do this! Job started.")
        setShowStartModal(false)
        fetchJob()
      }
    } catch (error) {
      toast.error('Failed to start job')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteJob = async () => {
    if (!mySession) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/job-sessions/${mySession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          checkedOutAt: new Date().toISOString(),
          notes: completionNotes || null,
        }),
      })

      if (response.ok) {
        toast.success('Job completed!')
        setShowCompleteModal(false)
        fetchJob()
      } else {
        toast.error('Failed to complete job')
      }
    } catch (error) {
      toast.error('Failed to complete job')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAbsent = async () => {
    if (!absentMemberId) return

    const sessionToMark = job?.sessions?.find(s => s.teamMemberId === absentMemberId)

    setIsSubmitting(true)
    try {
      if (sessionToMark) {
        // Update existing session
        await fetch(`/api/job-sessions/${sessionToMark.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAbsent: true,
            absentReason,
            markedAbsentBy: teamMemberId,
          }),
        })
      } else {
        // Create session and mark absent
        const createRes = await fetch('/api/job-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            teamMemberIds: [absentMemberId],
          }),
        })
        const sessions = await createRes.json()
        if (sessions[0]) {
          await fetch(`/api/job-sessions/${sessions[0].id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAbsent: true,
              absentReason,
              markedAbsentBy: teamMemberId,
            }),
          })
        }
      }

      toast.success('Team member marked as absent')
      setShowAbsentModal(false)
      setAbsentMemberId(null)
      setAbsentReason('')
      fetchJob()
    } catch (error) {
      toast.error('Failed to mark absent')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!selectedMemberForRating) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/job-sessions/${selectedMemberForRating.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratedById: teamMemberId,
          qualityRating: ratingQuality,
          speedRating: ratingSpeed,
          attitudeRating: ratingAttitude,
          feedback: ratingFeedback || null,
        }),
      })

      if (response.ok) {
        toast.success('Rating submitted!')
        setShowRatingModal(false)
        setSelectedMemberForRating(null)
        resetRatingForm()
        fetchJob()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit rating')
      }
    } catch (error) {
      toast.error('Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetRatingForm = () => {
    setRatingQuality(5)
    setRatingSpeed(5)
    setRatingAttitude(5)
    setRatingFeedback('')
  }

  const openRatingModal = (session: JobSession) => {
    setSelectedMemberForRating(session)
    resetRatingForm()
    setShowRatingModal(true)
  }

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>
  }

  if (!job) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={20} className="mr-2" /> Back
        </Button>
        <div className="text-center py-8 text-gray-500">Job not found</div>
      </div>
    )
  }

  const isCheckedIn = mySession?.status === 'checked_in'
  const isCompleted = mySession?.status === 'completed'

  return (
    <div className="pb-24">
      {/* Property Photo Header */}
      {job.property.imageUrl ? (
        <div className="relative h-48 -mt-4 -mx-4">
          <Image
            src={job.property.imageUrl}
            alt={job.property.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          {job.completed && (
            <div className="absolute top-4 right-4">
              <Badge variant="success" className="gap-1 bg-green-500/90 text-white">
                <CheckCircle size={14} />
                Completed
              </Badge>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h1 className="text-2xl font-bold drop-shadow-lg">{job.property.name}</h1>
            <div className="flex items-center gap-2 text-white/90 text-sm mt-1">
              <Clock size={14} />
              {format(parseLocalDate(job.date), 'EEEE, MMM d')}
              {job.time && ` at ${job.time}`}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-32 -mt-4 -mx-4 bg-gradient-to-br from-emerald-500 to-emerald-600">
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          {job.completed && (
            <div className="absolute top-4 right-4">
              <Badge variant="success" className="gap-1 bg-green-500/90 text-white">
                <CheckCircle size={14} />
                Completed
              </Badge>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h1 className="text-2xl font-bold">{job.property.name}</h1>
            <div className="flex items-center gap-2 text-white/90 text-sm mt-1">
              <Clock size={14} />
              {format(parseLocalDate(job.date), 'EEEE, MMM d')}
              {job.time && ` at ${job.time}`}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">

      {/* Status Card */}
      <Card className={isCheckedIn ? 'border-emerald-500 bg-emerald-50' : ''}>
        <CardContent className="text-center py-6">
          {isCompleted ? (
            <>
              <CheckCircle size={48} className="mx-auto text-green-600 mb-2" />
              <h2 className="text-xl font-semibold text-green-700">Job Completed</h2>
              {mySession?.checkedOutAt && (
                <p className="text-green-600">
                  Finished at {format(new Date(mySession.checkedOutAt), 'h:mm a')}
                </p>
              )}
            </>
          ) : isCheckedIn ? (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-2 animate-pulse">
                <Play size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-emerald-700">In Progress</h2>
              {mySession?.checkedInAt && (
                <p className="text-emerald-600">
                  Started at {format(new Date(mySession.checkedInAt), 'h:mm a')}
                </p>
              )}
            </>
          ) : (
            <>
              <Clock size={48} className="mx-auto text-gray-400 mb-2" />
              <h2 className="text-xl font-semibold text-gray-700">Not Started</h2>
              <p className="text-gray-500">Tap the button below to start this job</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Property Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building size={20} />
            Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href={`https://maps.google.com/maps?q=${encodeURIComponent(job.property.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <Navigation size={16} />
            {job.property.address}
          </a>
          <Link
            href={`/worker/reference/${job.property.id}`}
            className="mt-3 block"
          >
            <Button variant="outline" size="sm" className="w-full">
              View Property Details & Instructions
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Team ({job.assignments.length})
            {isSupervisor && (
              <Badge variant="warning" className="ml-2 gap-1">
                <Shield size={12} />
                You are supervising
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {job.assignments.map((assignment) => {
              const session = job.sessions?.find(s => s.teamMemberId === assignment.teamMember.id)
              const isAbsent = session?.isAbsent
              const hasCheckedIn = session?.checkedInAt
              const hasCompleted = session?.status === 'completed'

              return (
                <div
                  key={assignment.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isAbsent ? 'bg-red-50' : hasCompleted ? 'bg-green-50' : hasCheckedIn ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isAbsent ? 'bg-red-200' : hasCompleted ? 'bg-green-200' : hasCheckedIn ? 'bg-emerald-200' : 'bg-gray-200'
                    }`}>
                      {isAbsent ? (
                        <UserX size={20} className="text-red-600" />
                      ) : (
                        <span className="font-semibold text-gray-600">
                          {assignment.teamMember.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${isAbsent ? 'text-red-700 line-through' : ''}`}>
                        {assignment.teamMember.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isAbsent ? 'Absent' : hasCompleted ? 'Completed' : hasCheckedIn ? 'Working' : 'Not checked in'}
                      </p>
                    </div>
                  </div>

                  {/* Supervisor actions */}
                  {isSupervisor && assignment.teamMember.id !== teamMemberId && (
                    <div className="flex gap-2">
                      {!isAbsent && !hasCheckedIn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => {
                            setAbsentMemberId(assignment.teamMember.id)
                            setShowAbsentModal(true)
                          }}
                        >
                          <UserX size={14} />
                        </Button>
                      )}
                      {hasCompleted && session && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRatingModal(session)}
                        >
                          <Star size={14} />
                          Rate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Show for jobs that can be started */}
      {!isCompleted && job && (() => {
        const jobDate = startOfDay(parseISO(job.date))
        const today = startOfDay(new Date())
        const twoDaysAgo = addDays(today, -2)

        // Jobs can only start on scheduled day or UP TO 2 days LATE (not early!)
        const isScheduledDay = isToday(jobDate)
        const isLateStart = isBefore(jobDate, today) && !isBefore(jobDate, twoDaysAgo)
        const isTooLate = isBefore(jobDate, twoDaysAgo)
        const isFutureJob = isAfter(jobDate, today)
        const canStart = (isScheduledDay || isLateStart) && !hasBlockingJob

        if (canStart) {
          const handleStartClick = () => {
            if (isLateStart) {
              setShowLateStartModal(true)
            } else {
              setShowStartModal(true)
            }
          }

          return (
            <div className="fixed bottom-20 left-4 right-4 space-y-2">
              {!isCheckedIn ? (
                <Button size="lg" className="w-full" onClick={handleStartClick}>
                  <Play size={20} />
                  Start Job
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setShowCompleteModal(true)}
                >
                  <CheckCircle size={20} />
                  Complete Job
                </Button>
              )}
            </div>
          )
        }

        // Show appropriate message for jobs that can't be started yet
        if (hasBlockingJob) {
          return (
            <div className="fixed bottom-20 left-4 right-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-amber-700 text-sm font-medium">
                  There&apos;s another job at this property first
                </p>
                <p className="text-amber-600 text-xs mt-1">
                  Complete the earlier job before starting this one.
                </p>
              </div>
            </div>
          )
        }

        if (isFutureJob) {
          return (
            <div className="fixed bottom-20 left-4 right-4">
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-sm">
                  This job is scheduled for {format(jobDate, 'EEEE, MMMM d')}.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  You can start on the scheduled day.
                </p>
              </div>
            </div>
          )
        }

        if (isTooLate) {
          return (
            <div className="fixed bottom-20 left-4 right-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-700 text-sm font-medium">
                  This job was scheduled for {format(jobDate, 'EEEE, MMMM d')}.
                </p>
                <p className="text-red-600 text-xs mt-1">
                  Please contact your supervisor about this job.
                </p>
              </div>
            </div>
          )
        }

        return null
      })()}

      {/* Start Job Confirmation Modal (Day-of) */}
      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Ready to Start?"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <Play size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Let&apos;s knock this out!
            </h3>
            <p className="text-gray-600">
              Starting your shift at <span className="font-medium">{job?.property.name}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowStartModal(false)}
            >
              Not Yet
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleStartJob('manual')}
              isLoading={isSubmitting}
            >
              <Play size={16} />
              Start Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Late Start - First Confirmation Modal */}
      <Modal
        isOpen={showLateStartModal}
        onClose={() => setShowLateStartModal(false)}
        title="Running a Bit Behind?"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <Clock size={32} className="text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Why put off &apos;til tomorrow...
            </h3>
            <p className="text-gray-600">
              ...what you can do today?
            </p>
            <p className="text-gray-500 mt-3 text-sm">
              This was scheduled for{' '}
              <span className="font-medium text-amber-700">
                {job ? format(parseISO(job.date), 'EEEE') : ''}
              </span>. Better late than never!
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowLateStartModal(false)}
            >
              Hmm, Maybe Not
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowLateStartModal(false)
                setShowLateStartConfirm2(true)
              }}
            >
              Let&apos;s Do It
            </Button>
          </div>
        </div>
      </Modal>

      {/* Late Start - Second Confirmation Modal (playful) */}
      <Modal
        isOpen={showLateStartConfirm2}
        onClose={() => setShowLateStartConfirm2(false)}
        title="Just Checking..."
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              You sure about this?
            </h3>
            <p className="text-gray-600">
              No judgement here - life happens!
            </p>
            <p className="text-gray-500 mt-3 text-sm bg-gray-50 rounded-lg p-3">
              Just add a quick note when you&apos;re done so we know what&apos;s up.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowLateStartConfirm2(false)}
            >
              Go Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowLateStartConfirm2(false)
                handleStartJob('manual')
              }}
              isLoading={isSubmitting}
            >
              <Play size={16} />
              Start Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Job Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Nice Work!"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center pb-2">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-3">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <p className="text-gray-600">
              Before you wrap up, did you double-check everything?
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Any notes for the team? (optional)
            </label>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Anything to note for next time, special situations, or kudos..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Found damage or an issue? Use the Report tab to document it with photos.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCompleteModal(false)}
            >
              Go Back
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleCompleteJob}
              isLoading={isSubmitting}
            >
              <CheckCircle size={16} />
              All Done!
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mark Absent Modal */}
      <Modal
        isOpen={showAbsentModal}
        onClose={() => {
          setShowAbsentModal(false)
          setAbsentMemberId(null)
          setAbsentReason('')
        }}
        title="Mark Team Member Absent"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Mark this team member as absent for today&apos;s job.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <select
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a reason...</option>
              <option value="no_show">No Show</option>
              <option value="called_out">Called Out Sick</option>
              <option value="emergency">Emergency</option>
              <option value="transportation">Transportation Issue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowAbsentModal(false)
                setAbsentMemberId(null)
                setAbsentReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleMarkAbsent}
              isLoading={isSubmitting}
              disabled={!absentReason}
            >
              <UserX size={16} />
              Mark Absent
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rating Modal */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false)
          setSelectedMemberForRating(null)
          resetRatingForm()
        }}
        title={`Rate ${selectedMemberForRating?.teamMember.name}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Rate this team member&apos;s performance on this job.
          </p>

          {/* Quality Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality of Work
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRatingQuality(n)}
                  className="flex-1"
                >
                  <Star
                    size={24}
                    className={n <= ratingQuality ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Speed Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speed & Efficiency
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRatingSpeed(n)}
                  className="flex-1"
                >
                  <Star
                    size={24}
                    className={n <= ratingSpeed ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Attitude Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attitude & Professionalism
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRatingAttitude(n)}
                  className="flex-1"
                >
                  <Star
                    size={24}
                    className={n <= ratingAttitude ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback (optional)
            </label>
            <textarea
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              placeholder="Any specific feedback..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowRatingModal(false)
                setSelectedMemberForRating(null)
                resetRatingForm()
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmitRating}
              isLoading={isSubmitting}
            >
              <Star size={16} />
              Submit Rating
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  )
}
