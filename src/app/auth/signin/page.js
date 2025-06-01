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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState(null)
  const [showVerifyEmailMessage, setShowVerifyEmailMessage] = useState(false)
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
    setPasswordErrors([])

    if (!email || !password || (isSignUp && !fullName)) {
      setError('Please fill in all required fields.')
      return
    }

    // Check if account is locked
    const { locked } = isAccountLocked()
    if (locked) {
      setError('Account is temporarily locked due to too many failed attempts.')
      return
    }

    try {
      if (isSignUp) {
        const { isValid, errors } = validatePassword(password)
        if (!isValid) {
          setPasswordErrors(errors)
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          },
        })
        if (error) throw error
        setShowVerifyEmailMessage(true)
        setEmail('')
        setPassword('')
        setFullName('')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password,
          options: {
            expiresIn: 10 * 60 * 1000 // 10 minutes
          }
        })

        // Log login attempt
        await loginMonitor.logLoginAttempt(email, !error, {
          ip: window.location.hostname, // In production, you'd get this from the server
          userAgent: navigator.userAgent,
          location: 'Unknown' // In production, you'd get this from IP geolocation
        })

        if (error) {
          const attempts = incrementLoginAttempts()
          setRemainingAttempts(Math.max(0, 3 - attempts))
          
          if (attempts >= 3) {
            await sendLockoutNotification(email)
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

  const handleMFAVerify = async (code) => {
    if (!mfaFactorId) {
      setError('MFA setup error. Please try again.')
      return
    }

    try {
      const { success, error } = await mfaManager.verifyMFA(mfaFactorId, code)
      
      // Log MFA verification attempt
      await loginMonitor.logLoginAttempt(email, success, {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Left: Illustration */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 p-12">
          <div className="text-center text-gray-600">
            <div className="flex justify-center mb-6">
              {!isLogoLoading && logoUrl && (
                <Image 
                  src='https://sdlrxbcshhjhuaqoidzh.supabase.co/storage/v1/object/sign/images/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5X2ZiMTA0MWNmLWRlYmUtNGZlZC04YWQ3LWFhMTk2ZDJiN2Q0YSJ9.eyJ1cmwiOiJpbWFnZXMvbG9nby5wbmciLCJpYXQiOjE3NDgyOTY0MjksImV4cCI6MTc3OTgzMjQyOX0.Ekkwjoh5kZeKErtiemlS09kkf57Dpvoard4uMwjmuUI'
                  alt="Kumusha Logo" 
                  width={150} 
                  height={100}
                  priority
                  className="rounded-full object-contain" 
                />
              )}
            </div>
            <h1 className="text-6xl font-bold mb-4 uppercase">
              <p className="text-sm font-thin">Investor Portal</p> </h1>
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

          {!isSignUp && email && (
            <AccountLockoutMessage email={email} />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {showVerifyEmailMessage && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
              A verification email has been sent. Please check your inbox to verify your email address.
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
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>
              )}

              <div>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                />
              </div>

              <div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute text-xs right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {isSignUp && password && (
                  <>
                    <PasswordStrengthIndicator password={password} />
                    {passwordErrors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        <ul className="list-disc pl-5">
                          {passwordErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {!isSignUp && (
                  <div className="text-right mt-1">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-gray-600 hover:text-black transition duration-200"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {!requiresMFA && (
            <>
              <button
                onClick={handleSubmit}
                className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
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
export default SignIn;