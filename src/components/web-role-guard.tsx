'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import {
  getCurrentUserRole,
  hasRoleAccess,
  redirectToRoleDashboard,
  UserRole
} from '@/lib/roleGuard'

type GuardState = 'checking' | 'allowed' | 'redirecting'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  screenName: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function WebRoleGuard({
  allowedRoles,
  screenName,
  children,
  fallback
}: RoleGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()

  const [state, setState] = useState<GuardState>('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const redirectToLogin = useMemo(() => {
    const redirectUrl = pathname || '/'
    return `/auth/sign-in?redirect=${encodeURIComponent(redirectUrl)}`
  }, [pathname])

  useEffect(() => {
    let isMounted = true

    const validateAccess = async () => {
      if (authLoading) return

      if (!user) {
        setState('redirecting')
        router.replace(redirectToLogin)
        return
      }

      try {
        const role = await getCurrentUserRole()

        if (!isMounted) return

        const roleAllowed = allowedRoles.includes(role)
        const screenAllowed = hasRoleAccess(role, screenName)

        if (!roleAllowed || !screenAllowed) {
          const redirectPath = redirectToRoleDashboard(role)
          setState('redirecting')

          if (redirectPath) {
            router.replace(redirectPath)
          } else {
            setErrorMessage('You do not have permission to view this page.')
            router.replace('/')
          }
          return
        }

        setState('allowed')
      } catch (error) {
        console.error('[RoleGuard] Error validating access', error)
        if (!isMounted) return
        setErrorMessage('Unable to verify your access permissions. Please try again.')
        setState('redirecting')
        router.replace(redirectToLogin)
      }
    }

    void validateAccess()

    return () => {
      isMounted = false
    }
  }, [allowedRoles, authLoading, redirectToLogin, router, screenName, user])

  if (state === 'allowed') {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">
        {errorMessage ?? 'Checking your access permissions...'}
      </p>
    </div>
  )
}

