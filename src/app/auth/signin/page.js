'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { validatePassword } from '../../../utils/passwordValidation'
import PasswordStrengthIndicator from '../../../components/PasswordStrengthIndicator'
import { incrementLoginAttempts, resetLoginAttempts, isAccountLocked, getLoginAttempts } from '../../../utils/loginAttempts'
import { sendLockoutNotification } from '../../../utils/emailNotifications'
import FormInput from '../../../components/FormInput'
import ErrorMessage from '../../../components/ErrorMessage'
import VerificationStep from '../../../components/VerificationStep'
import Link from 'next/link'

function SignIn() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSignUp, setIsSignUp] = useState(false)
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [isLogoLoading, setIsLogoLoading] = useState(true)
  const [remainingAttempts, setRemainingAttempts] = useState(3)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [emailVerificationCode, setEmailVerificationCode] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isPhoneStep, setIsPhoneStep] = useState(false)
  const [isPhoneVerificationStep, setIsPhoneVerificationStep] = useState(false)
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('')
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)

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
        if (event === 'SIGNED_OUT') {
          router.push('/auth/signin?error=Session expired. Please sign in again.')
        }
        if (session) {
          const user = session.user
          const fullName = user.user_metadata.full_name || user.user_metadata.name

          if (user && fullName) {
            await supabase.from('profiles').upsert({
              id: user.id,
              full_name: fullName,
              email: user.email,
              last_login: new Date().toISOString()
            })
          }
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

  const handleVerification = async (type, value, code) => {
    setError(null)
    if (!code) {
      setError(`Please enter the verification code sent to your ${type}.`)
      return
    }
    try {
      const { error } = await supabase.auth.verifyOtp({
        [type]: value,
        token: code,
        type: type === 'email' ? 'email' : 'sms',
      })
      if (error) throw error
      if (type === 'phone') {
        setIsPhoneVerified(true)
      } else {
        setIsEmailVerified(true)
        resetLoginAttempts()
        router.push('/account')
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const handleResendVerification = async (type, value) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        [type]: value,
        options: {
          data: {
            type: `${type}_verification`
          }
        }
      })
      
      if (error) throw error
      
      setError(`Verification code resent successfully.`)
    } catch (error) {
      setError(error.message)
    }
  }

  const handleSubmit = async () => {
    setError(null)

    if (isSignUp) {
      if (!displayName || !email || !password || !confirmPassword) {
        setError('Please fill in all fields.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (isAccountLocked().locked) {
        setError('Account is temporarily locked due to too many failed attempts.')
        return
      }
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName
            }
          }
        })
        if (error) throw error
        resetLoginAttempts()
        setEmailVerificationSent(true)
      } catch (error) {
        setError(error.message)
      }
    } else {
      if (!email || !password) {
        setError('Please enter your email and password.')
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
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
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

  if (isPhoneStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 uppercase text-center">Add Your Phone Number</h2>
          <ErrorMessage message={error} />
          <PhoneInput
            international
            defaultCountry="US"
            value={phone}
            onChange={setPhone}
            placeholder="Enter phone number"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
          />
          <button
            onClick={() => setIsPhoneVerificationStep(true)}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm"
          >
            Send Verification Code
          </button>
        </div>
      </div>
    )
  }

  if (isPhoneVerificationStep) {
    return (
      <VerificationStep
        title="Verify Your Phone Number"
        value={phoneVerificationCode}
        onChange={(e) => setPhoneVerificationCode(e.target.value)}
        onVerify={() => handleVerification('phone', phone, phoneVerificationCode)}
        onResend={() => handleResendVerification('phone', phone)}
        error={error}
      />
    )
  }

  if (isPhoneVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
          <h2 className="text-xl font-bold text-green-700 uppercase">Phone Verified!</h2>
          <p className="text-gray-700">Your phone number has been verified. Please check your email for the verification code to complete your registration.</p>
          <button
            onClick={() => setEmailVerificationSent(true)}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm mt-4"
          >
            Continue to Email Verification
          </button>
        </div>
      </div>
    )
  }

  if (emailVerificationSent) {
    return (
      <VerificationStep
        title="Verify Your Email"
        value={emailVerificationCode}
        onChange={(e) => setEmailVerificationCode(e.target.value)}
        onVerify={() => handleVerification('email', email, emailVerificationCode)}
        onResend={() => handleResendVerification('email', email)}
        error={error}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
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

        <div className="w-full md:w-1/2 p-6 md:p-12 space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-800 uppercase">
              {isSignUp ? 'Create an Account' : 'Sign In'}
            </h2>
          </div>

          <ErrorMessage message={error} />

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition duration-200 font-medium text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
            
            <div className="flex items-center justify-center">
              <span className="text-gray-500">Or</span>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">continue with email</span>
              </div>
            </div>

            {isSignUp && (
              <FormInput
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Full Name"
              />
            )}
            <FormInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
            />
            <FormInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            {isSignUp && password && (
              <div className="mt-2">
                <PasswordStrengthIndicator password={password} />
              </div>
            )}
            {isSignUp && (
              <FormInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
              />
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

            <div className="text-center space-y-2">
              {!isSignUp && (
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-gray-600 hover:text-black transition duration-200 block"
                >
                  Forgot your password?
                </Link>
              )}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-gray-600 hover:text-black transition duration-200"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn