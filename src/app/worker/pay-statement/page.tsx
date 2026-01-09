'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import Button from '@/components/ui/Button'
import PayStatementTemplate from '@/components/documents/PayStatementTemplate'
import { format, startOfMonth, endOfMonth, parse } from 'date-fns'
import toast from 'react-hot-toast'

interface Earning {
  id: string
  date: string
  propertyName: string
  jobRate: number
  expensePercent: number
  workerCount: number
  workerShare: number
  status: 'paid' | 'pending'
  paidAt: string | null
}

interface Worker {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface EarningsData {
  worker: Worker
  payPeriod: {
    start: string
    end: string
  }
  earnings: Earning[]
  summary: {
    totalJobs: number
    totalGrossEarnings: number
    totalPaid: number
    totalPending: number
  }
}

interface CompanySettings {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
}

function PayStatementContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const monthParam = searchParams.get('month')
  const currentMonth = monthParam
    ? parse(monthParam, 'yyyy-MM', new Date())
    : new Date()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)

      const [earningsRes, settingsRes] = await Promise.all([
        fetch(`/api/worker/earnings?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        fetch('/api/settings'),
      ])

      if (earningsRes.ok) {
        const data = await earningsRes.json()
        setEarningsData(data)
      } else {
        toast.error('Failed to load pay statement')
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        setCompany(settings)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load pay statement')
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading pay statement...</div>
      </div>
    )
  }

  if (!earningsData || !company) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">Unable to load pay statement</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft size={16} />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // Transform data for template
  const statement = {
    statementId: `PAY-${format(currentMonth, 'yyyyMM')}-${earningsData.worker.id.slice(-4).toUpperCase()}`,
    statementDate: new Date(),
    payPeriod: {
      start: earningsData.payPeriod.start,
      end: earningsData.payPeriod.end,
    },
    worker: {
      name: earningsData.worker.name,
      email: earningsData.worker.email,
      phone: earningsData.worker.phone,
    },
    earnings: earningsData.earnings.map((e) => ({
      id: e.id,
      date: e.date,
      propertyName: e.propertyName,
      jobRate: e.jobRate,
      expensePercent: e.expensePercent,
      workerCount: e.workerCount,
      workerShare: e.workerShare,
      status: e.status as 'paid' | 'pending',
      paidAt: e.paidAt,
    })),
    summary: earningsData.summary,
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - hidden in print */}
      <div className="print:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <h1 className="font-semibold text-gray-900">
          Pay Statement - {format(currentMonth, 'MMMM yyyy')}
        </h1>
        <Button variant="outline" onClick={handlePrint}>
          <Printer size={16} />
          Print
        </Button>
      </div>

      {/* Pay Statement */}
      <div className="p-4 print:p-0">
        <div className="bg-white shadow-lg rounded-lg print:shadow-none print:rounded-none">
          <PayStatementTemplate statement={statement} company={company} />
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function WorkerPayStatementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <PayStatementContent />
    </Suspense>
  )
}
