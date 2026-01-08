import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: 'contain',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  invoiceTitle: {
    textAlign: 'right',
  },
  invoiceTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  billTo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  billToSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  clientDetail: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 2,
  },
  detailsTable: {
    marginLeft: 'auto',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 9,
    color: '#9ca3af',
    width: 80,
  },
  detailValue: {
    fontSize: 9,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colDate: { width: '20%' },
  colDescription: { width: '55%' },
  colAmount: { width: '25%', textAlign: 'right' },
  cellText: {
    fontSize: 9,
    color: '#1f2937',
  },
  totals: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  totalsBox: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#1f2937',
    marginTop: 8,
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  notes: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 4,
    marginBottom: 30,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
  },
})

interface LineItem {
  id: string
  date?: Date | string | null
  description: string
  amount: number
}

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: Date | string
  paymentTerms: string
  billingPeriod?: string | null
  subtotal: number
  discount: number
  total: number
  status: string
  notes?: string | null
  lineItems: LineItem[]
  property: {
    name: string
    address: string
    ownerName: string
    ownerEmail?: string | null
  }
}

interface CompanyData {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
  invoiceFooter?: string | null
  invoiceTerms?: string | null
}

interface InvoicePDFProps {
  invoice: InvoiceData
  company: CompanyData
}

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy')
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return { bg: '#dcfce7', text: '#166534' }
    case 'sent':
      return { bg: '#dbeafe', text: '#1e40af' }
    default:
      return { bg: '#f3f4f6', text: '#374151' }
  }
}

export default function InvoicePDF({ invoice, company }: InvoicePDFProps) {
  const statusColors = getStatusColor(invoice.status)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {company.logoUrl && (
              <Image src={company.logoUrl} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{company.companyName}</Text>
            {company.address && <Text style={styles.companyDetail}>{company.address}</Text>}
            {company.phone && <Text style={styles.companyDetail}>{company.phone}</Text>}
            {company.email && <Text style={styles.companyDetail}>{company.email}</Text>}
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceTitleText}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To & Details */}
        <View style={styles.billTo}>
          <View style={styles.billToSection}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{invoice.property.ownerName}</Text>
            <Text style={styles.clientDetail}>{invoice.property.name}</Text>
            <Text style={styles.clientDetail}>{invoice.property.address}</Text>
            {invoice.property.ownerEmail && (
              <Text style={styles.clientDetail}>{invoice.property.ownerEmail}</Text>
            )}
          </View>
          <View style={styles.detailsTable}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.invoiceDate)}</Text>
            </View>
            {invoice.billingPeriod && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Billing Period:</Text>
                <Text style={styles.detailValue}>{invoice.billingPeriod}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Terms:</Text>
              <Text style={styles.detailValue}>{invoice.paymentTerms}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View
              key={item.id}
              style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.cellText, styles.colDate]}>{formatDate(item.date)}</Text>
              <Text style={[styles.cellText, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount:</Text>
                <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                  -{formatCurrency(invoice.discount)}
                </Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Total Due:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {company.invoiceTerms && (
            <Text style={[styles.footerText, { marginBottom: 8 }]}>{company.invoiceTerms}</Text>
          )}
          <Text style={styles.footerText}>
            {company.invoiceFooter || 'Thank you for your business!'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
