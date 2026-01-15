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
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b-2 border-gray-800 pb-4 sm:pb-6 mb-4 sm:mb-6 gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {company.logoUrl && (
              <img
                src={company.logoUrl}
                alt={company.companyName}
                className="h-12 sm:h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {company.companyName}
              </h1>
              {company.address && (
                <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-line">
                  {company.address}
                </p>
              )}
              {company.phone && (
                <p className="text-xs sm:text-sm text-gray-600">{company.phone}</p>
              )}
              {company.email && (
                <p className="text-xs sm:text-sm text-gray-600">{company.email}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              PAY STATEMENT
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {statement.statementId}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
              {formatDate(statement.statementDate)}
            </p>
          </div>
        </div>

        {/* Worker Info & Pay Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">
              Team Member
            </h3>
            <p className="font-semibold text-gray-900 text-base sm:text-lg">{statement.worker.name}</p>
            {statement.worker.email && (
              <p className="text-gray-600 text-xs sm:text-sm">{statement.worker.email}</p>
            )}
            {statement.worker.phone && (
              <p className="text-gray-600 text-xs sm:text-sm">{statement.worker.phone}</p>
            )}
          </div>

          <div className="sm:text-right">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">
              Pay Period
            </h3>
            <p className="text-gray-900 font-medium text-sm sm:text-base">
              {formatDate(statement.payPeriod.start)} - {formatDate(statement.payPeriod.end)}
            </p>
          </div>
        </div>

        {/* Earnings Summary Box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-xs text-emerald-700 font-medium">Jobs Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                {statement.summary.totalJobs}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Total Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                {formatCurrency(statement.summary.totalGrossEarnings)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                {formatCurrency(statement.summary.totalPaid)}
              </p>
            </div>
            <div className="sm:border-l-2 sm:border-emerald-300 sm:pl-4">
              <p className="text-xs text-emerald-700 font-medium">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                {formatCurrency(statement.summary.totalPending)}
              </p>
            </div>
          </div>
        </div>

        {/* Earnings Detail */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 sm:mb-4">
            Earnings Detail
          </h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Date</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Property</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Job Rate</th>
                    <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Split</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Your Share</th>
                    <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.earnings.map((earning, index) => {
                    return (
                      <tr
                        key={earning.id}
                        className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(earning.date)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900">
                          {earning.propertyName}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 text-right whitespace-nowrap">
                          {formatCurrency(earning.jobRate)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-500 text-center">
                          1/{earning.workerCount}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 text-right font-medium whitespace-nowrap">
                          {formatCurrency(earning.workerShare)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                          <span
                            className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${
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
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-bold text-gray-900" colSpan={4}>
                      Total Earnings
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-base sm:text-lg font-bold text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(statement.summary.totalGrossEarnings)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 sm:pt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Thank you for your hard work!
          </p>
          <p className="text-xs text-gray-400 mt-1 sm:mt-2">
            Questions about your pay? Contact {company.email || company.phone || 'your manager'}.
          </p>
        </div>
      </div>
    </div>
  )
}
