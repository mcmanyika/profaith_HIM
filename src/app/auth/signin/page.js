'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'

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

    checkUser()
    getLogoUrl()
    return () => subscription.unsubscribe()
  }, [router, supabase])

  const handleSubmit = async () => {
    setError(null)

    if (!email || !password || (isSignUp && !fullName)) {
      setError('Please fill in all required fields.')
      return
    }

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) setError(error.message)
      else {
        setShowVerifyEmailMessage(true)
        setEmail('')
        setPassword('')
        setFullName('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
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
                  src='https://sdlrxbcshhjhuaqoidzh.supabase.co/storage/v1/object/sign/images/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5X2ZiMTA0MWNmLWRlYmUtNGZlZC04YWQ3LWFhMTk2ZDJiN2Q0YSJ9.eyJ1cmwiOiJpbWFnZXMvbG9nby5wbmciLCJpYXQiOjE3NDgyOTU5NDIsImV4cCI6MTc3OTgzMTk0Mn0.PrAZirdh2PHAE1kRugs0qaE3Kr4EepikopYGp6odjmc'
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
            <h2 className="text-3xl font-bold text-gray-800">
              {isSignUp ? 'Create an Account' : 'Sign In'}
            </h2>
          </div>

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

          <div className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
              />
            </div>
          </div>

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
        </div>
      </div>
    </div>
  )
}
export default SignIn;