'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Printer, Calendar, DollarSign, CheckCircle } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PayStatementTemplate from '@/components/documents/PayStatementTemplate'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
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

export default function WorkerPayPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showStatement, setShowStatement] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id, currentMonth])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)

      const [earningsRes, settingsRes] = await Promise.all([
        fetch(
          `/api/worker/earnings?workerId=${id}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`
        ),
        fetch('/api/settings'),
      ])

      if (earningsRes.ok) {
        const data = await earningsRes.json()
        setEarningsData(data)
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        setCompany(settings)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllPaid = async () => {
    if (!earningsData) return

    const pendingEarnings = earningsData.earnings.filter((e) => e.status === 'pending')
    if (pendingEarnings.length === 0) {
      toast.error('No pending payments to mark as paid')
      return
    }

    setIsMarkingPaid(true)
    try {
      const res = await fetch('/api/team/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentIds: pendingEarnings.map((e) => e.id),
        }),
      })

      if (res.ok) {
        toast.success(`Marked ${pendingEarnings.length} payments as paid`)
        loadData()
      } else {
        toast.error('Failed to mark payments as paid')
      }
    } catch (error) {
      toast.error('Failed to mark payments as paid')
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handlePrint = () => {
    setShowStatement(true)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (showStatement && earningsData && company) {
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
      earnings: earningsData.earnings,
      summary: earningsData.summary,
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="print:hidden bg-white border-b px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowStatement(false)}>
            <ArrowLeft size={18} />
            Back to Summary
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </Button>
        </div>

        <div className="p-6 print:p-0">
          <div className="bg-white shadow-lg rounded-lg print:shadow-none print:rounded-none">
            <PayStatementTemplate statement={statement} company={company} />
          </div>
        </div>

        <style jsx global>{`
          @media print {
            .print\\:hidden { display: none !important; }
            .print\\:p-0 { padding: 0 !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:rounded-none { border-radius: 0 !important; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title={earningsData?.worker.name || 'Worker Pay'} />

      <div className="p-6">
        <Button variant="outline" onClick={() => router.push('/team')} className="mb-6">
          <ArrowLeft size={16} />
          Back to Team
        </Button>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : earningsData ? (
          <div className="space-y-6">
            {/* Month Selector */}
            <Card>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">Pay Period</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    ←
                  </Button>
                  <span className="font-semibold text-gray-900 min-w-[140px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    disabled={currentMonth >= new Date()}
                  >
                    →
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent>
                  <p className="text-sm text-gray-500">Jobs Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {earningsData.summary.totalJobs}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-gray-500">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(earningsData.summary.totalGrossEarnings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-green-600">Paid</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(earningsData.summary.totalPaid)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-yellow-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {formatCurrency(earningsData.summary.totalPending)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={20} className="text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Earnings Detail</h3>
                  </div>
                  <div className="flex gap-2">
                    {earningsData.summary.totalPending > 0 && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleMarkAllPaid}
                        isLoading={isMarkingPaid}
                      >
                        <CheckCircle size={16} />
                        Mark All Paid
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer size={16} />
                      Print Statement
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {earningsData.earnings.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No completed jobs this month
                  </p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm text-gray-500">
                        <th className="text-left py-3">Date</th>
                        <th className="text-left py-3">Property</th>
                        <th className="text-right py-3">Job Rate</th>
                        <th className="text-center py-3">Split</th>
                        <th className="text-right py-3">Share</th>
                        <th className="text-center py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsData.earnings.map((earning) => (
                        <tr key={earning.id} className="border-b">
                          <td className="py-3 text-gray-600">
                            {format(new Date(earning.date), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 font-medium text-gray-900">
                            {earning.propertyName}
                          </td>
                          <td className="py-3 text-gray-600 text-right">
                            {formatCurrency(earning.jobRate)}
                          </td>
                          <td className="py-3 text-gray-500 text-center">
                            1/{earning.workerCount}
                          </td>
                          <td className="py-3 font-medium text-gray-900 text-right">
                            {formatCurrency(earning.workerShare)}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                earning.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {earning.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td colSpan={4} className="py-3 text-gray-900">
                          Total
                        </td>
                        <td className="py-3 text-right text-gray-900">
                          {formatCurrency(earningsData.summary.totalGrossEarnings)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Worker not found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
