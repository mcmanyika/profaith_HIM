import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  HomeIcon, 
  UserIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
  BriefcaseIcon,
  VideoCameraIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

const baseNavigation = [
  { name: 'Dashboard', href: '/account', icon: HomeIcon },
  { name: 'Payments', href: '/payments', icon: BriefcaseIcon },
  { name: 'My Profile', href: '/profile', icon: UserIcon },
  { name: 'Documents', href: '/documents', icon: DocumentTextIcon },
  { name: 'Latest Updates', href: '/youtube', icon: VideoCameraIcon },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const [isNavigating, setIsNavigating] = useState(false)
  const [userLevel, setUserLevel] = useState(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/signin')
      } else {
        // Fetch user level when session exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_level')
          .eq('id', session.user.id)
          .single()
        
        setUserLevel(profile?.user_level || 1)
      }
    }
    checkSession()
  }, [router, supabase])

  const handleNavigation = async (href) => {
    setIsNavigating(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push(href)
    } else {
      router.push('/auth/signin')
    }
    setIsNavigating(false)
  }

  // Add Members link only for level 5 users
  const navigation = [
    ...baseNavigation,
    ...(userLevel === 5 ? [{ name: 'Members', href: '/members', icon: UsersIcon }] : []),
  ]

  return (
    <div className="flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center justify-center h-8 mb-6">
        <h1 className="text-gray-700 text-xl font-bold">
        <div className="md:group-hover:hidden">KM</div>
          <div className="hidden md:group-hover:inline uppercase">Kumusha</div>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavigation(item.href)}
            disabled={isNavigating}
            className={`group flex items-center w-full px-1.5 py-1.5 text-xs font-medium rounded-md ${
              pathname === item.href
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <item.icon className={`h-6 w-6 ${
             pathname === item.href 
                  ? 'text-white' 
                  : 'text-gray-400 group-hover:text-gray-300'
            }`} />
            <span className="hidden md:group-hover:inline ml-2.5">
              {item.name}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
} 