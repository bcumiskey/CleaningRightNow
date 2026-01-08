'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Printer, Send, CheckCircle, Download, Mail, Pencil, Trash2 } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
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

  const handleMarkPaid = async () => {
    if (!invoice) return
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
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

              {/* PDF and Print */}
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
      <div className="p-6 print:p-0">
        <div className="bg-white shadow-lg rounded-lg print:shadow-none print:rounded-none">
          <InvoiceTemplate
            invoice={invoice}
            company={company}
            showWatermark={false}
          />
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
