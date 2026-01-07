'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Key } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name: string | null
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/auth/reset-password')
      const data = await response.json()
      if (data.users) {
        setUsers(data.users)
        if (data.users.length > 0) {
          setSelectedEmail(data.users[0].email)
        }
      }
    } catch {
      setError('Failed to fetch users')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Password reset! Redirecting to login...`)
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Key className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-gray-600 mt-2">Reset your account password</p>
          </div>

          {isFetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No users found in the database.</p>
              <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Create an account
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account
                </label>
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.email} {user.name ? `(${user.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <p className="text-center text-gray-600 mt-6 text-sm">
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
