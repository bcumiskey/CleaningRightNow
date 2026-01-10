'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Receipt, Car, Package, Wrench, Shield, CreditCard, MoreHorizontal, Trash2, X } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const EXPENSE_CATEGORIES = [
  { value: 'supplies', label: 'Supplies', icon: Package, color: 'bg-blue-100 text-blue-600' },
  { value: 'equipment', label: 'Equipment', icon: Wrench, color: 'bg-purple-100 text-purple-600' },
  { value: 'mileage', label: 'Mileage', icon: Car, color: 'bg-green-100 text-green-600' },
  { value: 'insurance', label: 'Insurance', icon: Shield, color: 'bg-amber-100 text-amber-600' },
  { value: 'subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'bg-pink-100 text-pink-600' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
]

const PERIODS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  vendor: string | null
  receiptUrl: string | null
  miles: number | null
  mileageRate: number | null
  notes: string | null
  property: { id: string; name: string } | null
}

interface ExpenseData {
  expenses: Expense[]
  summary: {
    total: number
    byCategory: Record<string, number>
    count: number
    period: string
  }
  mileageRate: number
}

interface Property {
  id: string
  name: string
}

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseData | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [period, setPeriod] = useState('this_month')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'supplies',
    description: '',
    amount: '',
    vendor: '',
    propertyId: '',
    miles: '',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [expenseRes, propRes] = await Promise.all([
        fetch(`/api/expenses?period=${period}`),
        fetch('/api/properties?includeInactive=false'),
      ])
      if (expenseRes.ok) {
        setData(await expenseRes.json())
      }
      if (propRes.ok) {
        setProperties(await propRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load expenses')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'supplies',
      description: '',
      amount: '',
      vendor: '',
      propertyId: '',
      miles: '',
      notes: '',
    })
  }

  const handleSubmit = async () => {
    if (!formData.description) {
      toast.error('Please enter a description')
      return
    }

    if (formData.category === 'mileage') {
      if (!formData.miles || parseFloat(formData.miles) <= 0) {
        toast.error('Please enter miles driven')
        return
      }
    } else {
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error('Please enter an amount')
        return
      }
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          category: formData.category,
          description: formData.description,
          amount: formData.category !== 'mileage' ? parseFloat(formData.amount) : 0,
          vendor: formData.vendor || null,
          propertyId: formData.propertyId || null,
          miles: formData.category === 'mileage' ? parseFloat(formData.miles) : null,
          notes: formData.notes || null,
        }),
      })

      if (res.ok) {
        toast.success('Expense added')
        setShowAddDialog(false)
        resetForm()
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add expense')
      }
    } catch (error) {
      toast.error('Failed to add expense')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Expense deleted')
        fetchData()
      } else {
        toast.error('Failed to delete expense')
      }
    } catch (error) {
      toast.error('Failed to delete expense')
    }
  }

  const getCategoryInfo = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[5]
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Expenses" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Expense Tracking</h2>
            <p className="text-sm text-gray-500">Track business expenses for tax deductions</p>
          </div>
          <div className="flex gap-2">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={PERIODS}
              className="w-40"
            />
            <Button variant="primary" onClick={() => setShowAddDialog(true)}>
              <Plus size={16} />
              Add Expense
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading expenses...</div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card className="col-span-2 md:col-span-1">
                <CardContent className="p-4 text-center">
                  <Receipt className="mx-auto text-gray-400 mb-2" size={24} />
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.total)}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </CardContent>
              </Card>
              {EXPENSE_CATEGORIES.map((cat) => {
                const amount = data.summary.byCategory[cat.value] || 0
                const Icon = cat.icon
                return (
                  <Card key={cat.value}>
                    <CardContent className="p-4 text-center">
                      <div className={`w-8 h-8 rounded-full ${cat.color} flex items-center justify-center mx-auto mb-2`}>
                        <Icon size={16} />
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                      <p className="text-xs text-gray-500">{cat.label}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Expense List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {data.summary.count} Expense{data.summary.count !== 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.expenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No expenses recorded for this period</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowAddDialog(true)}
                    >
                      <Plus size={16} />
                      Add First Expense
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {data.expenses.map((expense) => {
                      const cat = getCategoryInfo(expense.category)
                      const Icon = cat.icon
                      return (
                        <div key={expense.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${cat.color} flex items-center justify-center`}>
                              <Icon size={18} />
                            </div>
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                {expense.vendor && (
                                  <>
                                    <span>•</span>
                                    <span>{expense.vendor}</span>
                                  </>
                                )}
                                {expense.property && (
                                  <>
                                    <span>•</span>
                                    <span>{expense.property.name}</span>
                                  </>
                                )}
                                {expense.miles && (
                                  <>
                                    <span>•</span>
                                    <span>{expense.miles} mi @ ${expense.mileageRate?.toFixed(2)}/mi</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">Failed to load expenses</div>
        )}
      </div>

      {/* Add Expense Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Add Expense</h2>
              <button
                onClick={() => setShowAddDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                          formData.category === cat.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full ${cat.color} flex items-center justify-center mb-1`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-xs">{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {formData.category === 'mileage' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miles Driven</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 25.5"
                    value={formData.miles}
                    onChange={(e) => setFormData({ ...formData, miles: e.target.value })}
                  />
                  {formData.miles && data && (
                    <p className="text-sm text-gray-500 mt-1">
                      = {formatCurrency(parseFloat(formData.miles) * data.mileageRate)} @ ${data.mileageRate.toFixed(2)}/mile
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input
                  placeholder="What was this expense for?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor (optional)</label>
                <Input
                  placeholder="Where did you buy this?"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property (optional)</label>
                <Select
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  options={[
                    { value: '', label: 'General Business Expense' },
                    ...properties.map(p => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Any additional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
                isLoading={isSaving}
              >
                <Plus size={16} />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
