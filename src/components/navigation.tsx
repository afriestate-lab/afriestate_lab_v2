'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/lib/languageContext'
import { getCurrentUserRole, type UserRole } from '@/lib/roleGuard'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Home,
  LayoutDashboard,
  Plus,
  MessageSquare,
  User,
  Menu,
  LogOut,
  Settings,
  Moon,
  Sun,
  Languages,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const navigationItems = {
  guest: [
    { name: 'home', href: '/', icon: Home },
  ],
  tenant: [
    { name: 'home', href: '/', icon: Home },
    { name: 'dashboard', href: '/tenant', icon: LayoutDashboard },
    { name: 'messages', href: '/tenant/messages', icon: MessageSquare },
  ],
  landlord: [
    { name: 'home', href: '/', icon: Home },
    { name: 'dashboard', href: '/landlord', icon: LayoutDashboard },
    { name: 'properties', href: '/properties', icon: Home },
    { name: 'tenants', href: '/tenants', icon: User },
    { name: 'payments', href: '/payments', icon: LayoutDashboard },
    { name: 'reports', href: '/reports', icon: LayoutDashboard },
  ],
  manager: [
    { name: 'home', href: '/', icon: Home },
    { name: 'dashboard', href: '/landlord', icon: LayoutDashboard },
    { name: 'properties', href: '/properties', icon: Home },
    { name: 'tenants', href: '/tenants', icon: User },
    { name: 'payments', href: '/payments', icon: LayoutDashboard },
  ],
  admin: [
    { name: 'home', href: '/', icon: Home },
    { name: 'dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'properties', href: '/admin/properties', icon: Home },
    { name: 'tenants', href: '/admin/tenants', icon: User },
    { name: 'payments', href: '/admin/payments', icon: LayoutDashboard },
    { name: 'users', href: '/admin/users', icon: User },
    { name: 'reports', href: '/admin/reports', icon: LayoutDashboard },
  ],
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t, currentLanguage, changeLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [userRole, setUserRole] = useState<UserRole>('guest')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user) {
      getCurrentUserRole().then(setUserRole)
    } else {
      setUserRole('guest')
    }
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const items = navigationItems[userRole] || navigationItems.guest

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Afri Estate</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {currentLanguage === 'rw' ? '🇷🇼 RW' : '🇺🇸 EN'}
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(item.name as any)}</span>
            </Link>
          )
        })}
      </nav>

      {user && (
        <>
          <Separator />
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => changeLanguage(currentLanguage === 'rw' ? 'en' : 'rw')}
                  className="flex items-center gap-2"
                >
                  <Languages className="h-4 w-4" />
                  {currentLanguage === 'rw' ? 'Switch to English' : 'Hindura mu Kinyarwanda'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-2"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  )

  if (authLoading || !mounted) {
    return null
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:bg-background">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b bg-background">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-semibold">Afri Estate</h1>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    </>
  )
}

