'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to Jobs page - Recurring Schedules is now integrated there
export default function SchedulesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/jobs?tab=recurring')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting to Jobs...</p>
    </div>
  )
}
