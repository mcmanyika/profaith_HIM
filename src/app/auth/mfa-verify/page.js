'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { mfaManager } from '../../../utils/mfaManager'

export default function MFAVerify() {
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [factorId, setFactorId] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setError(null)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setError('You are currently offline. Please check your internet connection.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/auth/signin')
          return
        }

        // Get MFA factors
        const { success, data, error } = await mfaManager.getMFAFactors()
        if (success && data.totp) {
          setFactorId(data.totp.id)
        } else {
          throw new Error(error || 'Failed to get MFA factors')
        }
      } catch (error) {
        handleError(error, 'session')
      }
    }

    checkSession()
  }, [router, supabase])

  const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error)
    
    if (!navigator.onLine) {
      setError('You are currently offline. Please check your internet connection.')
      return
    }

    if (error.message.includes('network') || error.message.includes('timeout')) {
      setError('Network error. Please check your connection and try again.')
      return
    }

    if (error.message.includes('rate limit')) {
      setError('Too many attempts. Please wait a moment before trying again.')
      return
    }

    if (error.message.includes('expired')) {
      setError('Your session has expired. Please sign in again.')
      router.replace('/auth/signin')
      return
    }

    setError(error.message || 'An unexpected error occurred. Please try again.')
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!factorId) {
      setError('MFA setup error. Please try again.')
      return
    }

    if (!navigator.onLine) {
      setError('You are currently offline. Please check your internet connection.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { success, error } = await mfaManager.verifyMFA(factorId, verificationCode)
      
      if (success) {
        router.push('/account')
      } else {
        throw new Error(error || 'Failed to verify MFA code')
      }
    } catch (error) {
      handleError(error, 'verification')
      setRetryCount(prev => prev + 1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setRetryCount(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Two-Factor Authentication</h2>
          <p className="text-gray-600 mt-2">Please enter the 6-digit code from your authenticator app</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              {error.includes('network') || error.includes('offline') ? (
                <button
                  onClick={handleRetry}
                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition text-center text-2xl tracking-widest"
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={isLoading || isOffline}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6 || isOffline}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>

          {isOffline && (
            <p className="text-sm text-gray-500 text-center">
              Waiting for internet connection...
            </p>
          )}
        </form>
      </div>
    </div>
  )
} 