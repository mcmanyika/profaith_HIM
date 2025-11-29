import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  HomeIcon, 
  UserIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
  BriefcaseIcon,
  VideoCameraIcon,
  UsersIcon,
  DocumentPlusIcon,
  UserGroupIcon,
  MegaphoneIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

// Icon mapping function
const getIconComponent = (iconName) => {
  const iconMap = {
    'HomeIcon': HomeIcon,
    'UserIcon': UserIcon,
    'DocumentTextIcon': DocumentTextIcon,
    'ArrowLeftOnRectangleIcon': ArrowLeftOnRectangleIcon,
    'BriefcaseIcon': BriefcaseIcon,
    'VideoCameraIcon': VideoCameraIcon,
    'UsersIcon': UsersIcon,
    'DocumentPlusIcon': DocumentPlusIcon,
    'UserGroupIcon': UserGroupIcon,
    'MegaphoneIcon': MegaphoneIcon,
    'BuildingLibraryIcon': BuildingLibraryIcon,
  }
  return iconMap[iconName] || HomeIcon
}

// Default navigation fallback
const defaultNavigation = [
  { name: 'Dashboard', href: '/account', icon_name: 'HomeIcon', display_order: 1, min_user_level: 1 },
  { name: 'Members', href: '/members', icon_name: 'UsersIcon', display_order: 2, min_user_level: 1 },
  { name: 'Ministries', href: '/ministries', icon_name: 'BuildingLibraryIcon', display_order: 3, min_user_level: 1 },
  { name: 'Small Groups', href: '/groups', icon_name: 'UserGroupIcon', display_order: 4, min_user_level: 1 },
  { name: 'Giving', href: '/payments', icon_name: 'BriefcaseIcon', display_order: 5, min_user_level: 1 },
  { name: 'Announcements', href: '/announcements', icon_name: 'MegaphoneIcon', display_order: 6, min_user_level: 1 },
  { name: 'My Profile', href: '/profile', icon_name: 'UserIcon', display_order: 7, min_user_level: 1 },
  { name: 'Documents', href: '/documents', icon_name: 'DocumentTextIcon', display_order: 8, min_user_level: 1 },
  { name: 'Media', href: '/youtube', icon_name: 'VideoCameraIcon', display_order: 9, min_user_level: 1 },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const [isNavigating, setIsNavigating] = useState(false)
  const [userLevel, setUserLevel] = useState(null)
  const [navigationLinks, setNavigationLinks] = useState([])

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
        
        const level = profile?.user_level || 1
        setUserLevel(level)

        // Fetch navigation links from Supabase
        try {
          const { data, error } = await supabase
            .from('navigation_links')
            .select('*')
            .eq('is_active', true)
            .lte('min_user_level', level)
            .order('display_order', { ascending: true })
          
          if (error) throw error
          
          if (data && data.length > 0) {
            setNavigationLinks(data)
          } else {
            // Use fallback if no data found
            setNavigationLinks(defaultNavigation.filter(link => link.min_user_level <= level))
          }
        } catch (error) {
          console.error('Error fetching navigation links:', error)
          // Use fallback on error
          setNavigationLinks(defaultNavigation.filter(link => link.min_user_level <= level))
        }
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

  // Map navigation links to include icon components
  const navigation = navigationLinks.map(link => ({
    ...link,
    icon: getIconComponent(link.icon_name)
  }))

  return (
    <div className="flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center justify-center h-8 mb-6">
        <h1 className="text-gray-900 dark:text-white text-xl font-bold">
        <div className="md:group-hover:hidden">PF</div>
          <div className="hidden md:group-hover:inline uppercase">Profaith</div>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navigation.map((item) => (
          <button
            key={item.id || item.name}
            onClick={() => handleNavigation(item.href)}
            disabled={isNavigating}
            className={`group flex items-center w-full px-1.5 py-1.5 text-xs font-medium rounded-md ${
              pathname === item.href
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <item.icon className={`h-6 w-6 ${
             pathname === item.href 
                  ? 'text-white' 
                  : 'text-gray-500 group-hover:text-gray-300'
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