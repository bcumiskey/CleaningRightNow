'use client'

import { format } from 'date-fns'

interface CompanySettings {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
}

interface JobEarning {
  id: string
  date: Date | string
  propertyName: string
  jobRate: number
  expensePercent: number
  workerCount: number
  workerShare: number
  status: 'pending' | 'paid'
  paidAt?: Date | string | null
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

interface PayStatementTemplateProps {
  statement: PayStatement
  company: CompanySettings
}

export default function PayStatementTemplate({
  statement,
  company
}: PayStatementTemplateProps) {
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

  return (
    <div className="bg-white" id="pay-statement-template">
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex items-start gap-4">
            {company.logoUrl && (
              <img
                src={company.logoUrl}
                alt={company.companyName}
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {company.companyName}
              </h1>
              {company.address && (
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {company.address}
                </p>
              )}
              {company.phone && (
                <p className="text-sm text-gray-600">{company.phone}</p>
              )}
              {company.email && (
                <p className="text-sm text-gray-600">{company.email}</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              PAY STATEMENT
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {statement.statementId}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {formatDate(statement.statementDate)}
            </p>
          </div>
        </div>

        {/* Worker Info & Pay Period */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Team Member
            </h3>
            <p className="font-semibold text-gray-900 text-lg">{statement.worker.name}</p>
            {statement.worker.email && (
              <p className="text-gray-600 text-sm">{statement.worker.email}</p>
            )}
            {statement.worker.phone && (
              <p className="text-gray-600 text-sm">{statement.worker.phone}</p>
            )}
          </div>

          <div className="text-right">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Pay Period
            </h3>
            <p className="text-gray-900 font-medium">
              {formatDate(statement.payPeriod.start)} - {formatDate(statement.payPeriod.end)}
            </p>
          </div>
        </div>

        {/* Earnings Summary Box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-emerald-700 font-medium">Jobs Completed</p>
              <p className="text-2xl font-bold text-emerald-900">
                {statement.summary.totalJobs}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Total Earnings</p>
              <p className="text-2xl font-bold text-emerald-900">
                {formatCurrency(statement.summary.totalGrossEarnings)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Paid</p>
              <p className="text-2xl font-bold text-emerald-900">
                {formatCurrency(statement.summary.totalPaid)}
              </p>
            </div>
            <div className="border-l-2 border-emerald-300 pl-4">
              <p className="text-xs text-emerald-700 font-medium">Pending</p>
              <p className="text-2xl font-bold text-emerald-900">
                {formatCurrency(statement.summary.totalPending)}
              </p>
            </div>
          </div>
        </div>

        {/* Earnings Detail */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Earnings Detail
          </h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Property</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Job Rate</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Split</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Your Share</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {statement.earnings.map((earning, index) => {
                const netAfterExpenses = earning.jobRate * (1 - earning.expensePercent / 100)
                return (
                  <tr
                    key={earning.id}
                    className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(earning.date)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {earning.propertyName}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {formatCurrency(earning.jobRate)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 text-center">
                      1/{earning.workerCount}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(earning.workerShare)}
                    </td>
                    <td className="py-3 px-4 text-center">
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
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800 bg-gray-100">
                <td className="py-4 px-4 text-sm font-bold text-gray-900" colSpan={4}>
                  Total Earnings
                </td>
                <td className="py-4 px-4 text-lg font-bold text-gray-900 text-right">
                  {formatCurrency(statement.summary.totalGrossEarnings)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Calculation Explanation */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm text-gray-600">
          <h4 className="font-semibold text-gray-700 mb-2">How Your Pay is Calculated</h4>
          <p>
            For each job, 12% of the job rate goes to business expenses. The remaining 88% is split
            equally among all workers assigned to that job. Your share for each job is shown in the
            &ldquo;Your Share&rdquo; column above.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Thank you for your hard work!
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Questions about your pay? Contact {company.email || company.phone || 'your manager'}.
          </p>
        </div>
      </div>
    </div>
  )
}
