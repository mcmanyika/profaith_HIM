'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { sessionManager } from '../../utils/sessionManager'
import Admin from './Admin'

export default function AuthLayout({ children }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error fetching session:', error)
        }
        if (!session) {
          router.push('/auth/signin')
          return
        }

        console.log('Session data:', {
          userId: session.user.id,
          userEmail: session.user.email,
          sessionId: session.id
        });

        // Check if profile exists first
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error checking profile:', {
            error: profileError,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          });
          return;
        }

        if (!existingProfile) {
          console.error('No profile found for user:', session.user.id);
          return;
        }

        console.log('Found existing profile:', existingProfile);

        // Initialize session management
        try {
          sessionManager.initialize()
        } catch (err) {
          console.error('Error initializing sessionManager:', err)
        }
      } catch (err) {
        console.error('Unexpected error in checkSession:', err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Cleanup session management on unmount
    return () => {
      try {
        sessionManager.cleanup()
      } catch (err) {
        console.error('Error cleaning up sessionManager:', err)
      }
    }
  }, [router, supabase])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  }

  return (
    <Admin>
      {children}
    </Admin>
  )
} 