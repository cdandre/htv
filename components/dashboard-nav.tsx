'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { FileText, BarChart3, LogOut, User, Users, Home, BookOpen, Settings, Bell, Search, Menu, ChevronDown, Briefcase } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import HTVLogo from '@/components/htv-logo'
import { NotificationBell } from '@/components/notification-bell'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface DashboardNavProps {
  user: UserProfile | null
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Deals', href: '/dashboard/deals', icon: Briefcase },
    { name: 'Memos', href: '/dashboard/memos', icon: FileText },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Research', href: '/dashboard/research', icon: BookOpen },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-4">
                <HTVLogo className="h-10 w-auto" />
                <div className="hidden md:block border-l border-gray-300 dark:border-gray-700 pl-4">
                  <span className="text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-400">
                    Building the Future of Home
                  </span>
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-12 md:flex md:space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive 
                        ? 'text-black dark:text-white font-semibold' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="hidden md:block p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            
            {/* Notifications */}
            <NotificationBell />
            
            {/* User Menu */}
            <div className="hidden md:block relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors rounded-sm"
              >
                <div className="w-8 h-8 bg-black dark:bg-white rounded-sm flex items-center justify-center">
                  <User className="w-4 h-4 text-white dark:text-black" />
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-medium text-black dark:text-white">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Analyst'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
              </button>
              
              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-sm shadow-lg overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium text-black dark:text-white">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        href="/dashboard/admin/users"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <Users className="w-4 h-4 mr-3" />
                        User Management
                      </Link>
                    )}
                    <hr className="my-2 border-gray-200 dark:border-gray-800" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <div className="px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                    isActive 
                      ? 'text-black dark:text-white bg-gray-50 dark:bg-gray-900' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
            <hr className="my-3 border-gray-200 dark:border-gray-800" />
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-sm transition-colors"
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Link>
            {user?.role === 'admin' && (
              <Link
                href="/dashboard/admin/users"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-sm transition-colors"
              >
                <Users className="w-5 h-5 mr-3" />
                User Management
              </Link>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                handleSignOut()
              }}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}