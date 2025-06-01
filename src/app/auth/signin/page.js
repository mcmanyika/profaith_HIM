'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import { validatePassword } from '../../../utils/passwordValidation'
import PasswordStrengthIndicator from '../../../components/PasswordStrengthIndicator'
import { incrementLoginAttempts, resetLoginAttempts, isAccountLocked, getLoginAttempts } from '../../../utils/loginAttempts'
import AccountLockoutMessage from '../../../components/AccountLockoutMessage'
import { sendLockoutNotification } from '../../../utils/emailNotifications'
import Link from 'next/link'
import { sessionManager } from '../../../utils/sessionManager'
import { mfaManager } from '../../../utils/mfaManager'
import { loginMonitor } from '../../../utils/loginMonitor'

function SignIn() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSignUp, setIsSignUp] = useState(false)
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [isLogoLoading, setIsLogoLoading] = useState(true)
  const [passwordErrors, setPasswordErrors] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(3)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const SESSION_TIMEOUT = 10 * 60 * 1000 // 10 minutes in milliseconds
  const ACTIVITY_CHECK_INTERVAL = 180 * 1000 // Check every 3 minutes
  const WARNING_THRESHOLD = 1 * 60 * 1000 // Show warning 1 minute before timeout
  const [requiresMFA, setRequiresMFA] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState(null)

  // Track user activity
  const updateLastActivity = useCallback(() => {
    setLastActivity(Date.now())
  }, [])

  // Check session timeout
  const checkSessionTimeout = useCallback(async () => {
    const currentTime = Date.now()
    const timeUntilTimeout = SESSION_TIMEOUT - (currentTime - lastActivity)
    
    // Show warning when 1 minute remaining
    if (timeUntilTimeout <= WARNING_THRESHOLD && timeUntilTimeout > 0) {
      setError('Your session will expire in 1 minute. Please save your work.')
    }
    
    if (currentTime - lastActivity > SESSION_TIMEOUT) {
      await supabase.auth.signOut()
      router.push('/auth/signin?error=Session expired due to inactivity. Please sign in again.')
    }
  }, [lastActivity, router, supabase])

  // Set up activity listeners
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      updateLastActivity()
    }

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Set up periodic session check
    const sessionCheckInterval = setInterval(checkSessionTimeout, ACTIVITY_CHECK_INTERVAL)

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearInterval(sessionCheckInterval)
    }
  }, [updateLastActivity, checkSessionTimeout])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/account')
      }
      setIsLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const user = session.user
          const fullName = user.user_metadata.full_name || user.user_metadata.name

          if (user && fullName) {
            await supabase.from('profiles').upsert({
              id: user.id,
              full_name: fullName,
              email: user.email,
              last_login: new Date().toISOString(),
              session_id: session.id
            })
          }

          // Initialize session management after successful login
          sessionManager.initialize()
          router.replace('/account')
        }
      }
    )

    const getLogoUrl = async () => {
      try {
        const { data } = await supabase.storage
          .from('images')
          .getPublicUrl('logo.png')
        setLogoUrl(data.publicUrl)
      } catch (error) {
        console.error('Error loading logo:', error)
      } finally {
        setIsLogoLoading(false)
      }
    }

    const checkLockout = () => {
      const { attempts } = getLoginAttempts()
      setRemainingAttempts(Math.max(0, 3 - attempts))
    }

    checkUser()
    getLogoUrl()
    checkLockout()
    return () => subscription.unsubscribe()
  }, [router, supabase])

  const handleSubmit = async () => {
    setError(null)

    if (!phone) {
      setError('Please enter your phone number.')
      return
    }

    if (isSignUp && !displayName) {
      setError('Full Name')
      return
    }

    // Check if account is locked
    const { locked } = isAccountLocked()
    if (locked) {
      setError('Account is temporarily locked due to too many failed attempts.')
      return
    }

    try {
      if (!otpSent) {
        // Send OTP
        const { error } = await supabase.auth.signInWithOtp({
          phone: phone,
          options: {
            data: {
              type: 'phone_otp',
              display_name: isSignUp ? displayName : undefined
            }
          }
        })
        
        if (error) throw error
        
        setOtpSent(true)
        setCountdown(60) // Start 60 second countdown
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        // Verify OTP
        const { data, error } = await supabase.auth.verifyOtp({
          phone: phone,
          token: otp,
          type: 'sms'
        })

        // Log login attempt
        await loginMonitor.logLoginAttempt(phone, !error, {
          ip: window.location.hostname,
          userAgent: navigator.userAgent,
          location: 'Unknown'
        })

        if (error) {
          const attempts = incrementLoginAttempts()
          setRemainingAttempts(Math.max(0, 3 - attempts))
          
          if (attempts >= 3) {
            await sendLockoutNotification(phone)
          }
          
          throw error
        }

        // Check if MFA is required
        if (data.session) {
          const { success, data: mfaData } = await mfaManager.getMFAFactors()
          if (success && mfaData.totp) {
            setRequiresMFA(true)
            setMfaFactorId(mfaData.totp.id)
            return
          }
        }

        resetLoginAttempts()
        router.push('/account')
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          data: {
            type: 'phone_otp_resend'
          }
        }
      })
      
      if (error) throw error
      
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      setError(error.message)
    }
  }

  const handleMFAVerify = async (code) => {
    if (!mfaFactorId) {
      setError('MFA setup error. Please try again.')
      return
    }

    try {
      const { success, error } = await mfaManager.verifyMFA(mfaFactorId, code)
      
      // Log MFA verification attempt
      await loginMonitor.logLoginAttempt(phone, success, {
        ip: window.location.hostname,
        userAgent: navigator.userAgent,
        location: 'Unknown',
        mfa: true
      })

      if (success) {
        resetLoginAttempts()
        router.push('/account')
      } else {
        throw new Error(error || 'Failed to verify MFA code')
      }
    } catch (error) {
      setError(error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Left: Illustration */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 p-12">
          <div className="text-center text-gray-600">
            <div className="flex justify-center mb-6">
              
                <Image 
                  src='https://sdlrxbcshhjhuaqoidzh.supabase.co/storage/v1/object/sign/images/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5X2ZiMTA0MWNmLWRlYmUtNGZlZC04YWQ3LWFhMTk2ZDJiN2Q0YSJ9.eyJ1cmwiOiJpbWFnZXMvbG9nby5wbmciLCJpYXQiOjE3NDg3OTM1MTgsImV4cCI6MTc4MDMyOTUxOH0.b5KORbht1TJ9m8oIsPMaexeHknIu00diC51ECjxAmvg'
                  alt="Logo" 
                  width={150} 
                  height={100}
                  priority
                  className="rounded-full object-contain" 
                />
              
            </div>
            <h1 className="text-6xl font-bold mb-4 uppercase">
              <p className="text-sm font-thin">Investor Portal</p>
            </h1>
            <p className="text-gray-600 text-sm capitalize">Join our community and start your journey today</p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="w-full md:w-1/2 p-6 md:p-12 space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-800 uppercase">
              {requiresMFA ? 'Two-Factor Authentication' : (isSignUp ? 'Create an Account' : 'Sign In')}
            </h2>
          </div>

          {!isSignUp && phone && (
            <AccountLockoutMessage email={phone} />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {requiresMFA ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Please enter the 6-digit code from your authenticator app
              </p>
              <div>
                <input
                  type="text"
                  maxLength={6}
                  onChange={(e) => {
                    const code = e.target.value.replace(/\D/g, '')
                    if (code.length === 6) {
                      handleMFAVerify(code)
                    }
                  }}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition text-center text-2xl tracking-widest"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isSignUp && (
                <div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>
              )}
              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                  disabled={otpSent}
                />
              </div>

              {otpSent && (
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP code"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                    maxLength={6}
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    {countdown > 0 ? (
                      <span>Resend OTP in {countdown}s</span>
                    ) : (
                      <button
                        onClick={handleResendOtp}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!requiresMFA && (
            <>
              <button
                onClick={handleSubmit}
                className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  otpSent ? 'Verify OTP' : 'Send OTP'
                )}
              </button>

              <div className="text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-gray-600 hover:text-black transition duration-200"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SignIn