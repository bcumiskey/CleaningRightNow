'use client'

import { format } from 'date-fns'

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

interface StatementItem {
  date: Date | string
  description: string
  amount: number
  type: 'charge' | 'payment' | 'credit'
}

interface Statement {
  statementNumber: string
  statementDate: Date | string
  billingPeriod: string
  previousBalance: number
  totalCharges: number
  totalPayments: number
  currentBalance: number
  items: StatementItem[]
  property: {
    name: string
    address: string
    ownerName: string
    ownerEmail?: string | null
  }
}

interface StatementTemplateProps {
  statement: Statement
  company: CompanySettings
  showWatermark?: boolean
}

export default function StatementTemplate({
  statement,
  company,
  showWatermark = false
}: StatementTemplateProps) {
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
    <div className="bg-white relative" id="statement-template">
      {/* Watermark */}
      {showWatermark && company.logoUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 z-0"
          aria-hidden="true"
        >
          <img
            src={company.logoUrl}
            alt=""
            className="w-96 h-96 object-contain"
          />
        </div>
      )}

      <div className="relative z-10 p-8 max-w-4xl mx-auto">
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
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              STATEMENT
            </h2>
            <p className="text-lg font-semibold text-gray-700 mt-1">
              {statement.statementNumber}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {statement.billingPeriod}
            </p>
          </div>
        </div>

        {/* Account Info & Statement Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Account
            </h3>
            <p className="font-semibold text-gray-900">{statement.property.ownerName}</p>
            <p className="text-gray-700">{statement.property.name}</p>
            <p className="text-gray-600 text-sm">{statement.property.address}</p>
            {statement.property.ownerEmail && (
              <p className="text-gray-600 text-sm">{statement.property.ownerEmail}</p>
            )}
          </div>

          <div className="text-right">
            <div className="inline-block text-left">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="text-gray-500 pr-4 py-1">Statement Date:</td>
                    <td className="text-gray-900 font-medium">
                      {formatDate(statement.statementDate)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 pr-4 py-1">Billing Period:</td>
                    <td className="text-gray-900 font-medium">
                      {statement.billingPeriod}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Account Summary Box */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Account Summary
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Previous Balance</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(statement.previousBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Charges</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(statement.totalCharges)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payments/Credits</p>
              <p className="text-lg font-semibold text-green-600">
                -{formatCurrency(statement.totalPayments)}
              </p>
            </div>
            <div className="border-l-2 border-gray-300 pl-4">
              <p className="text-xs text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(statement.currentBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Transaction Details
          </h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Charges</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Payments/Credits</th>
              </tr>
            </thead>
            <tbody>
              {/* Previous Balance Row */}
              <tr className="bg-gray-100">
                <td className="py-3 px-4 text-sm text-gray-600" colSpan={2}>
                  Previous Balance
                </td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                  {formatCurrency(statement.previousBalance)}
                </td>
                <td className="py-3 px-4"></td>
              </tr>

              {/* Transaction Items */}
              {statement.items.map((item, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(item.date)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                    {item.type === 'charge' ? formatCurrency(item.amount) : ''}
                  </td>
                  <td className="py-3 px-4 text-sm text-green-600 text-right font-medium">
                    {item.type !== 'charge' ? `-${formatCurrency(item.amount)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800">
                <td className="py-4 px-4 text-sm font-bold text-gray-900" colSpan={2}>
                  Current Balance Due
                </td>
                <td className="py-4 px-4 text-lg font-bold text-gray-900 text-right" colSpan={2}>
                  {formatCurrency(statement.currentBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          {company.invoiceTerms && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Payment Terms
              </h4>
              <p className="text-sm text-gray-600">{company.invoiceTerms}</p>
            </div>
          )}
          {company.invoiceFooter && (
            <p className="text-sm text-gray-500 text-center italic">
              {company.invoiceFooter}
            </p>
          )}
          {!company.invoiceFooter && (
            <p className="text-sm text-gray-500 text-center">
              Thank you for your business!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
