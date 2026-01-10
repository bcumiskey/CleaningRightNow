'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, CheckCircle, Users, Calendar, ChevronDown, ChevronRight, X } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const PAYMENT_METHODS = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'mixed', label: 'Mixed' },
]

interface Assignment {
  id: string
  jobId: string
  jobDate: string
  propertyName: string
  amount: number
}

interface Worker {
  id: string
  name: string
  email: string | null
  totalUnpaid: number
  assignments: Assignment[]
}

interface UnpaidData {
  summary: {
    totalUnpaid: number
    workerCount: number
    assignmentCount: number
  }
  workers: Worker[]
}

export default function TeamPaymentsPage() {
  const router = useRouter()
  const [data, setData] = useState<UnpaidData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Selection state
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set())
  const [expandedWorkers, setExpandedWorkers] = useState<Set<string>>(new Set())

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/team/unpaid-summary')
      if (res.ok) {
        const result = await res.json()
        setData(result)
        // Expand all workers by default
        setExpandedWorkers(new Set(result.workers.map((w: Worker) => w.id)))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load payment data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleWorkerExpand = (workerId: string) => {
    const newExpanded = new Set(expandedWorkers)
    if (newExpanded.has(workerId)) {
      newExpanded.delete(workerId)
    } else {
      newExpanded.add(workerId)
    }
    setExpandedWorkers(newExpanded)
  }

  const toggleAssignment = (assignmentId: string) => {
    const newSelected = new Set(selectedAssignments)
    if (newSelected.has(assignmentId)) {
      newSelected.delete(assignmentId)
    } else {
      newSelected.add(assignmentId)
    }
    setSelectedAssignments(newSelected)
  }

  const toggleWorkerAssignments = (worker: Worker) => {
    const workerAssignmentIds = worker.assignments.map(a => a.id)
    const allSelected = workerAssignmentIds.every(id => selectedAssignments.has(id))

    const newSelected = new Set(selectedAssignments)
    if (allSelected) {
      // Deselect all
      workerAssignmentIds.forEach(id => newSelected.delete(id))
    } else {
      // Select all
      workerAssignmentIds.forEach(id => newSelected.add(id))
    }
    setSelectedAssignments(newSelected)
  }

  const selectAll = () => {
    if (!data) return
    const allIds = data.workers.flatMap(w => w.assignments.map(a => a.id))
    setSelectedAssignments(new Set(allIds))
  }

  const deselectAll = () => {
    setSelectedAssignments(new Set())
  }

  const getSelectedTotal = () => {
    if (!data) return 0
    let total = 0
    data.workers.forEach(worker => {
      worker.assignments.forEach(assignment => {
        if (selectedAssignments.has(assignment.id)) {
          total += assignment.amount
        }
      })
    })
    return total
  }

  const getSelectedWorkerCount = () => {
    if (!data) return 0
    const workerIds = new Set<string>()
    data.workers.forEach(worker => {
      const hasSelected = worker.assignments.some(a => selectedAssignments.has(a.id))
      if (hasSelected) {
        workerIds.add(worker.id)
      }
    })
    return workerIds.size
  }

  const handleProcessPayment = async () => {
    if (selectedAssignments.size === 0) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/team/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentIds: Array.from(selectedAssignments),
        }),
      })

      if (res.ok) {
        const result = await res.json()
        toast.success(`Marked ${result.updated} payments as paid`)
        setShowPaymentDialog(false)
        setSelectedAssignments(new Set())
        setPaymentMethod('')
        setPaymentNotes('')
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to process payment')
      }
    } catch (error) {
      toast.error('Failed to process payment')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Team Payments" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/team')}>
              <ArrowLeft size={16} />
              Back to Team
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Payment Run</h2>
              <p className="text-sm text-gray-500">Mark worker payments as paid</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading payment data...</div>
        ) : data ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="mx-auto text-green-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.totalUnpaid)}</p>
                  <p className="text-xs text-gray-500">Total Unpaid</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="mx-auto text-blue-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{data.summary.workerCount}</p>
                  <p className="text-xs text-gray-500">Workers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="mx-auto text-purple-600 mb-2" size={24} />
                  <p className="text-2xl font-bold">{data.summary.assignmentCount}</p>
                  <p className="text-xs text-gray-500">Jobs</p>
                </CardContent>
              </Card>
            </div>

            {/* Selection Actions */}
            {data.workers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" onClick={selectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAll}>
                        Clear Selection
                      </Button>
                      <span className="text-sm text-gray-500">
                        {selectedAssignments.size} of {data.summary.assignmentCount} selected
                      </span>
                    </div>

                    {selectedAssignments.size > 0 && (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {getSelectedWorkerCount()} worker{getSelectedWorkerCount() !== 1 ? 's' : ''}, {selectedAssignments.size} job{selectedAssignments.size !== 1 ? 's' : ''}
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(getSelectedTotal())}
                          </p>
                        </div>
                        <Button
                          variant="success"
                          onClick={() => setShowPaymentDialog(true)}
                        >
                          <CheckCircle size={16} />
                          Process Payment
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Worker List */}
            {data.workers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                  <p className="text-gray-500">No unpaid worker earnings at this time.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.workers.map((worker) => {
                  const isExpanded = expandedWorkers.has(worker.id)
                  const workerAssignmentIds = worker.assignments.map(a => a.id)
                  const selectedCount = workerAssignmentIds.filter(id => selectedAssignments.has(id)).length
                  const allSelected = selectedCount === workerAssignmentIds.length
                  const someSelected = selectedCount > 0 && selectedCount < workerAssignmentIds.length

                  return (
                    <Card key={worker.id}>
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleWorkerExpand(worker.id)}
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleWorkerAssignments(worker)
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              allSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : someSelected
                                ? 'bg-blue-100 border-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {allSelected && <CheckCircle size={14} />}
                            {someSelected && <div className="w-2 h-2 bg-blue-600 rounded-sm" />}
                          </button>

                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            <div>
                              <p className="font-medium">{worker.name}</p>
                              <p className="text-sm text-gray-500">
                                {worker.assignments.length} job{worker.assignments.length !== 1 ? 's' : ''}
                                {worker.email && ` • ${worker.email}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(worker.totalUnpaid)}
                          </p>
                          {selectedCount > 0 && (
                            <p className="text-xs text-blue-600">
                              {selectedCount} selected
                            </p>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t px-4 pb-4">
                          <div className="divide-y">
                            {worker.assignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between py-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => toggleAssignment(assignment.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                      selectedAssignments.has(assignment.id)
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-gray-300'
                                    }`}
                                  >
                                    {selectedAssignments.has(assignment.id) && (
                                      <CheckCircle size={12} />
                                    )}
                                  </button>
                                  <div>
                                    <p className="text-sm font-medium">{assignment.propertyName}</p>
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(assignment.jobDate), 'MMM d, yyyy')}
                                    </p>
                                  </div>
                                </div>
                                <p className="font-semibold">{formatCurrency(assignment.amount)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">Failed to load payment data</div>
        )}
      </div>

      {/* Payment Confirmation Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Confirm Payment Run</h2>
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600">Total Payment</p>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(getSelectedTotal())}</p>
                <p className="text-sm text-gray-600">
                  {getSelectedWorkerCount()} worker{getSelectedWorkerCount() !== 1 ? 's' : ''}, {selectedAssignments.size} job{selectedAssignments.size !== 1 ? 's' : ''}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method (optional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        paymentMethod === method.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <Input
                  placeholder="e.g., Pay period Jan 1-15"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                className="flex-1"
                onClick={handleProcessPayment}
                isLoading={isProcessing}
              >
                <CheckCircle size={16} />
                Mark as Paid
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
