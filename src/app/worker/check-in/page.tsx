'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Nfc, QrCode, Building, Clock, Users, Play, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface CheckInResult {
  success: boolean
  alreadyCheckedIn?: boolean
  session?: {
    id: string
    checkedInAt: string
    status: string
  }
  job?: {
    id: string
    date: string
    time: string | null
    property: {
      id: string
      name: string
      address: string
    }
    team?: { id: string; name: string; rank: number; canSupervise: boolean }[]
  }
  isSupervisor?: boolean
  supervisor?: { id: string; name: string }
  error?: string
  code?: string
}

export default function CheckInPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [nfcSupported, setNfcSupported] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [showQrInput, setShowQrInput] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Get team member ID from session
  const teamMemberId = (session?.user as { teamMemberId?: string })?.teamMemberId

  // Check for NFC support
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true)
    }
  }, [])

  // Check for token in URL (from QR code scan)
  useEffect(() => {
    const token = searchParams.get('token')
    if (token && teamMemberId) {
      handleCheckIn(token)
    }
  }, [searchParams, teamMemberId])

  const handleCheckIn = useCallback(async (token: string) => {
    if (!teamMemberId) {
      toast.error('Please log in to check in')
      return
    }

    setIsProcessing(true)
    try {
      // Get location if available
      let location: string | undefined
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          location = `${pos.coords.latitude},${pos.coords.longitude}`
        } catch {
          // Location not available, continue without it
        }
      }

      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          teamMemberId,
          method: 'qr', // or 'nfc' if from NFC
          location,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCheckInResult(data)
        if (data.alreadyCheckedIn) {
          toast.success('You are already checked in!')
          // Redirect to job page
          router.push(`/worker/job/${data.job?.id}`)
        } else {
          setShowConfirmModal(true)
        }
      } else {
        setCheckInResult({ success: false, error: data.error, code: data.code })
        toast.error(data.error || 'Check-in failed')
      }
    } catch (error) {
      toast.error('Failed to process check-in')
    } finally {
      setIsProcessing(false)
    }
  }, [teamMemberId, router])

  const startNfcScan = async () => {
    if (!nfcSupported) {
      toast.error('NFC is not supported on this device')
      return
    }

    setIsScanning(true)
    try {
      // Web NFC API - only available on Chrome Android
      const NDEFReader = (window as unknown as { NDEFReader: new () => {
        scan: () => Promise<void>
        addEventListener: (event: string, handler: (event: { message: { records: { data: ArrayBuffer }[] } }) => void) => void
      } }).NDEFReader
      const ndef = new NDEFReader()
      await ndef.scan()

      ndef.addEventListener('reading', ({ message }) => {
        // Parse NFC tag data
        for (const record of message.records) {
          const decoder = new TextDecoder()
          const token = decoder.decode(record.data)
          if (token) {
            setIsScanning(false)
            handleCheckIn(token)
            return
          }
        }
      })

      toast.success('Hold your phone near the NFC tag')
    } catch (error) {
      setIsScanning(false)
      toast.error('Failed to start NFC scan. Please try QR code instead.')
    }
  }

  const stopNfcScan = () => {
    setIsScanning(false)
    // NFC scan will stop when component unmounts
  }

  const handleManualToken = () => {
    if (!tokenInput.trim()) {
      toast.error('Please enter a token')
      return
    }
    handleCheckIn(tokenInput.trim())
  }

  const confirmCheckIn = () => {
    if (checkInResult?.job) {
      toast.success(`Checked in at ${checkInResult.job.property.name}!`)
      router.push(`/worker/job/${checkInResult.job.id}`)
    }
    setShowConfirmModal(false)
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Check In</h1>
        <p className="text-gray-500 mt-1">Scan the property tag to start your job</p>
      </div>

      {/* NFC Scan Button */}
      {nfcSupported && (
        <Card className={isScanning ? 'ring-2 ring-blue-500' : ''}>
          <CardContent className="text-center py-8">
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 ${
              isScanning ? 'bg-blue-100 animate-pulse' : 'bg-gray-100'
            }`}>
              <Nfc size={48} className={isScanning ? 'text-blue-600' : 'text-gray-400'} />
            </div>
            {isScanning ? (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">Scanning...</p>
                <p className="text-gray-500 mb-4">Hold your phone near the NFC tag</p>
                <Button variant="outline" onClick={stopNfcScan}>
                  <X size={16} />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">Tap NFC Tag</p>
                <p className="text-gray-500 mb-4">Use the NFC tag at the property</p>
                <Button onClick={startNfcScan}>
                  <Nfc size={16} />
                  Start NFC Scan
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Code Alternative */}
      <Card>
        <CardContent className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-4">
            <QrCode size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">
            {nfcSupported ? "Or use QR code instead" : "Scan the property QR code"}
          </p>
          {!showQrInput ? (
            <Button variant="outline" onClick={() => setShowQrInput(true)}>
              <QrCode size={16} />
              Enter Code Manually
            </Button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter check-in code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowQrInput(false)
                    setTokenInput('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleManualToken}
                  isLoading={isProcessing}
                >
                  Check In
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500 space-y-2">
        <p>Look for the NFC tag or QR code at the property entrance.</p>
        <p>Contact your supervisor if you cannot find the check-in tag.</p>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Start Job"
        size="md"
      >
        {checkInResult?.job && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                <Building size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {checkInResult.job.property.name}
              </h3>
              <p className="text-gray-500">{checkInResult.job.property.address}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} />
                <span>{checkInResult.job.time || 'No time scheduled'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={16} />
                <span>
                  {checkInResult.job.team?.length || 1} team member{(checkInResult.job.team?.length || 1) !== 1 && 's'} assigned
                </span>
              </div>
              {checkInResult.isSupervisor && (
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <CheckCircle size={16} />
                  <span>You are the supervisor for this job</span>
                </div>
              )}
            </div>

            <p className="text-center text-gray-600">
              Ready to start working at this property?
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmModal(false)}
              >
                Not Yet
              </Button>
              <Button
                className="flex-1"
                onClick={confirmCheckIn}
              >
                <Play size={16} />
                Start Job
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Error State */}
      {checkInResult?.error && !showConfirmModal && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-red-700">{checkInResult.error}</p>
              {checkInResult.code === 'NO_JOB_TODAY' && (
                <p className="text-sm text-red-600 mt-1">
                  You might be at the wrong property or you&apos;re not scheduled today.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
