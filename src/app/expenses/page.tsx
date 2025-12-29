'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Receipt,
  Plus,
  Search,
  Loader2,
  Edit2,
  Trash2,
  Car,
  DollarSign,
  TrendingDown,
  Download,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Expense {
  id: string
  date: string
  category: string
  amount: number
  description?: string
  vendor?: string
  mileage?: number
  mileageRate?: number
  notes?: string
}

const CATEGORIES = [
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'GAS_FUEL', label: 'Gas/Fuel' },
  { value: 'MILEAGE', label: 'Mileage' },
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'REPAIRS', label: 'Repairs' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'OTHER', label: 'Other' },
]

const CATEGORY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  SUPPLIES: 'info',
  EQUIPMENT: 'default',
  GAS_FUEL: 'warning',
  MILEAGE: 'warning',
  LAUNDRY: 'info',
  INSURANCE: 'default',
  MARKETING: 'success',
  SOFTWARE: 'info',
  VEHICLE: 'warning',
  REPAIRS: 'danger',
  UTILITIES: 'default',
  OTHER: 'default',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'SUPPLIES',
    amount: '',
    description: '',
    vendor: '',
    mileage: '',
    mileageRate: '0.67',
    notes: '',
  })

  useEffect(() => {
    fetchExpenses()
  }, [categoryFilter])

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }
      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        description: formData.description || null,
        vendor: formData.vendor || null,
        mileage: formData.category === 'MILEAGE' ? parseFloat(formData.mileage) || null : null,
        mileageRate: formData.category === 'MILEAGE' ? parseFloat(formData.mileageRate) || 0.67 : null,
        notes: formData.notes || null,
      }

      const url = editingExpense
        ? `/api/expenses/${editingExpense.id}`
        : '/api/expenses'
      const method = editingExpense ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingExpense ? 'Expense updated' : 'Expense added')
        setIsModalOpen(false)
        resetForm()
        fetchExpenses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save expense')
      }
    } catch (error) {
      console.error('Failed to save expense:', error)
      toast.error('Failed to save expense')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Expense deleted')
        fetchExpenses()
      } else {
        toast.error('Failed to delete expense')
      }
    } catch (error) {
      console.error('Failed to delete expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      date: expense.date.split('T')[0],
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || '',
      vendor: expense.vendor || '',
      mileage: expense.mileage?.toString() || '',
      mileageRate: expense.mileageRate?.toString() || '0.67',
      notes: expense.notes || '',
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingExpense(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: 'SUPPLIES',
      amount: '',
      description: '',
      vendor: '',
      mileage: '',
      mileageRate: '0.67',
      notes: '',
    })
  }

  const exportCSV = () => {
    const headers = ['Date', 'Category', 'Amount', 'Vendor', 'Description', 'Mileage', 'Notes']
    const rows = filteredExpenses.map((e) => [
      formatDate(e.date),
      e.category,
      e.amount.toFixed(2),
      e.vendor || '',
      e.description || '',
      e.mileage?.toString() || '',
      e.notes || '',
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Expenses exported')
  }

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const expensesByCategory = filteredExpenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    },
    {} as Record<string, number>
  )

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category
  }

  return (
    <DashboardLayout>
      <Header title="Expenses" />

      <div className="page-container">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mileage Expenses</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(expensesByCategory['MILEAGE'] || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-xl font-bold">{filteredExpenses.length} expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Categories' }, ...CATEGORIES]}
            className="w-full sm:w-48"
          />
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        </div>

        {/* Expenses List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredExpenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead align="right">Amount</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <Badge variant={CATEGORY_COLORS[expense.category] || 'default'}>
                          {getCategoryLabel(expense.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {expense.description || '-'}
                          </p>
                          {expense.mileage && (
                            <p className="text-sm text-gray-500">
                              {expense.mileage} miles @ ${expense.mileageRate}/mi
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{expense.vendor || '-'}</TableCell>
                      <TableCell align="right">
                        <span className="font-medium text-red-600">
                          -{formatCurrency(expense.amount)}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Track your business expenses for tax deductions and profit calculation."
                action={{
                  label: 'Add Expense',
                  onClick: () => { resetForm(); setIsModalOpen(true); },
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={CATEGORIES}
                required
              />
            </div>

            {formData.category === 'MILEAGE' ? (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Miles Driven"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  required
                />
                <Input
                  label="Rate per Mile ($)"
                  type="number"
                  step="0.01"
                  placeholder="0.67"
                  value={formData.mileageRate}
                  onChange={(e) => setFormData({ ...formData, mileageRate: e.target.value })}
                  hint="2024 IRS rate: $0.67/mile"
                />
              </div>
            ) : (
              <Input
                label="Amount ($)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            )}

            <Input
              label="Description"
              placeholder="What was this expense for?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <Input
              label="Vendor/Store"
              placeholder="Where did you make this purchase?"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {formData.category === 'MILEAGE' && formData.mileage && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Calculated deduction:{' '}
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(
                      parseFloat(formData.mileage || '0') *
                        parseFloat(formData.mileageRate || '0.67')
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingExpense ? 'Update' : 'Add'} Expense
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
