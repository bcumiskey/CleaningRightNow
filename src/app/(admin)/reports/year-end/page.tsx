'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileText, DollarSign, Users, Receipt, Car, Calendar } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Contractor {
  id: string
  name: string
  email: string | null
  totalPaid: number
  jobCount: number
  needs1099: boolean
}

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  vendor: string | null
  propertyName: string | null
  miles: number | null
}

interface YearEndData {
  year: number
  summary: {
    totalRevenue: number
    invoicedRevenue: number
    paidRevenue: number
    totalExpenses: number
    totalTeamPayments: number
    grossProfit: number
    netProfit: number
    totalJobs: number
    totalInvoices: number
    totalMiles: number
  }
  revenueByMonth: Record<string, number>
  revenueByProperty: Array<{ name: string; revenue: number; jobs: number }>
  revenueByOwner: Array<{ name: string; revenue: number; jobs: number }>
  expensesByCategory: Record<string, number>
  expenses: Expense[]
  contractors: Contractor[]
  contractor1099: {
    count: number
    totalAmount: number
  }
  availableYears: number[]
}

export default function YearEndPage() {
  const router = useRouter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<YearEndData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reports/year-end?year=${year}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load year-end data')
    } finally {
      setIsLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    toast.success(`Downloaded ${filename}`)
  }

  const exportRevenueByProperty = () => {
    if (!data) return
    const headers = ['Property', 'Revenue', 'Jobs']
    const rows = data.revenueByProperty.map(p => [p.name, p.revenue.toFixed(2), p.jobs.toString()])
    downloadCSV(`revenue-by-property-${year}.csv`, headers, rows)
  }

  const exportRevenueByOwner = () => {
    if (!data) return
    const headers = ['Owner', 'Revenue', 'Jobs']
    const rows = data.revenueByOwner.map(o => [o.name, o.revenue.toFixed(2), o.jobs.toString()])
    downloadCSV(`revenue-by-owner-${year}.csv`, headers, rows)
  }

  const exportExpenses = () => {
    if (!data) return
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Vendor', 'Property', 'Miles']
    const rows = data.expenses.map(e => [
      format(new Date(e.date), 'yyyy-MM-dd'),
      e.category,
      e.description,
      e.amount.toFixed(2),
      e.vendor || '',
      e.propertyName || '',
      e.miles?.toString() || '',
    ])
    downloadCSV(`expenses-${year}.csv`, headers, rows)
  }

  const exportMileage = () => {
    if (!data) return
    const mileageExpenses = data.expenses.filter(e => e.category === 'mileage')
    const headers = ['Date', 'Description', 'Miles', 'Amount']
    const rows = mileageExpenses.map(e => [
      format(new Date(e.date), 'yyyy-MM-dd'),
      e.description,
      e.miles?.toString() || '',
      e.amount.toFixed(2),
    ])
    downloadCSV(`mileage-log-${year}.csv`, headers, rows)
  }

  const exportContractors = () => {
    if (!data) return
    const headers = ['Name', 'Email', 'Total Paid', 'Job Count', 'Needs 1099']
    const rows = data.contractors.map(c => [
      c.name,
      c.email || '',
      c.totalPaid.toFixed(2),
      c.jobCount.toString(),
      c.needs1099 ? 'Yes' : 'No',
    ])
    downloadCSV(`contractor-payments-${year}.csv`, headers, rows)
  }

  const yearOptions = data?.availableYears.map(y => ({ value: y.toString(), label: y.toString() })) || []

  return (
    <div className="min-h-screen">
      <AdminHeader title="Year-End Reports" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/reports')}>
              <ArrowLeft size={16} />
              Back to Reports
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Year-End Reports</h2>
              <p className="text-sm text-gray-500">Export data for your accountant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-400" />
            <Select
              value={year.toString()}
              onChange={(e) => setYear(parseInt(e.target.value))}
              options={yearOptions}
              className="w-32"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading year-end data...</div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="mx-auto text-green-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="mx-auto text-blue-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.totalTeamPayments)}</p>
                  <p className="text-xs text-gray-500">Team Payments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Receipt className="mx-auto text-purple-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.totalExpenses)}</p>
                  <p className="text-xs text-gray-500">Expenses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="mx-auto text-emerald-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.netProfit)}</p>
                  <p className="text-xs text-gray-500">Net Profit</p>
                </CardContent>
              </Card>
            </div>

            {/* Income Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={20} />
                  Income Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Revenue by Property</p>
                    <p className="text-sm text-gray-500">
                      {data.revenueByProperty.length} properties, {formatCurrency(data.summary.totalRevenue)} total
                    </p>
                  </div>
                  <Button variant="outline" onClick={exportRevenueByProperty}>
                    <Download size={16} />
                    Export CSV
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Revenue by Owner</p>
                    <p className="text-sm text-gray-500">
                      {data.revenueByOwner.length} owners
                    </p>
                  </div>
                  <Button variant="outline" onClick={exportRevenueByOwner}>
                    <Download size={16} />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Expense Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt size={20} />
                  Expense Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">All Expenses</p>
                    <p className="text-sm text-gray-500">
                      {data.expenses.length} entries, {formatCurrency(data.summary.totalExpenses)} total
                    </p>
                  </div>
                  <Button variant="outline" onClick={exportExpenses}>
                    <Download size={16} />
                    Export CSV
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car size={20} className="text-green-600" />
                    <div>
                      <p className="font-medium">Mileage Log</p>
                      <p className="text-sm text-gray-500">
                        {data.summary.totalMiles.toFixed(1)} miles, {formatCurrency(data.expensesByCategory['mileage'] || 0)} deduction
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={exportMileage}>
                    <Download size={16} />
                    Export CSV
                  </Button>
                </div>

                {/* Expense breakdown */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-3">Expenses by Category</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(data.expensesByCategory).map(([category, amount]) => (
                      <div key={category} className="p-3 bg-gray-50 rounded">
                        <p className="text-sm capitalize text-gray-600">{category}</p>
                        <p className="font-bold">{formatCurrency(amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contractor Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users size={20} />
                    Contractor Payments (1099-NEC)
                  </span>
                  {data.contractor1099.count > 0 && (
                    <Badge variant="warning">
                      {data.contractor1099.count} need 1099
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Contractor Payment Summary</p>
                    <p className="text-sm text-gray-500">
                      {data.contractors.length} contractors, {formatCurrency(data.summary.totalTeamPayments)} total
                    </p>
                    <p className="text-sm text-amber-600">
                      {data.contractor1099.count} paid over $600 (require 1099-NEC)
                    </p>
                  </div>
                  <Button variant="outline" onClick={exportContractors}>
                    <Download size={16} />
                    Export CSV
                  </Button>
                </div>

                {/* Contractors needing 1099 */}
                {data.contractors.filter(c => c.needs1099).length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-3">Contractors Requiring 1099-NEC</p>
                    <div className="divide-y">
                      {data.contractors
                        .filter(c => c.needs1099)
                        .map((contractor) => (
                          <div key={contractor.id} className="py-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{contractor.name}</p>
                              <p className="text-sm text-gray-500">
                                {contractor.email || 'No email'} • {contractor.jobCount} jobs
                              </p>
                            </div>
                            <p className="font-bold text-lg">{formatCurrency(contractor.totalPaid)}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* P&L Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} />
                  Profit & Loss Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Total Revenue</span>
                    <span className="font-bold">{formatCurrency(data.summary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Less: Team Payments</span>
                    <span className="font-bold text-red-600">-{formatCurrency(data.summary.totalTeamPayments)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t">
                    <span className="font-medium">Gross Profit</span>
                    <span className="font-bold">{formatCurrency(data.summary.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Less: Operating Expenses</span>
                    <span className="font-bold text-red-600">-{formatCurrency(data.summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-2 border-gray-300">
                    <span className="font-bold text-lg">Net Profit</span>
                    <span className={`font-bold text-lg ${data.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.summary.netProfit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help Text */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-medium text-blue-900 mb-2">For Your Accountant</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Export all CSV files above and send to your accountant</li>
                  <li>• Contractors paid $600+ require Form 1099-NEC by January 31</li>
                  <li>• Keep mileage log for IRS vehicle deduction documentation</li>
                  <li>• Save all expense receipts (uploaded to system where available)</li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">Failed to load year-end data</div>
        )}
      </div>
    </div>
  )
}
