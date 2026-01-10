'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Send, CheckCircle, Clock, DollarSign, Building, RefreshCw } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ReadyProperty {
  propertyId: string
  propertyName: string
  ownerName: string
  billingDay: number
  unbilledJobs: number
  unbilledAmount: number
}

interface DraftInvoice {
  invoiceId: string
  invoiceNumber: string
  propertyName: string
  amount: number
  createdAt: string
}

interface BillingData {
  currentMonth: string
  readyToInvoice: ReadyProperty[]
  draftInvoices: DraftInvoice[]
  summary: {
    readyCount: number
    readyAmount: number
    draftCount: number
    sentCount: number
    sentAmount: number
    paidCount: number
    paidAmount: number
  }
}

export default function MonthlyBillingPage() {
  const router = useRouter()
  const [data, setData] = useState<BillingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/invoices/monthly-billing')
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load billing data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateInvoice = async (propertyId: string) => {
    setIsGenerating(propertyId)
    try {
      // Navigate to create invoice for this property
      router.push(`/invoices/new?propertyId=${propertyId}`)
    } catch (error) {
      toast.error('Failed to navigate')
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Monthly Billing" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/invoices')}>
              <ArrowLeft size={16} />
              Back to Invoices
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {data?.currentMonth || 'Monthly'} Billing
              </h2>
              <p className="text-sm text-gray-500">Generate invoices for monthly billing properties</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading billing data...</div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <FileText className="mx-auto text-blue-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{data.summary.readyCount}</p>
                  <p className="text-xs text-gray-500">Ready to Invoice</p>
                  <p className="text-sm font-medium text-blue-600">
                    {formatCurrency(data.summary.readyAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="mx-auto text-amber-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{data.summary.draftCount}</p>
                  <p className="text-xs text-gray-500">Drafts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Send className="mx-auto text-purple-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{data.summary.sentCount}</p>
                  <p className="text-xs text-gray-500">Sent</p>
                  <p className="text-sm font-medium text-purple-600">
                    {formatCurrency(data.summary.sentAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="mx-auto text-green-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{data.summary.paidCount}</p>
                  <p className="text-xs text-gray-500">Paid</p>
                  <p className="text-sm font-medium text-green-600">
                    {formatCurrency(data.summary.paidAmount)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ready to Invoice */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building size={20} />
                  Ready to Invoice ({data.readyToInvoice.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.readyToInvoice.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                    <p>All monthly properties have been invoiced!</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {data.readyToInvoice.map((prop) => (
                      <div
                        key={prop.propertyId}
                        className="py-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{prop.propertyName}</p>
                          <p className="text-sm text-gray-500">
                            {prop.ownerName} • {prop.unbilledJobs} job{prop.unbilledJobs !== 1 ? 's' : ''} • Bills on day {prop.billingDay}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg text-green-600">
                              {formatCurrency(prop.unbilledAmount)}
                            </p>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleGenerateInvoice(prop.propertyId)}
                            isLoading={isGenerating === prop.propertyId}
                          >
                            <FileText size={14} />
                            Create Invoice
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Draft Invoices */}
            {data.draftInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={20} />
                    Draft Invoices ({data.draftInvoices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {data.draftInvoices.map((inv) => (
                      <div
                        key={inv.invoiceId}
                        className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/invoices/${inv.invoiceId}`)}
                      >
                        <div>
                          <p className="font-medium">{inv.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">{inv.propertyName}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold">{formatCurrency(inv.amount)}</p>
                          <Badge variant="default">Draft</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help Text */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-medium text-blue-900 mb-2">How Monthly Billing Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Properties set to "Monthly" billing appear here when they have completed jobs</li>
                  <li>• Click "Create Invoice" to generate an invoice with all unbilled jobs</li>
                  <li>• Review the draft invoice, then send it to the property owner</li>
                  <li>• The billing day setting on each property is for your reference</li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">Failed to load billing data</div>
        )}
      </div>
    </div>
  )
}
