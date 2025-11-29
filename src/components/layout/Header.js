'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '../../lib/supabase/client'
import ThemeToggle from '../ThemeToggle'
import { 
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

function Header() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setUser(null);
          return;
        }
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error.message);
          setUser(null);
          return;
        }
        setUser(user);
      } catch (err) {
        console.error('Unexpected error getting user:', err)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user)
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('[data-dropdown]')
      const button = document.querySelector('[data-dropdown-button]')
      if (
        isDropdownOpen &&
        dropdown &&
        button &&
        !dropdown.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isDropdownOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-2">
      <div className="flex items-center justify-between pl-2 pr-4">
        <h1 className="text-xs md:text-base pl-2 font-bold text-gray-900 dark:text-white">
          Hello <label className="font-thin">,{user?.user_metadata?.full_name}</label> 
        </h1>
        
        <div className="relative flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          <button
            data-dropdown-button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-1.5"
          >
            <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                {user?.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : '?'}
              </span>
            </div>
          </button>
          <div className="mx-1.5 text-gray-300 dark:text-gray-700 self-center">|</div>
          <button
            className="inline-flex px-1 text-red-600 dark:text-red-400 rounded-lg transition-colors items-center justify-center md:justify-start hover:text-red-700 dark:hover:text-red-300"
            onClick={handleSignOut}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <span className="pl-1.5 group-hover:inline text-[12px] text-gray-700 dark:text-gray-300">Logout</span>
          </button>

          {isDropdownOpen && (
            <div
              data-dropdown
              className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700"
            >
              <button
                className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Link href="/profile">My Profile</Link>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header