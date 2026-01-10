'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Printer, Send, CheckCircle, Download, Mail, Pencil, Trash2, Loader2, X, DollarSign } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import InvoiceTemplate from '@/components/documents/InvoiceTemplate'
import toast from 'react-hot-toast'

const PAYMENT_METHODS = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

interface LineItem {
  id: string
  date?: string | null
  description: string
  amount: number
  itemType: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  paymentTerms: string
  type: string
  billingPeriod?: string | null
  subtotal: number
  discount: number
  total: number
  status: string
  notes?: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  paymentNotes?: string | null
  paidAt?: string | null
  lineItems: LineItem[]
  property: {
    id: string
    name: string
    address: string
    ownerName: string
    ownerEmail?: string | null
    ownerPhone?: string | null
  }
}

interface CompanySettings {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logoUrl?: string | null
  invoiceFooter?: string | null
  invoiceTerms?: string | null
}

export default function InvoiceViewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [invoiceRes, settingsRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch('/api/settings'),
      ])

      if (invoiceRes.ok) {
        const invoiceData = await invoiceRes.json()
        setInvoice(invoiceData)
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setCompany(settingsData)
      }
    } catch (error) {
      console.error('Failed to load invoice:', error)
      toast.error('Failed to load invoice')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleDownloadPDF = useCallback(async () => {
    if (!invoice || isDownloading) return

    setIsDownloading(true)
    const toastId = toast.loading('Generating PDF...')

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`)
      if (!res.ok) throw new Error('Failed to generate PDF')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF downloaded', { id: toastId })
    } catch (error) {
      toast.error('Failed to download PDF', { id: toastId })
    } finally {
      setIsDownloading(false)
    }
  }, [invoice, isDownloading])

  const handleSendEmail = async () => {
    if (!invoice) return

    if (!invoice.property?.ownerEmail) {
      toast.error('Property owner has no email address')
      return
    }

    setIsSending(true)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send')
      }

      setInvoice({ ...invoice, status: 'sent' })
      toast.success(`Invoice sent to ${invoice.property?.ownerEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice')
    } finally {
      setIsSending(false)
    }
  }

  const handleMarkSent = async () => {
    if (!invoice) return
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      })

      if (res.ok) {
        setInvoice({ ...invoice, status: 'sent' })
        toast.success('Invoice marked as sent')
      }
    } catch (error) {
      toast.error('Failed to update invoice')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleOpenPaymentDialog = () => {
    setPaymentMethod('')
    setPaymentReference('')
    setPaymentNotes('')
    setShowPaymentDialog(true)
  }

  const handleSubmitPayment = async () => {
    if (!invoice) return
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paymentMethod: paymentMethod || null,
          paymentReference: paymentReference || null,
          paymentNotes: paymentNotes || null,
        }),
      })

      if (res.ok) {
        const updatedInvoice = await res.json()
        setInvoice(updatedInvoice)
        setShowPaymentDialog(false)
        toast.success('Payment recorded successfully')
      }
    } catch (error) {
      toast.error('Failed to record payment')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice) return
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return

    setIsDeleting(true)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Invoice deleted')
        router.push('/invoices')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete invoice')
      }
    } catch (error) {
      toast.error('Failed to delete invoice')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Invoice" />
        <div className="p-6 flex justify-center">
          <div className="animate-pulse text-gray-500">Loading invoice...</div>
        </div>
      </div>
    )
  }

  if (!invoice || !company) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Invoice" />
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Invoice not found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/invoices')}
              >
                <ArrowLeft size={16} />
                Back to Invoices
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 print:bg-white print:min-h-0">
        {/* Print-hidden header and actions */}
        <div className="print:hidden">
          <AdminHeader title={`Invoice ${invoice.invoiceNumber}`} />

          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <Button variant="outline" onClick={() => router.push('/invoices')}>
                <ArrowLeft size={16} />
                Back to Invoices
              </Button>

              <div className="flex gap-2">
                {/* Edit - only for draft invoices */}
                {invoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                  >
                    <Pencil size={16} />
                    Edit
                  </Button>
                )}

                {/* Send Email - only for draft with owner email */}
                {invoice.status === 'draft' && invoice.property?.ownerEmail && (
                  <Button
                    variant="primary"
                    onClick={handleSendEmail}
                    isLoading={isSending}
                  >
                    <Mail size={16} />
                    Send Email
                  </Button>
                )}

                {/* Mark as Sent - only for draft without owner email */}
                {invoice.status === 'draft' && !invoice.property?.ownerEmail && (
                  <Button
                    variant="outline"
                    onClick={handleMarkSent}
                    isLoading={isUpdating}
                  >
                    <Send size={16} />
                    Mark as Sent
                  </Button>
                )}

                {/* Mark as Paid - only for sent invoices */}
                {invoice.status === 'sent' && (
                  <Button
                    variant="success"
                    onClick={handleOpenPaymentDialog}
                  >
                    <DollarSign size={16} />
                    Record Payment
                  </Button>
                )}

                {/* PDF Download */}
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      PDF
                    </>
                  )}
                </Button>

                {/* Print */}
                <Button variant="outline" onClick={handlePrint}>
                  <Printer size={16} />
                  Print
                </Button>

                {/* Delete - only for draft invoices */}
                {invoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    isLoading={isDeleting}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 size={16} />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Template - visible in print */}
        <div className="p-6 print:p-0 overflow-x-auto">
          <InvoiceTemplate
            invoice={invoice}
            company={company}
            showWatermark={false}
          />
        </div>

        {/* Payment info display for paid invoices */}
        {invoice.status === 'paid' && (invoice.paymentMethod || invoice.paymentReference) && (
          <div className="px-6 pb-6 print:hidden">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  Payment Recorded
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {invoice.paymentMethod && (
                    <p><span className="font-medium">Method:</span> {PAYMENT_METHODS.find(m => m.value === invoice.paymentMethod)?.label || invoice.paymentMethod}</p>
                  )}
                  {invoice.paymentReference && (
                    <p><span className="font-medium">Reference:</span> {invoice.paymentReference}</p>
                  )}
                  {invoice.paymentNotes && (
                    <p><span className="font-medium">Notes:</span> {invoice.paymentNotes}</p>
                  )}
                  {invoice.paidAt && (
                    <p><span className="font-medium">Paid:</span> {new Date(invoice.paidAt).toLocaleDateString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Invoice</p>
                <p className="font-medium">{invoice.invoiceNumber}</p>
                <p className="text-lg font-bold text-green-600">${invoice.total.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        paymentMethod === method.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference (optional)
                </label>
                <Input
                  placeholder="Check #, confirmation code, etc."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Any additional notes about this payment"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                className="flex-1"
                onClick={handleSubmitPayment}
                isLoading={isUpdating}
              >
                <CheckCircle size={16} />
                Record Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print styles - comprehensive to ensure only invoice prints */}
      <style jsx global>{`
        @media print {
          /* Reset everything */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }

          /* Hide everything by default */
          body > * {
            display: none !important;
          }

          /* Show only the main content */
          body > #__next,
          body > div[data-nextjs-scroll-focus-boundary] {
            display: block !important;
          }

          /* Hide non-printable elements */
          .print\\:hidden,
          header,
          nav,
          aside,
          footer:not(#invoice-template footer),
          [role="navigation"],
          [role="banner"],
          .Toaster {
            display: none !important;
          }

          /* Invoice container styling */
          #invoice-template {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* Page setup */
          @page {
            size: letter;
            margin: 0.5in;
          }

          /* Ensure backgrounds print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Table header background */
          .bg-gray-800 {
            background-color: #1f2937 !important;
            color: white !important;
          }

          /* Alternating row colors */
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }
        }
      `}</style>
    </>
  )
}
