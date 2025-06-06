'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { validatePassword } from '../../../utils/passwordValidation'
import PasswordStrengthIndicator from '../../../components/PasswordStrengthIndicator'
import { incrementLoginAttempts, resetLoginAttempts, isAccountLocked, getLoginAttempts } from '../../../utils/loginAttempts'
import AccountLockoutMessage from '../../../components/AccountLockoutMessage'
import { sendLockoutNotification } from '../../../utils/emailNotifications'
import Link from 'next/link'
import { sessionManager } from '../../../utils/sessionManager'
import { loginMonitor } from '../../../utils/loginMonitor'

function SignIn() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSignUp, setIsSignUp] = useState(false)
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMethod, setLoginMethod] = useState('email') // 'email' or 'phone'
  const [error, setError] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [isLogoLoading, setIsLogoLoading] = useState(true)
  const [remainingAttempts, setRemainingAttempts] = useState(3)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const SESSION_TIMEOUT = 10 * 60 * 1000 // 10 minutes in milliseconds
  const ACTIVITY_CHECK_INTERVAL = 180 * 1000 // Check every 3 minutes
  const WARNING_THRESHOLD = 1 * 60 * 1000 // Show warning 1 minute before timeout
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [emailVerificationCode, setEmailVerificationCode] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isPhoneStep, setIsPhoneStep] = useState(false)
  const [isPhoneVerificationStep, setIsPhoneVerificationStep] = useState(false)
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('')
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)

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
      setError('Your session will expire in 1 minute.')
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

    if (isSignUp) {
      // Signup: require email, password, and collect phone for next step
      if (!displayName) {
        setError('Please enter your full name.')
        return
      }
      if (!email) {
        setError('Please enter your email address.')
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.')
        return
      }
      if (!password) {
        setError('Please enter a password.')
        return
      }
      // Check if account is locked
      const { locked } = isAccountLocked()
      if (locked) {
        setError('Account is temporarily locked due to too many failed attempts.')
        return
      }
      try {
        console.log('Attempting sign up with:', { email, password, full_name: displayName })
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName
            }
          }
        })
        if (error) {
          console.log('Sign up error:', error)
          throw error
        }
        resetLoginAttempts()
        setIsPhoneStep(true)
      } catch (error) {
        console.log('Sign up catch error:', error)
        setError(error.message)
      }
    } else {
      // Login: allow either email+password or phone+password
      if (loginMethod === 'email') {
        if (!email) {
          setError('Please enter your email address.')
          return
        }
        if (!password) {
          setError('Please enter your password.')
          return
        }
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) {
            const attempts = incrementLoginAttempts()
            setRemainingAttempts(Math.max(0, 3 - attempts))
            if (attempts >= 3) {
              await sendLockoutNotification(email)
            }
            throw error
          }
          resetLoginAttempts()
          router.push('/account')
        } catch (error) {
          setError(error.message)
        }
      } else {
        if (!phone) {
          setError('Please enter your phone number.')
          return
        }
        if (!password) {
          setError('Please enter your password.')
          return
        }
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            phone,
            password,
          })
          if (error) {
            const attempts = incrementLoginAttempts()
            setRemainingAttempts(Math.max(0, 3 - attempts))
            if (attempts >= 3) {
              await sendLockoutNotification(phone)
            }
            throw error
          }
          resetLoginAttempts()
          router.push('/account')
        } catch (error) {
          setError(error.message)
        }
      }
    }
  }

  // Phone step after signup
  const handleAddPhone = async () => {
    setError(null)
    if (!phone) {
      setError('Please enter your phone number.')
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ phone })
      if (error) throw error
      setIsPhoneStep(false)
      setIsPhoneVerificationStep(true)
    } catch (error) {
      setError(error.message)
    }
  }

  const handleVerifyPhone = async () => {
    setError(null)
    if (!phoneVerificationCode) {
      setError('Please enter the verification code sent to your phone.')
      return
    }
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: phoneVerificationCode,
        type: 'sms',
      })
      if (error) throw error
      setIsPhoneVerificationStep(false)
      setIsPhoneVerified(true)
    } catch (error) {
      setError(error.message)
    }
  }

  const handleEmailVerification = async () => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: emailVerificationCode,
        type: 'email'
      })

      if (error) throw error

      setIsEmailVerified(true)
      resetLoginAttempts()
      router.push('/account')
    } catch (error) {
      setError(error.message)
    }
  }

  const handleResendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          data: {
            type: 'email_verification'
          }
        }
      })
      
      if (error) throw error
      
      setError('Verification email resent successfully.')
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Phone add step UI
  if (isPhoneStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 uppercase text-center">Add Your Phone Number</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <PhoneInput
            international
            defaultCountry="US"
            value={phone}
            onChange={setPhone}
            placeholder="Enter phone number"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
          />
          <button
            onClick={handleAddPhone}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm"
          >
            Send Verification Code
          </button>
        </div>
      </div>
    )
  }

  // Phone verification step UI
  if (isPhoneVerificationStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 uppercase text-center">Verify Your Phone Number</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <input
            type="text"
            value={phoneVerificationCode}
            onChange={(e) => setPhoneVerificationCode(e.target.value)}
            placeholder="Enter verification code"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
            maxLength={6}
          />
          <button
            onClick={handleVerifyPhone}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm"
          >
            Verify Phone
          </button>
        </div>
      </div>
    )
  }

  if (isPhoneVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
          <h2 className="text-xl font-bold text-green-700 uppercase">Phone Verified!</h2>
          <p className="text-gray-700">You can now log in with either your email or your phone number.</p>
          <button
            onClick={() => { setIsSignUp(false); setIsPhoneVerified(false); }}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm mt-4"
          >
            Go to Sign In
          </button>
        </div>
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
                  width={200} 
                  height={200}
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
              {isSignUp ? 'Create an Account' : 'Sign In'}
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

          {emailVerificationSent ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Please check your email for a verification code. Enter it below to complete your registration.
              </p>
              <div>
                <input
                  type="text"
                  value={emailVerificationCode}
                  onChange={(e) => setEmailVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                  maxLength={6}
                />
              </div>
              <button
                onClick={handleEmailVerification}
                className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm"
              >
                Verify Email
              </button>
              <div className="text-center">
                <button
                  onClick={handleResendVerificationEmail}
                  className="text-sm text-gray-600 hover:text-black transition duration-200"
                >
                  Resend verification email
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isSignUp ? (
                <>
                  <div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center space-x-4 mb-4">
                    <button
                      onClick={() => setLoginMethod('email')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                        loginMethod === 'email'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Email Login
                    </button>
                    <button
                      onClick={() => setLoginMethod('phone')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                        loginMethod === 'phone'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Phone Login
                    </button>
                  </div>
                  {loginMethod === 'email' ? (
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                      />
                    </div>
                  ) : (
                    <div>
                      <PhoneInput
                        international
                        defaultCountry="US"
                        value={phone}
                        onChange={setPhone}
                        placeholder="Enter phone number"
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                    />
                  </div>
                </>
              )}

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
                  isSignUp ? 'Sign Up' : 'Sign In'
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SignIn