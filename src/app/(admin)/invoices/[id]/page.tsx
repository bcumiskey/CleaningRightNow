'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Printer, Send, CheckCircle, Download, Mail, Pencil, XCircle, AlertTriangle } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import InvoiceTemplate from '@/components/documents/InvoiceTemplate'
import toast from 'react-hot-toast'

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
  voidedAt?: string | null
  voidReason?: string | null
  replacedByInvoiceId?: string | null
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
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [createReplacement, setCreateReplacement] = useState(true)
  const [isVoiding, setIsVoiding] = useState(false)

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

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    setIsDownloading(true)

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
      toast.success('PDF downloaded')
    } catch (error) {
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

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
        body: JSON.stringify({ ...invoice, status: 'sent' }),
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

  const handleMarkPaid = async () => {
    if (!invoice) return
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...invoice, status: 'paid' }),
      })

      if (res.ok) {
        setInvoice({ ...invoice, status: 'paid' })
        toast.success('Invoice marked as paid')
      }
    } catch (error) {
      toast.error('Failed to update invoice')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleVoid = async () => {
    if (!invoice) return
    setIsVoiding(true)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: voidReason || 'No reason provided',
          createReplacement,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Invoice voided successfully')
        setShowVoidModal(false)

        if (data.replacementInvoice) {
          // Redirect to the new draft invoice for editing
          router.push(`/invoices/${data.replacementInvoice.id}/edit`)
        } else {
          router.push('/invoices')
        }
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Failed to void invoice')
      }
    } catch (error) {
      toast.error('Failed to void invoice')
    } finally {
      setIsVoiding(false)
    }
  }

  const isLocked = ['sent', 'paid', 'void'].includes(invoice?.status || '')

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
    <div className="min-h-screen bg-gray-100">
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
                  onClick={handleMarkPaid}
                  isLoading={isUpdating}
                >
                  <CheckCircle size={16} />
                  Mark as Paid
                </Button>
              )}

              {/* Void - for sent or paid invoices */}
              {(invoice.status === 'sent' || invoice.status === 'paid') && (
                <Button
                  variant="outline"
                  onClick={() => setShowVoidModal(true)}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <XCircle size={16} />
                  Void
                </Button>
              )}

              {/* PDF and Print - always available except for void */}
              {invoice.status !== 'void' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    isLoading={isDownloading}
                  >
                    <Download size={16} />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer size={16} />
                    Print
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Void Banner */}
      {invoice.status === 'void' && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg print:hidden">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-800">This invoice has been voided</h3>
              {invoice.voidReason && (
                <p className="text-sm text-red-600 mt-1">Reason: {invoice.voidReason}</p>
              )}
              {invoice.replacedByInvoiceId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push(`/invoices/${invoice.replacedByInvoiceId}`)}
                >
                  View Replacement Invoice
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Template - visible in print */}
      <div className="p-6 print:p-0">
        <div className="bg-white shadow-lg rounded-lg print:shadow-none print:rounded-none">
          <InvoiceTemplate
            invoice={invoice}
            company={company}
            showWatermark={false}
          />
        </div>
      </div>

      {/* Void Invoice Modal */}
      <Modal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        title="Void Invoice"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">This action cannot be undone.</p>
                <p className="mt-1">
                  Voiding an invoice creates a permanent record and prevents any future edits.
                  This is the proper accounting practice for correcting sent invoices.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for voiding
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="e.g., Incorrect amount, duplicate invoice, cancelled service..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createReplacement"
              checked={createReplacement}
              onChange={(e) => setCreateReplacement(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="createReplacement" className="text-sm text-gray-700">
              Create a replacement draft invoice (recommended)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowVoidModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleVoid}
              isLoading={isVoiding}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle size={16} />
              Void Invoice
            </Button>
          </div>
        </div>
      </Modal>

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
