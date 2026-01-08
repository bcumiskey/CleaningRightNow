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
  title: {
    textAlign: 'right',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 1,
  },
  statementId: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 4,
  },
  workerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  workerSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  workerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  workerDetail: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 2,
  },
  payPeriodText: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  summaryBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 4,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#047857',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemBorder: {
    borderLeftWidth: 2,
    borderLeftColor: '#a7f3d0',
    paddingLeft: 12,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#047857',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    marginTop: 2,
  },
  table: {
    marginBottom: 24,
  },
  tableTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4b5563',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colDate: { width: '15%' },
  colProperty: { width: '30%' },
  colRate: { width: '15%', textAlign: 'right' },
  colSplit: { width: '12%', textAlign: 'center' },
  colShare: { width: '15%', textAlign: 'right' },
  colStatus: { width: '13%', textAlign: 'center' },
  cellText: {
    fontSize: 8,
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  statusTextPaid: {
    color: '#166534',
  },
  statusTextPending: {
    color: '#92400e',
  },
  tableFooter: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f3f4f6',
    borderTopWidth: 2,
    borderTopColor: '#1f2937',
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  footerValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  explainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
  },
  explainerTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 6,
  },
  explainerText: {
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    alignItems: 'center',
  },
  footerThank: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  footerContact: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

interface JobEarning {
  id: string
  date: Date | string
  propertyName: string
  jobRate: number
  expensePercent: number
  workerCount: number
  workerShare: number
  status: 'pending' | 'paid'
}

interface PayStatement {
  statementId: string
  statementDate: Date | string
  payPeriod: {
    start: Date | string
    end: Date | string
  }
  worker: {
    name: string
    email?: string | null
    phone?: string | null
  }
  earnings: JobEarning[]
  summary: {
    totalJobs: number
    totalGrossEarnings: number
    totalPaid: number
    totalPending: number
  }
}

interface CompanyData {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
}

interface PayStatementPDFProps {
  statement: PayStatement
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

export default function PayStatementPDF({ statement, company }: PayStatementPDFProps) {
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
          <View style={styles.title}>
            <Text style={styles.titleText}>PAY STATEMENT</Text>
            <Text style={styles.statementId}>{statement.statementId}</Text>
            <Text style={[styles.statementId, { marginTop: 8 }]}>
              {formatDate(statement.statementDate)}
            </Text>
          </View>
        </View>

        {/* Worker Info & Pay Period */}
        <View style={styles.workerInfo}>
          <View style={styles.workerSection}>
            <Text style={styles.sectionLabel}>Team Member</Text>
            <Text style={styles.workerName}>{statement.worker.name}</Text>
            {statement.worker.email && (
              <Text style={styles.workerDetail}>{statement.worker.email}</Text>
            )}
            {statement.worker.phone && (
              <Text style={styles.workerDetail}>{statement.worker.phone}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.sectionLabel}>Pay Period</Text>
            <Text style={styles.payPeriodText}>
              {formatDate(statement.payPeriod.start)} - {formatDate(statement.payPeriod.end)}
            </Text>
          </View>
        </View>

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Earnings Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Jobs Completed</Text>
              <Text style={styles.summaryValue}>{statement.summary.totalJobs}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(statement.summary.totalGrossEarnings)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(statement.summary.totalPaid)}
              </Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryItemBorder]}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(statement.summary.totalPending)}
              </Text>
            </View>
          </View>
        </View>

        {/* Earnings Table */}
        <View style={styles.table}>
          <Text style={styles.tableTitle}>Earnings Detail</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
            <Text style={[styles.tableHeaderText, styles.colProperty]}>Property</Text>
            <Text style={[styles.tableHeaderText, styles.colRate]}>Job Rate</Text>
            <Text style={[styles.tableHeaderText, styles.colSplit]}>Split</Text>
            <Text style={[styles.tableHeaderText, styles.colShare]}>Your Share</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          </View>
          {statement.earnings.map((earning, index) => (
            <View
              key={earning.id}
              style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.cellText, styles.colDate]}>{formatDate(earning.date)}</Text>
              <Text style={[styles.cellText, styles.colProperty]}>{earning.propertyName}</Text>
              <Text style={[styles.cellText, styles.colRate]}>{formatCurrency(earning.jobRate)}</Text>
              <Text style={[styles.cellText, styles.colSplit]}>1/{earning.workerCount}</Text>
              <Text style={[styles.cellText, styles.colShare]}>{formatCurrency(earning.workerShare)}</Text>
              <View style={[
                styles.statusBadge,
                earning.status === 'paid' ? styles.statusPaid : styles.statusPending
              ]}>
                <Text style={[
                  styles.statusText,
                  earning.status === 'paid' ? styles.statusTextPaid : styles.statusTextPending
                ]}>
                  {earning.status === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.tableFooter}>
            <Text style={styles.footerLabel}>Total Earnings</Text>
            <Text style={styles.footerValue}>
              {formatCurrency(statement.summary.totalGrossEarnings)}
            </Text>
          </View>
        </View>

        {/* Explainer */}
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>How Your Pay is Calculated</Text>
          <Text style={styles.explainerText}>
            For each job, 12% of the job rate goes to business expenses. The remaining 88% is split
            equally among all workers assigned to that job. Your share for each job is shown in the
            {'"'}Your Share{'"'} column above.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerThank}>Thank you for your hard work!</Text>
          <Text style={styles.footerContact}>
            Questions? Contact {company.email || company.phone || 'your manager'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
