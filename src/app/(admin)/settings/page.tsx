'use client'

import { useState, useEffect } from 'react'
import { Building, DollarSign, Calendar, Save, Image, FileText, ExternalLink, Upload, Wrench, AlertTriangle, CheckCircle, Home, BedDouble, Layers, ClipboardCheck, Search, Trash2 } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ImageUpload from '@/components/ui/ImageUpload'
import toast from 'react-hot-toast'

interface CompanySettings {
  id: string
  companyName: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  logoUrl: string | null
  invoiceFooter: string | null
  invoiceTerms: string | null
  linenTargetMultiplier: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    id: 'default',
    companyName: 'Cleaning Right Now',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    invoiceFooter: '',
    invoiceTerms: '',
    linenTargetMultiplier: 2,
  })
  const [expensePercentage, setExpensePercentage] = useState('12')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFixingDeer, setIsFixingDeer] = useState(false)
  const [deerResult, setDeerResult] = useState<string | null>(null)
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [roomResult, setRoomResult] = useState<string | null>(null)
  const [isFixingSheets, setIsFixingSheets] = useState(false)
  const [sheetsResult, setSheetsResult] = useState<string | null>(null)
  const [isCorrectingJobs, setIsCorrectingJobs] = useState(false)
  const [correctJobsResult, setCorrectJobsResult] = useState<string | null>(null)
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<string | null>(null)
  const [isResettingPayments, setIsResettingPayments] = useState(false)
  const [resetPaymentsResult, setResetPaymentsResult] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          ...data,
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logoUrl: data.logoUrl || '',
          invoiceFooter: data.invoiceFooter || '',
          invoiceTerms: data.invoiceTerms || '',
          linenTargetMultiplier: data.linenTargetMultiplier ?? 2,
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFixDeerCrossing = async () => {
    setIsFixingDeer(true)
    setDeerResult(null)
    try {
      const res = await fetch('/api/admin/fix-deer-crossing', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to fix Deer Crossing')
        setDeerResult(`Error: ${data.error}${data.hint ? ` — ${data.hint}` : ''}`)
        return
      }
      toast.success(`Deer Crossing fixed! ${data.reassignedFromDogwood} reassigned, ${data.newJobsCreated} created, ${data.alreadyCorrect} already correct`)
      setDeerResult(`Done: ${data.reassignedFromDogwood} jobs reassigned from Dogwood, ${data.newJobsCreated} new jobs created, ${data.alreadyCorrect} already correct`)
    } catch (error) {
      toast.error('Failed to fix Deer Crossing')
      setDeerResult('Error: Network request failed')
    } finally {
      setIsFixingDeer(false)
    }
  }

  const handleLoadRoomSetup = async () => {
    if (!confirm('This will WIPE all existing room data and reload it fresh. Are you sure?')) return
    setIsLoadingRooms(true)
    setRoomResult(null)
    try {
      const res = await fetch('/api/admin/load-room-setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load room setup')
        setRoomResult(`Error: ${data.error}`)
        return
      }
      const propResults = data.results?.map((r: { property: string; rooms: number }) => `${r.property}: ${r.rooms} rooms`).join(', ') || 'Done'
      toast.success(`Room setup loaded! ${propResults}`)
      setRoomResult(`Done: ${propResults}`)
    } catch (error) {
      toast.error('Failed to load room setup')
      setRoomResult('Error: Network request failed')
    } finally {
      setIsLoadingRooms(false)
    }
  }

  const handleFixSheets = async () => {
    setIsFixingSheets(true)
    setSheetsResult(null)
    try {
      const res = await fetch('/api/admin/fix-sheets', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to fix sheets')
        setSheetsResult(`Error: ${data.error}`)
        return
      }
      const parts: string[] = []
      if (data.deletedItems > 0) parts.push(`${data.deletedItems} old items removed`)
      if (data.setsCreated.length > 0) parts.push(`${data.setsCreated.length} sets created`)
      if (data.setsSkipped.length > 0) parts.push(`${data.setsSkipped.length} already existed`)
      const summary = parts.length > 0 ? parts.join(', ') : 'No changes needed'
      toast.success(`Sheets fixed! ${summary}`)
      setSheetsResult(`Done: ${summary}`)
    } catch (error) {
      toast.error('Failed to fix sheets')
      setSheetsResult('Error: Network request failed')
    } finally {
      setIsFixingSheets(false)
    }
  }

  const handleCorrectJobs = async () => {
    if (!confirm('This will update ALL completed jobs to match the master data. Rates, commissions, and cleaner assignments will be overwritten. Continue?')) return
    setIsCorrectingJobs(true)
    setCorrectJobsResult(null)
    try {
      const res = await fetch('/api/admin/correct-jobs', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to correct jobs')
        const hint = data.hint ? ` — ${data.hint}` : ''
        const unmatched = data.unmatchedProperties?.join(', ') || data.unmatchedMembers?.join(', ') || ''
        setCorrectJobsResult(`Error: ${data.error}${hint}${unmatched ? ` [${unmatched}]` : ''}`)
        return
      }
      const s = data.summary
      toast.success(`Jobs corrected! ${s.updated} updated, ${s.created} created`)
      setCorrectJobsResult(
        `Done: ${s.updated} updated, ${s.created} created, ${s.skipped} skipped, ${s.errors} errors | ` +
        `Revenue: $${s.totalRevenue.toLocaleString()} | Commission: $${s.totalCommission} | Net: $${s.netAfterCommission}`
      )
    } catch (error) {
      toast.error('Failed to correct jobs')
      setCorrectJobsResult('Error: Network request failed')
    } finally {
      setIsCorrectingJobs(false)
    }
  }

  const handleAuditEarnings = async () => {
    setIsAuditing(true)
    setAuditResult(null)
    try {
      const res = await fetch('/api/admin/audit-earnings')
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to audit earnings')
        setAuditResult(`Error: ${data.error}`)
        return
      }
      if (data.totalIssues === 0) {
        toast.success('All earnings match the master data!')
        setAuditResult(`All clean! ${data.totalMembers} members audited, 0 issues found.`)
      } else {
        toast.error(`Found ${data.totalIssues} issue(s) across ${data.totalMembers} members`)
        const lines: string[] = []
        for (const m of data.members) {
          const issues = m.extras.length + m.missing.length + m.mismatches.length
          if (issues === 0 && m.difference === 0) continue
          lines.push(`${m.name}: DB $${m.dbTotal} vs JSON $${m.jsonTotal} (diff: $${m.difference})`)
          for (const e of m.extras) lines.push(`  + EXTRA in DB: ${e.date} ${e.property} $${e.amountEarned}`)
          for (const mi of m.missing) lines.push(`  - MISSING from DB: ${mi.date} ${mi.property} $${mi.perCleaner}`)
          for (const mm of m.mismatches) lines.push(`  ~ MISMATCH: ${mm.date} ${mm.property} DB=$${mm.dbAmount} JSON=$${mm.jsonAmount}`)
        }
        setAuditResult(lines.join('\n'))
      }
    } catch (error) {
      toast.error('Failed to audit earnings')
      setAuditResult('Error: Network request failed')
    } finally {
      setIsAuditing(false)
    }
  }

  const handleResetPayments = async () => {
    if (!confirm('This will delete all 2026 invoices, reset all payment status, AND mark all jobs as not completed. You will need to re-complete each job to regenerate invoices. This cannot be undone.')) return
    setIsResettingPayments(true)
    setResetPaymentsResult(null)
    try {
      const res = await fetch('/api/admin/reset-payments', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to reset payments')
        setResetPaymentsResult(`Error: ${data.error}`)
        return
      }
      toast.success(`Payments reset! ${data.invoicesDeleted} invoices deleted, ${data.jobsReset} jobs reset, ${data.assignmentsReset} assignments reset`)
      setResetPaymentsResult(`Done: ${data.invoicesDeleted} invoices deleted, ${data.jobsReset} jobs reset, ${data.assignmentsReset} assignments reset`)
    } catch (error) {
      toast.error('Failed to reset payments')
      setResetPaymentsResult('Error: Network request failed')
    } finally {
      setIsResettingPayments(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Settings" />
        <div className="p-6 flex justify-center">
          <div className="animate-pulse text-gray-500">Loading settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Settings" />

      <div className="p-6 max-w-4xl space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Business Information</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Company Name"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              placeholder="Your Business Name"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="business@example.com"
              />
              <Input
                label="Phone"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <Input
              label="Address"
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="123 Main St, City, State 12345"
            />
            <Input
              label="Website"
              value={settings.website || ''}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              placeholder="www.yourbusiness.com"
            />
          </CardContent>
        </Card>

        {/* Company Logo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Company Logo</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <ImageUpload
                value={settings.logoUrl || undefined}
                onChange={(url) => setSettings({ ...settings, logoUrl: url })}
                onRemove={() => setSettings({ ...settings, logoUrl: '' })}
                folder="logos"
                label="Upload Logo"
                previewSize="md"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  Upload your company logo. It will appear on invoices, statements, and other documents.
                </p>
                <p className="text-xs text-gray-500">
                  Recommended: PNG or JPG, at least 200x80 pixels. Max 5MB.
                </p>
                <div className="mt-4">
                  <Input
                    label="Or enter a URL"
                    value={settings.logoUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://example.com/your-logo.png"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Document Settings</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Payment Terms
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={settings.invoiceTerms || ''}
                onChange={(e) => setSettings({ ...settings, invoiceTerms: e.target.value })}
                placeholder="Payment is due upon receipt. Please make checks payable to..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Footer Message
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={settings.invoiceFooter || ''}
                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                placeholder="Thank you for your business!"
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Financial Settings</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs">
              <Input
                label="Default Expense Percentage"
                type="number"
                min="0"
                max="100"
                value={expensePercentage}
                onChange={(e) => setExpensePercentage(e.target.value)}
                placeholder="12"
              />
              <p className="text-sm text-gray-500 mt-1">
                This percentage is deducted from job rates for business expenses before calculating
                team payments.
              </p>
            </div>
            <div className="max-w-xs">
              <Input
                label="Linen Target (Flips)"
                type="number"
                min="1"
                max="10"
                value={settings.linenTargetMultiplier.toString()}
                onChange={(e) => setSettings({ ...settings, linenTargetMultiplier: parseInt(e.target.value) || 2 })}
                placeholder="2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Low inventory alerts trigger when stock falls below this many flips worth of linens.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Calendar Integration</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Calendar integrations are configured per-property. Edit a property to add a Turno or
              Google Calendar iCal URL.
            </p>
            <Button variant="outline" onClick={() => (window.location.href = '/properties')}>
              <ExternalLink size={16} />
              Manage Properties
            </Button>
          </CardContent>
        </Card>

        {/* Admin Tools */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Admin Tools</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fix Deer Crossing */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Home size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Fix Deer Crossing Dates</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Fixes all 2026 Deer Crossing cleaning dates. Reassigns any jobs incorrectly listed as Dogwood
                    to Deer Crossing and sets the correct back-to-back flags.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleFixDeerCrossing}
                  isLoading={isFixingDeer}
                  variant="outline"
                  size="sm"
                >
                  <AlertTriangle size={14} />
                  {isFixingDeer ? 'Fixing...' : 'Fix Deer Crossing Now'}
                </Button>
                {deerResult && (
                  <span className={`text-sm ${deerResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'} flex items-center gap-1`}>
                    {deerResult.startsWith('Error') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    {deerResult}
                  </span>
                )}
              </div>
            </div>

            {/* Load Room Setup */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <BedDouble size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Reload Room Setup Data</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Wipes all existing room/linen data and reloads fresh setup for Gable, Dutch, Gambrel, and Stones.
                    This will replace everything currently saved.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleLoadRoomSetup}
                  isLoading={isLoadingRooms}
                  variant="outline"
                  size="sm"
                >
                  <AlertTriangle size={14} />
                  {isLoadingRooms ? 'Loading...' : 'Reload Room Data Now'}
                </Button>
                {roomResult && (
                  <span className={`text-sm ${roomResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'} flex items-center gap-1`}>
                    {roomResult.startsWith('Error') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    {roomResult}
                  </span>
                )}
              </div>
            </div>
            {/* Fix Sheets to Sets */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Layers size={20} className="text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Fix Sheets to Sets</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Removes deprecated split sheet items (Top/Bottom) and creates the 4 set items
                    (K-Set, Q-Set, F-Set, T-Set). Safe to run multiple times.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleFixSheets}
                  isLoading={isFixingSheets}
                  variant="outline"
                  size="sm"
                >
                  <AlertTriangle size={14} />
                  {isFixingSheets ? 'Fixing...' : 'Fix Sheets Now'}
                </Button>
                {sheetsResult && (
                  <span className={`text-sm ${sheetsResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'} flex items-center gap-1`}>
                    {sheetsResult.startsWith('Error') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    {sheetsResult}
                  </span>
                )}
              </div>
            </div>

            {/* Correct All Jobs */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ClipboardCheck size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Correct All Completed Jobs</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Updates all 47 completed jobs to match the master spreadsheet data exactly.
                    Corrects rates, commission percentages, cleaner assignments, and per-cleaner pay.
                    DOG (FEE) is skipped (needs date). Safe to run multiple times.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCorrectJobs}
                  isLoading={isCorrectingJobs}
                  variant="outline"
                  size="sm"
                >
                  <AlertTriangle size={14} />
                  {isCorrectingJobs ? 'Correcting...' : 'Correct All Jobs Now'}
                </Button>
                {correctJobsResult && (
                  <span className={`text-sm ${correctJobsResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'} flex items-center gap-1`}>
                    {correctJobsResult.startsWith('Error') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    {correctJobsResult}
                  </span>
                )}
              </div>
            </div>

            {/* Audit Earnings */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Search size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Audit Earnings</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Compares every team member&apos;s DB earnings against the master JSON.
                    Shows extras, missing jobs, and amount mismatches. Read-only — no data is changed.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleAuditEarnings}
                  isLoading={isAuditing}
                  variant="outline"
                  size="sm"
                >
                  <Search size={14} />
                  {isAuditing ? 'Auditing...' : 'Audit Earnings'}
                </Button>
                {auditResult && !auditResult.includes('\n') && (
                  <span className={`text-sm ${auditResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'} flex items-center gap-1`}>
                    {auditResult.startsWith('Error') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    {auditResult}
                  </span>
                )}
              </div>
              {auditResult && auditResult.includes('\n') && (
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap text-red-700 max-h-64 overflow-y-auto">
                  {auditResult}
                </pre>
              )}
            </div>
            {/* Reset All Payments */}
            <div className="border border-red-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Trash2 size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Reset All Payments</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Deletes all 2026 invoices and resets all payment status on jobs and assignments.
                    Job data and earnings amounts are preserved. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleResetPayments}
                  isLoading={isResettingPayments}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <AlertTriangle size={14} />
                  {isResettingPayments ? 'Resetting...' : 'Reset All Payments'}
                </Button>
                {resetPaymentsResult && (
                  <span className={`text-sm ${resetPaymentsResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'} flex items-center gap-1`}>
                    {resetPaymentsResult.startsWith('Error') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    {resetPaymentsResult}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save size={16} />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
