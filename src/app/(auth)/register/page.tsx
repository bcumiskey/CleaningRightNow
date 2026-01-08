'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building, ShieldX } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [registrationDisabled, setRegistrationDisabled] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if registration is allowed (only before first admin exists)
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/auth/setup-status')
        const data = await response.json()
        setRegistrationDisabled(data.hasAdmin)
      } catch {
        // If check fails, allow form to show - API will still block if needed
        setRegistrationDisabled(false)
      } finally {
        setCheckingStatus(false)
      }
    }
    checkRegistrationStatus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (response.ok) {
        toast.success('Account created! Please sign in.')
        router.push('/login')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create account')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (registrationDisabled) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldX className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Registration Disabled</h1>
          <p className="text-gray-500 mt-2 mb-6">
            Public registration is not available. New accounts must be created by an administrator through the Team management page.
          </p>
          <Link href="/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Initial Setup</h1>
          <p className="text-gray-500 mt-1">Create the first admin account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
