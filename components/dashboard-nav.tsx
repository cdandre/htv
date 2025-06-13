'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { FileText, Upload, BarChart3, LogOut, User, Home, BookOpen, Settings, Bell, Search, Menu, ChevronDown, Briefcase, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
    { name: 'Upload', href: '/dashboard/upload', icon: Upload },
    { name: 'Memos', href: '/dashboard/memos', icon: FileText },
    { name: 'Knowledge', href: '/dashboard/knowledge', icon: BookOpen },
  ]

  return (
    <nav 
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgba(229, 231, 235, 1)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-3 group">
                <div className="relative">
                  <div 
                    className="absolute inset-0 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'
                    }}
                  />
                  <div 
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'
                    }}
                  >
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <span 
                    className="text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(90deg, #9333ea 0%, #ec4899 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    HTV
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block -mt-1">
                    Venture Capital OS
                  </span>
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group"
                    style={{
                      backgroundColor: isActive ? 'rgba(237, 233, 254, 1)' : 'transparent',
                      color: isActive ? '#6d28d9' : '#6b7280'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 1)'
                        e.currentTarget.style.color = '#374151'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#6b7280'
                      }
                    }}
                  >
                    <Icon className={`w-4 h-4 mr-2 inline-block ${isActive ? 'text-purple-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <button 
              className="hidden md:flex p-2.5 text-gray-400 rounded-lg transition-all duration-200"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 1)'
                e.currentTarget.style.color = '#4b5563'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#9ca3af'
              }}
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Notifications */}
            <button 
              className="relative p-2.5 text-gray-400 rounded-lg transition-all duration-200"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 1)'
                e.currentTarget.style.color = '#4b5563'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#9ca3af'
              }}
            >
              <Bell className="w-5 h-5" />
              <span 
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: 'linear-gradient(90deg, #ef4444 0%, #ec4899 100%)'
                }}
              />
            </button>
            
            {/* User Menu */}
            <div className="hidden md:block relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <div className="relative">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                    }}
                  >
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div 
                    className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: '#22c55e',
                      borderColor: 'white'
                    }}
                  />
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Analyst'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
              </button>
              
              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50"
                  style={{
                    backgroundColor: 'white',
                    borderColor: 'rgba(229, 231, 235, 1)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'slide-up 0.2s ease-out'
                  }}
                >
                  <div 
                    className="p-4 border-b"
                    style={{
                      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
                      borderColor: 'rgba(229, 231, 235, 1)'
                    }}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm transition-colors"
                      style={{ color: '#374151' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <hr className="my-2" style={{ borderColor: 'rgba(229, 231, 235, 1)' }} />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2.5 text-sm transition-colors"
                      style={{ color: '#dc2626' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(254, 226, 226, 1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
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
              className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
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
                  className={`${isActive ? 'nav-item-active' : 'nav-item'} block`}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
            <hr className="my-3 border-gray-100 dark:border-gray-800" />
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="nav-item block"
            >
              <div className="flex items-center">
                <Settings className="w-5 h-5 mr-3" />
                Settings
              </div>
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                handleSignOut()
              }}
              className="nav-item block w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <div className="flex items-center">
                <LogOut className="w-5 h-5 mr-3" />
                Sign out
              </div>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}