'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { sessionManager } from '../../utils/sessionManager'
import Admin from './Admin'

export default function AuthLayout({ children }) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/signin')
        return
      }

      // Initialize session management
      sessionManager.initialize()

      // Update user's last activity
      await supabase
        .from('profiles')
        .update({
          last_activity: new Date().toISOString(),
          session_id: session.id
        })
        .eq('id', session.user.id)
    }

    checkSession()

    // Cleanup session management on unmount
    return () => {
      sessionManager.cleanup()
    }
  }, [router, supabase])

  return (
        <Admin>
            {children}
        </Admin>
  )
} 